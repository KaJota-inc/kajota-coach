# KaJota Concierge Agent — Devpost submission

**Track:** Google Cloud Rapid Agent Hackathon 2026
**Deadline:** Jun 11, 2026, 2:00 PM PT
**Branch:** [`hackathon/rapid-agent`](https://github.com/KaJota-inc/kajota-coach/tree/hackathon/rapid-agent)

Paste the bracketed fields into Devpost's submission form. The structured sections (`## Inspiration`, etc.) map 1-to-1 to Devpost's prompts.

---

## Tagline (max 200 chars)

A shopping concierge agent that composes the official MongoDB MCP server with a public-web Fetch MCP, reasons with Gemini on Google's Agent Development Kit, and acts before you ask — proactively surfacing what's worth your attention the moment you open the app.

## Inspiration

KaJota is a real Expo / React Native commerce app. We watched our users struggle with the same two failures over and over: (1) asking _human_ questions — *"do you have the Yeezy 350 v2 size 11 in store?"* — that the catalogue search bar can't answer, and (2) opening the app and not knowing where to start. The Rapid Agent track gave us a forcing function: stop bolting GPT calls onto features and build an actual agent that owns the merchant's data path end-to-end and acts proactively instead of waiting to be prompted.

## What it does

A conversational concierge that lives inside the existing KaJota mobile app:

- **Reads the live merchant catalogue, orders, and wishlist from MongoDB Atlas via the official MongoDB MCP server.** No RAG indexer to keep in sync — the agent issues `find` / `aggregate` / `insert-one` calls in real time. Catalogue updates land immediately.
- **Reaches the public web via a second MCP server (`mcp-server-fetch`)** so it can quote competitor prices and pull live product reviews when the conversation calls for it. Two MCP servers composed under one ADK agent — adding a third would be one config block, not an integration project.
- **Reasons with Gemini on Google Cloud's Agent Development Kit (ADK).** The agent picks which MCP tools to call, in what order, and synthesises a plain-text reply plus a trailing structured `[CARDS]…[/CARDS]` JSON block that the mobile UI parses into product cards inline.
- **Acts before you ask.** The moment the user opens the Concierge screen, the mobile app calls a `POST /proactive` endpoint that fires a one-shot agent turn — *"Greet the user and surface what's most worth their attention right now."* The agent runs its own multi-tool reasoning (recent purchases, wishlist deltas, possible price drops) and renders a personalised greeting + card carousel before the user types a single character.

## How we built it

### Stack — every track requirement met

| Requirement | Implementation |
|---|---|
| **Gemini 3** | ✅ Built against `gemini-3.1-pro-preview` initially, pivoted to `gemini-2.5-pro` due to allowlist gating (see "Challenges"). Model is a one-line override — flip back via `GEMINI_MODEL` env var once preview access lands. |
| **Google Cloud ADK** | ✅ `google-adk` Python package. `Agent(model=GEMINI_MODEL, tools=[mongodb_mcp, fetch_mcp], instruction=...)`. Production Vertex AI mode forced via `GOOGLE_GENAI_USE_VERTEXAI=true`. |
| **Model Context Protocol** | ✅ Two MCP servers composed via `McpToolset(StdioConnectionParams(...))`. Both auto-discover their tool surfaces at agent startup; the agent decides which to call per turn. |
| **Partner integration via MCP** | ✅ **MongoDB Atlas** through the official `mongodb-mcp-server@latest` (Node, launched via `npx`) as the merchant-data partner. ✅ **Fetch MCP** (`mcp-server-fetch`, Python module, launched via `python -m mcp_server_fetch`) as the public-web tool surface. |

### Architecture

```
┌────────────────────────────────────────────────────────────┐
│  Mobile (KaJota Expo / React Native)                       │
│   • Reactive chat:  POST /chat                             │
│   • Proactive turn: POST /proactive  (called on mount)     │
└───────────────────────────┬────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼────────────────────────────────┐
│  Render Web Service (Docker, kajota-coach repo)            │
│    FastAPI: kajota_concierge.server                        │
│      ↓                                                     │
│    ADK Runner ──▶ root_agent (Gemini 2.5 Pro on Vertex AI) │
│                     │                                      │
│                     ├─tools─▶ McpToolset (stdio, Node)     │
│                     │             └─▶ mongodb-mcp-server   │
│                     │                       │              │
│                     │                       ▼              │
│                     │              MongoDB Atlas           │
│                     │                                      │
│                     └─tools─▶ McpToolset (stdio, Python)   │
│                                   └─▶ mcp-server-fetch     │
│                                             │              │
│                                             ▼              │
│                                        Public web          │
└────────────────────────────────────────────────────────────┘
```

### Two endpoints, one agent

- `POST /chat` — reactive. Standard turn: user message in, agent reply + tool trace out.
- `POST /proactive` — agentic. Mobile calls this on `ConciergeScreen` mount. Backend fires a one-shot agent turn with a fixed greeter prompt that instructs the agent to choose its own MongoDB queries based on the user's state and produce a personalised opening message. No user input required.

The mobile UI renders proactive output identically to a normal agent reply: text bubble + `[CARDS]` product cards + "Used N MongoDB MCP tools" expander. The user sees concrete recommendations before they've spoken.

### Repos + commits

- **Agent + mobile** (this repo): https://github.com/KaJota-inc/kajota-coach/tree/hackathon/rapid-agent — `agent/` (Python ADK + two MCP toolsets), `src/` (Expo)

## Challenges we ran into

**Gemini 3 access turned out to be allowlist-gated.** The track prompt named Gemini 3 Pro. We built against it. Three concrete blockers:

1. `gemini-3-pro` (the original preview) was retired on Mar 26, 2026 — a 404 from Vertex AI.
2. The current spelling `gemini-3.1-pro-preview` requires Model Garden allowlist access we hadn't been granted for the hackathon project.
3. The Gemini 3 preview models only publish to the `global` endpoint — not the regional ones like `us-central1` — so even with the right model name, you have to set `GOOGLE_CLOUD_LOCATION=global` for ADC to find them. (We added a defensive default for that.)

**Resolution:** filed the allowlist request on the Google AI Developers Forum on Jun 10, 2026, pivoted the submission to `gemini-2.5-pro` (GA, no allowlist) so judges can actually run the demo, and pinned the env var so the deploy flips back to Gemini 3 the moment access lands. Both models drive the same agent code path — only the `GEMINI_MODEL` env var changes.

**Forcing ADK into Vertex AI mode without a `GEMINI_API_KEY`.** ADK probes for `GEMINI_API_KEY` at module load and raises `ValueError` if it's not set, _even when_ you're trying to use Vertex AI service-account auth. The fix is three env vars set _before_ `import google.adk`:

```python
os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "true")
os.environ.setdefault("GOOGLE_CLOUD_PROJECT", os.environ["GCP_PROJECT_ID"])
os.environ.setdefault("GOOGLE_CLOUD_LOCATION", os.environ.get("GCP_REGION", "global"))
```

We persist these in both `.env.rapid-agent` (local dev) and the Render env group (production).

**Forcing the model to plain text + structured tail.** Out of the box Gemini renders wishlists with `**bold**` and `*` bullets — fine in a Markdown viewer, ugly inside a React Native chat bubble. We pinned the system prompt to "plain text only, no Markdown" and required a trailing `[CARDS]…[/CARDS]` JSON block on any product / order / wishlist turn. The mobile UI strips the block off the display text, parses the JSON, and renders product cards from the same payload. One agent reply drives both surfaces.

**Render Secret Files vs. inline JSON env var.** Render won't accept JSON in a normal env var. The clean path is the Secret Files feature mounting `gcp-service-account.json` at `/etc/secrets/`. We also added a fallback: if `GCP_SERVICE_ACCOUNT_JSON` is set to the inline JSON, the agent writes it to `tempfile.gettempdir()` at startup and re-points `GOOGLE_APPLICATION_CREDENTIALS`. Either path works.

## Accomplishments we're proud of

- **Two MCP servers, one ADK agent.** Most "+ MCP" submissions register a single MCP server and call it a day. We compose the MongoDB MCP (Node, `npx`) with the Fetch MCP (Python module) under the same ADK runner. The agent reasons across both surfaces in a single turn — MCP-as-architecture, not MCP-as-checkbox.
- **Real merchant data, no RAG indexer.** Every reply is grounded in a live MongoDB query through the official MongoDB MCP server. Nothing pre-baked. Demo this by editing a product price in Atlas and asking the agent for it — the new price is in the reply within one round-trip.
- **Agentic on screen mount.** The Concierge greets you with a personalised observation before you've spoken — recent purchase recap, wishlist items near target, possible price drops. This isn't a hardcoded greeting; it's a real `/proactive` agent turn that picks its own tool sequence and emits the same `[CARDS]` payload as any reactive turn.
- **Structured + free-form in one reply.** Every product / order / wishlist turn returns natural-language prose AND a trailing `[CARDS]` JSON block the mobile UI parses into branded product cards. Judges see plain-text in `curl`; users see a polished shopping rail. Same response, different parsers.
- **Production-shaped deploy from day one.** Docker on Render, healthcheck, secret-file mount, env group, branch-pinned, two MCP runtime processes (Node for MongoDB, Python for Fetch) spawned by the agent at boot. The service boots in <30s from a fresh deploy.

## What we learned

- **MCP changes how you architect partner integrations.** Adding the second MCP (Fetch) to the agent was one `McpToolset` registration and one prompt paragraph telling the agent when to reach for it — no SDK glue, no HTTP client, no retry policy in the application code. The MCP server owns all of that. The third partner would be the same shape.
- **ADK's "force Vertex AI mode" path is undocumented.** The three env-var dance above is the only reliable way to use service-account auth without holding a Gemini API key. Pinning it in code (as a `setdefault`) saved us hours when the deploy env didn't match the local one.
- **Pin the output format to plain text + a structured tail.** Letting the model freestyle Markdown breaks the mobile UI; letting it emit pure JSON loses the warmth of a chat reply. The plain-text + `[CARDS]` block hybrid gives us both — the model writes naturally and the UI gets clean structured data, with one set of guardrails in the system prompt.
- **Preview model access is a real schedule risk.** The 24-hour gap between filing an allowlist request and being granted access is enough to blow a hackathon submission. Build against GA, override to preview.

## What's next

- **Flip back to Gemini 3 the moment allowlist clears.** Single env var change, no code edits.
- **Add a third MCP partner.** Elastic for full-text catalogue search would slot in next — the catalogue queries are MongoDB-native today, but free-text search would benefit. One more `McpToolset` registration plus a prompt sentence.
- **Push notifications from the proactive turn.** Today `/proactive` fires on screen mount. The next step is firing it from a Render cron, with the agent's reply routed through Expo Push so a wishlist item hitting its target price wakes the user before they re-open the app.
- **Reputation feedback loop.** Each successful order writes a signed feedback entry the agent reads back the next session for personalisation. (Adjacent: this maps cleanly to ERC-8004 on chain for our Mantle Turing Test submission on the same repo's sister branch.)

## Try it yourself

```sh
# 1. Clone + check out the branch
git clone https://github.com/KaJota-inc/kajota-coach
cd kajota-coach
git checkout hackathon/rapid-agent

# 2. Agent (Python ADK + two MCP toolsets)
cd agent
cp ../.env.rapid-agent.example ../.env.rapid-agent
# Fill: GCP_PROJECT_ID, MONGODB_URI, MONGODB_DATABASE
# Drop secrets/rapid-agent/gcp-service-account.json (per HACKS.md gcloud commands)
pip install -e .
pip install mcp-server-fetch   # second MCP partner
python -m kajota_concierge.server
# → http://localhost:8080/chat  (reactive)
# → http://localhost:8080/proactive  (agentic, called on screen mount)

# 3. Mobile (Expo)
cd ..
npm install
npx expo start
# point CONCIERGE_AGENT_BASE at your agent URL
```

## Built with

`gemini-2.5-pro` · `google-adk` · `mcp` · `mongodb-mcp-server` · `mongodb-atlas` · `mcp-server-fetch` · `fastapi` · `python 3.11` · `expo` · `react-native` · `typescript` · `vertex-ai` · `render` · `docker`

## Demo video

[FILL — Devpost-standard, ≤3 min recommended. The demo should hit: (1) open the Concierge screen → proactive greeting appears unprompted with a product card carousel, (2) ask "what did I last buy?" → live MongoDB query + product card, (3) edit a product price in Atlas and re-ask → new price reflected in the reply, (4) one prompt that exercises the Fetch MCP — e.g. "look up this product's spec page" — to show multi-MCP composition.]

## Public repo URL

https://github.com/KaJota-inc/kajota-coach/tree/hackathon/rapid-agent
