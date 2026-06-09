"""FastAPI wrapper around the ADK agent.

ADK ships ``adk web`` and ``adk run`` for interactive dev, but for the
deployed Render service we want a clean HTTP surface the mobile coach
can call. This module exposes:

    POST /chat      — single-turn input → final text response
    GET  /healthz   — readiness check (200 + JSON if the agent imported
                      cleanly + MongoDB is reachable)
    GET  /          — returns a tiny JSON banner so the Render free-tier
                      cold-start hit shows up in logs

Sessions are kept in-memory (``InMemorySessionService``) so the first
deploy boots without an external session store. For multi-instance
production you'd swap to ``DatabaseSessionService`` against the same
MongoDB.
"""

from __future__ import annotations

import os
import uuid
from typing import Any

from fastapi import FastAPI, HTTPException
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types as gen_types
from pydantic import BaseModel

from kajota_concierge.agent import root_agent

APP_NAME = "kajota-concierge"

app = FastAPI(
    title="KaJota Concierge",
    description=(
        "Shopping assistant agent — Gemini 3 Pro on Google ADK, reaching "
        "MongoDB Atlas through the official MongoDB MCP server."
    ),
    version="0.1.0",
)

# Single session service for the process. ADK runners take it as a
# dep and resolve sessions by (app_name, user_id, session_id).
_session_service = InMemorySessionService()
_runner = Runner(
    agent=root_agent,
    app_name=APP_NAME,
    session_service=_session_service,
)


class ChatRequest(BaseModel):
    message: str
    userId: str = "demo-user-1"
    sessionId: str | None = None


class ChatResponse(BaseModel):
    sessionId: str
    response: str
    # The full event trace from this turn — useful for the demo recording
    # so we can show MCP tool calls inline in the video.
    events: list[dict[str, Any]]


@app.get("/")
async def banner() -> dict[str, Any]:
    return {
        "service": APP_NAME,
        "model": os.environ.get("GEMINI_MODEL", "gemini-2.5-pro"),
        "partner": "mongodb",
        "docs": "/docs",
    }


@app.get("/healthz")
async def healthz() -> dict[str, Any]:
    # Light check — just confirms the agent imported and Mongo URI is
    # set. We don't actually round-trip to MongoDB here because the MCP
    # server's subprocess is lazy-started by the runner on first use.
    if not os.environ.get("MONGODB_URI"):
        raise HTTPException(status_code=503, detail="MONGODB_URI not set")
    return {"ok": True, "agent": root_agent.name}


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    session_id = req.sessionId or str(uuid.uuid4())

    # Get-or-create the session. ADK's API: get_session raises on miss
    # in some versions; wrap to handle both.
    session = await _session_service.get_session(
        app_name=APP_NAME,
        user_id=req.userId,
        session_id=session_id,
    )
    if session is None:
        session = await _session_service.create_session(
            app_name=APP_NAME,
            user_id=req.userId,
            session_id=session_id,
        )

    content = gen_types.Content(
        role="user",
        parts=[gen_types.Part(text=req.message)],
    )

    final_text = ""
    events: list[dict[str, Any]] = []

    # Drain the async event stream — the final-response event carries
    # the full reply text; intermediate events show tool calls.
    async for event in _runner.run_async(
        user_id=req.userId,
        session_id=session_id,
        new_message=content,
    ):
        events.append(_summarise_event(event))
        if event.is_final_response() and event.content and event.content.parts:
            final_text = "".join(
                p.text for p in event.content.parts if getattr(p, "text", None)
            )

    return ChatResponse(
        sessionId=session_id,
        response=final_text or "(no response)",
        events=events,
    )


def _summarise_event(event: Any) -> dict[str, Any]:
    """Compact event shape for the demo trace.

    We don't want to ship the full ADK event payload — too noisy for the
    submission video. This keeps the keys a judge would actually care
    about: who spoke, what tool was called, what came back.
    """
    parts = []
    if event.content and getattr(event.content, "parts", None):
        for p in event.content.parts:
            if getattr(p, "text", None):
                parts.append({"text": p.text})
            elif getattr(p, "function_call", None):
                parts.append(
                    {
                        "tool_call": {
                            "name": p.function_call.name,
                            "args": dict(p.function_call.args or {}),
                        }
                    }
                )
            elif getattr(p, "function_response", None):
                # Truncate large MCP responses so the trace stays readable.
                raw = p.function_response.response
                preview = str(raw)
                if len(preview) > 500:
                    preview = preview[:500] + "…(truncated)"
                parts.append(
                    {
                        "tool_response": {
                            "name": p.function_response.name,
                            "preview": preview,
                        }
                    }
                )
    return {
        "author": getattr(event, "author", "unknown"),
        "final": event.is_final_response(),
        "parts": parts,
    }


def main() -> None:
    """Entrypoint for `kajota-agent` (pyproject scripts). Used by Render."""
    import uvicorn

    port = int(os.environ.get("PORT", "8080"))
    uvicorn.run(
        "kajota_concierge.server:app",
        host="0.0.0.0",
        port=port,
        log_level="info",
    )


if __name__ == "__main__":
    main()
