"""KaJota Concierge agent definition.

Gemini 3 Pro on Google's Agent Development Kit (ADK), with MongoDB
Atlas reached through the official MongoDB MCP server (which
launches as a subprocess via ``npx`` and speaks the Model Context
Protocol over stdio).

The agent's tools come from the MongoDB MCP server's auto-exposed
toolset (find / aggregate / insert-one / update-one / etc.). The
ADK ``McpToolset`` discovers them at startup.

The instruction below pins behaviour: the agent must query MongoDB
for the data it needs before answering. No fabrication, no guessing.

ADK discovers ``root_agent`` by name. Don't rename without updating
the ``agents.yaml`` (if one exists) or the ``adk run`` invocation.
"""

from __future__ import annotations

import os
from typing import Final

from dotenv import load_dotenv

# Load .env.rapid-agent if present; falls back to the process env.
# Render injects its env group directly; this is for local dev.
# Must happen BEFORE any google.* import — those probe the env at
# module-load to pick between Vertex AI and the public Gemini API.
load_dotenv(".env.rapid-agent")
load_dotenv(".env")

# Force google-genai (and therefore ADK) to use Vertex AI rather than
# the public Gemini API. Without these three the ADK looks for a
# GEMINI_API_KEY and raises ValueError when it doesn't find one.
# We map our shorter GCP_PROJECT_ID / GCP_REGION names onto the
# canonical Google ones so callers only need to set the short ones.
os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "true")
if "GOOGLE_CLOUD_PROJECT" not in os.environ:
    project = os.environ.get("GCP_PROJECT_ID", "")
    if project:
        os.environ["GOOGLE_CLOUD_PROJECT"] = project
if "GOOGLE_CLOUD_LOCATION" not in os.environ:
    os.environ["GOOGLE_CLOUD_LOCATION"] = os.environ.get("GCP_REGION", "us-central1")

# Env-var fallback for the GCP credentials. The clean path is to mount
# the service-account JSON as a file (Render Secret File at
# /etc/secrets/gcp-service-account.json, or local file pointed at by
# GOOGLE_APPLICATION_CREDENTIALS). If that's wedged on the deploy
# platform, set GCP_SERVICE_ACCOUNT_JSON to the raw JSON contents and
# we'll persist it to /tmp at startup and re-point ADC at it. Either
# path works; env var takes priority because it's the explicit override.
_sa_json_inline = os.environ.get("GCP_SERVICE_ACCOUNT_JSON", "").strip()
if _sa_json_inline:
    import tempfile

    _sa_path = os.path.join(tempfile.gettempdir(), "kajota-gcp-sa.json")
    with open(_sa_path, "w", encoding="utf-8") as _f:
        _f.write(_sa_json_inline)
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = _sa_path

from google.adk.agents import Agent  # noqa: E402  imported after env set
from google.adk.tools.mcp_tool import McpToolset, StdioConnectionParams  # noqa: E402
from mcp import StdioServerParameters  # noqa: E402

# ---- Model selection ----------------------------------------------

# The Rapid Agent track prompt requires Gemini 3 Pro by name. Don't
# downgrade to flash without re-reading the rules — flash isn't an
# accepted submission.
GEMINI_MODEL: Final[str] = os.environ.get("GEMINI_MODEL", "gemini-3-pro")

# ---- MongoDB MCP toolset ------------------------------------------

_MONGODB_URI = os.environ.get("MONGODB_URI", "")
if not _MONGODB_URI:
    # Fail loud rather than silently boot an agent with no data layer.
    # The Rapid Agent track requires a partner MCP integration; if Mongo
    # isn't configured, the submission isn't valid.
    raise RuntimeError(
        "MONGODB_URI is not set. Configure it in .env.rapid-agent (local "
        "dev) or the Render env group (deployed). See agent/README.md."
    )

mongodb_mcp = McpToolset(
    connection_params=StdioConnectionParams(
        server_params=StdioServerParameters(
            # Launches the official MongoDB MCP server as a subprocess.
            # `-y` accepts the `npx` package install prompt on first run.
            command="npx",
            args=[
                "-y",
                "mongodb-mcp-server@latest",
                "--connectionString",
                _MONGODB_URI,
            ],
            # The server reads its config from the connection string;
            # keep the env passthrough minimal so it can't pick up
            # unrelated host secrets.
            env={
                "PATH": os.environ.get("PATH", ""),
            },
        ),
        # Generous startup timeout: the first `npx` invocation downloads
        # ~30 MB of the MongoDB driver. Subsequent runs are cached and
        # start in <2s.
        timeout=60,
    ),
)

# ---- Agent definition --------------------------------------------

root_agent = Agent(
    name="kajota_concierge",
    model=GEMINI_MODEL,
    description=(
        "KaJota Concierge — a shopping assistant for the KaJota commerce "
        "platform. Has direct read+write access to the user's purchase "
        "history, wishlist, and the product catalogue via MongoDB Atlas "
        "(reached through the official MongoDB MCP server). Reasons over "
        "concrete database state, never fabricates data."
    ),
    instruction=(
        "You are KaJota Concierge, a shopping assistant for KaJota — a "
        "commerce platform where users shop with stablecoins. Your job "
        "is to help the user find what they're looking for, track their "
        "orders, manage their wishlist, and suggest items they'd plausibly "
        "want based on their purchase history.\n"
        "\n"
        "RULES:\n"
        "1. You have direct MongoDB access via the MCP tools (find, "
        "   aggregate, insert-one, update-one, etc.). USE THEM. Query "
        "   the database for any user-specific question before answering.\n"
        "2. Never fabricate prices, item names, dates, or order ids. If "
        "   the data isn't in MongoDB, say so explicitly.\n"
        "3. When the user asks 'what should I buy next?' or similar, run "
        "   an aggregate over their purchase history (collection: "
        "   `purchases`, indexed by `userId`) to find their preferred "
        "   categories + price range, then `find` matching items in "
        "   `products`.\n"
        "4. When the user asks 'where is my order?', query `purchases` "
        "   by `orderId` and report the `status`, `shippedAt`, and "
        "   `expectedDelivery` fields verbatim.\n"
        "5. When the user wants to add something to their wishlist, "
        "   `insert-one` into the `wishlist` collection with the item id, "
        "   user id, current price, and target price.\n"
        "6. Database name is `kajota`. Collections: `users`, `products`, "
        "   `purchases`, `wishlist`.\n"
        "7. Default user id for the demo is `demo-user-1`. If the caller "
        "   passes a different `userId` in the conversation, use that.\n"
        "8. Keep responses tight — concierge-quality, not chatbot-quality. "
        "   Cite item names and prices verbatim from the DB.\n"
    ),
    tools=[mongodb_mcp],
)
