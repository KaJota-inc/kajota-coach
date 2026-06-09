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
from google.adk.agents import Agent
from google.adk.tools.mcp_tool import McpToolset, StdioConnectionParams
from mcp import StdioServerParameters

# Load .env.rapid-agent if present; falls back to the process env.
# Render injects its env group directly; this is for local dev.
load_dotenv(".env.rapid-agent")
load_dotenv(".env")

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
