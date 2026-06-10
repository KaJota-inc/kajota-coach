# KaJota Concierge Agent — Devpost submission

**Track:** Google Cloud Rapid Agent Hackathon 2026
**Deadline:** Jun 11, 2026, 2:00 PM PT
**Branch:** [`hackathon/rapid-agent`](https://github.com/KaJota-inc/kajota-coach/tree/hackathon/rapid-agent)

Paste the bracketed fields into Devpost's submission form. The structured sections (`## Inspiration`, etc.) map 1-to-1 to Devpost's prompts.

---

## Tagline (max 200 chars)

A shopping concierge agent that queries the merchant's live MongoDB Atlas through the official MongoDB MCP server, reasons with Gemini on the Google Cloud Agent Development Kit, and speaks the user's language — including African ones — over voice.

## Inspiration

KaJota is a real Expo / React Native commerce app. We watched our users struggle with two things over and over: (1) asking _human_ questions — *"do you have the Yeezy 350 v2 size 11 in store?"* — that the catalogue search bar can't answer, and (2) wanting to ask those questions out loud, in a language their phone keyboard can't keep up with. The Rapid Agent track gave us a forcing function: stop bolting GPT calls onto features and build an actual agent that owns the merchant's data path end-to-end.

## What it does

A conversational concierge that lives inside the existing KaJota mobile app:

- **Reads the live merchant catalogue, orders, and reviews from MongoDB Atlas via the official MongoDB MCP server.** No RAG indexer to keep in sync — the agent issues `find` / `aggregate` calls in real time. Catalogue updates land immediately.
- **Reasons with Gemini on Google Cloud's Agent Development Kit (ADK).** The agent picks which MCP tools to call, in what order, and synthesises the user-facing reply.
- **Speaks the user's language over voice — including African ones.** Tier-4 voice surface streams microphone audio up via WebSocket. The backend pipes it through Gemini Live for STT + reasoning, then through YarnGPT for Yoruba / Igbo / Hausa text-to-speech. The mobile app plays the synthesised audio back inline.

## How we built it

### Stack — every track requirement met

| Requirement | Implementation |
|---|---|
| **Gemini 3** | ✅ Built against `gemini-3.1-pro-preview` initially, pivoted to `gemini-2.5-pro` due to allowlist gating (see "Challenges"). Model is a one-line override — flip back via `GEMINI_MODEL` env var once preview access lands. |
| **Google Cloud ADK** | ✅ `google-adk` Python package. `Agent(model=GEMINI_MODEL, tools=mcp_toolset, instruction=...)`. Production Vertex AI mode forced via `GOOGLE_GENAI_USE_VERTEXAI=true`. |
| **Model Context Protocol** | ✅ `McpToolset(StdioConnectionParams(...))` discovers the MongoDB MCP server's tools at agent startup. |
| **Partner integration via MCP** | ✅ **MongoDB Atlas** through the official `mongodb-mcp-server@latest` (Node, launched as a `npx` subprocess from the Python agent). |

### Architecture

```
┌────────────────────────────────────────────────────────────┐
│  Mobile (KaJota Expo / React Native)                       │
│   • Text path:  POST /chat                                 │
│   • Voice path: WSS /ws/ai/coach/agent/voice               │
└───────────────────────────┬────────────────────────────────┘
                            │ HTTPS / WSS
┌───────────────────────────▼────────────────────────────────┐
│  Render Web Service (Docker, kajota-coach repo)            │
│    FastAPI: kajota_concierge.server                        │
│      ↓                                                     │
│    ADK Runner ──▶ root_agent (Gemini 2.5 Pro on Vertex AI) │
│                     │                                      │
│                     └─tools─▶ McpToolset (stdio)           │
│                                       │                    │
│                                       ▼                    │
│                               mongodb-mcp-server (Node)    │
│                                       │                    │
└───────────────────────────────────────┼────────────────────┘
                                        │
                                        ▼
                              MongoDB Atlas (merchant data)
```

The voice path (Tier 4) layers on top:

- Mobile `VoiceMicButton` captures audio → streams PCM frames over WebSocket
- Backend (`kajota-mobile-backend / CoachAgentVoiceController`) routes to a hybrid pipeline:
  - **Gemini Live** for streaming STT + intent → forwards into the ADK agent for reasoning
  - **YarnGPT** for African-language TTS (Yoruba, Igbo, Hausa) for the response
- Synthesised audio streams back as base64-encoded frames; mobile decodes + plays inline

### Repos + commits

- **Agent + mobile** (this repo): https://github.com/KaJota-inc/kajota-coach/tree/hackathon/rapid-agent — `agent/` (Python ADK), `src/` (Expo)
- **Voice backend**: https://github.com/KaJota-inc/kajota-mobile-backend/tree/hackathon/coach-agent-v2 — `CoachAgentVoiceController.java`, `CoachAgentVoiceService.java`

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

**Render Secret Files vs. inline JSON env var.** Render won't accept JSON in a normal env var. The clean path is the Secret Files feature mounting `gcp-service-account.json` at `/etc/secrets/`. We also added a fallback: if `GCP_SERVICE_ACCOUNT_JSON` is set to the inline JSON, the agent writes it to `tempfile.gettempdir()` at startup and re-points `GOOGLE_APPLICATION_CREDENTIALS`. Either path works.

## Accomplishments we're proud of

- **Real merchant data, no RAG indexer.** Every reply is grounded in a live MongoDB query through the official MongoDB MCP server. Nothing pre-baked. Demo this by editing a product price in Atlas and asking the agent for it — the new price is in the reply within one round-trip.
- **Voice in three African languages.** Yoruba / Igbo / Hausa TTS via YarnGPT, streamed over WebSocket, latency <2s end-to-end. (Most voice agent demos quietly support English-only.)
- **Production-shaped deploy from day one.** Docker on Render, healthcheck, secret-file mount, env group, branch-pinned. The agent boots in <30s from a fresh deploy.

## What we learned

- **MCP changes how you architect partner integrations.** With the MongoDB MCP server, we didn't write _any_ MongoDB client code in Python. The agent discovers `find` / `aggregate` / `update-one` etc. at startup and decides when to use them. Adding a second partner (Elastic for keyword search) would be one MCP server config line, not a SDK integration.
- **ADK's "force Vertex AI mode" path is undocumented.** The three env-var dance above is the only reliable way to use service-account auth without holding a Gemini API key. Pinning it in code (as a `setdefault`) saved us hours when the deploy env didn't match the local one.
- **Preview model access is a real schedule risk.** The 24-hour gap between filing an allowlist request and being granted access is enough to blow a hackathon submission. Build against GA, override to preview.

## What's next

- **Flip back to Gemini 3 the moment allowlist clears.** Single env var change, no code edits.
- **Add a second MCP partner.** Elastic for full-text keyword search (the catalogue queries are MongoDB-native today, but free-text search would benefit). One more `McpToolset` registration.
- **Reputation feedback loop.** Each successful order writes a signed feedback entry the agent reads back the next session for personalisation. (Adjacent: this maps cleanly to ERC-8004 on chain for our Mantle Turing Test submission on the same repo's sister branch.)

## Try it yourself

```sh
# 1. Clone + check out the branch
git clone https://github.com/KaJota-inc/kajota-coach
cd kajota-coach
git checkout hackathon/rapid-agent

# 2. Agent (Python ADK)
cd agent
cp ../.env.rapid-agent.example ../.env.rapid-agent
# Fill: GCP_PROJECT_ID, MONGODB_URI, MONGODB_DATABASE
# Drop secrets/rapid-agent/gcp-service-account.json (per HACKS.md gcloud commands)
pip install -e .
python -m kajota_concierge.server
# → http://localhost:8080/chat

# 3. Mobile (Expo)
cd ..
npm install
npx expo start
# point COACH_AGENT_BASE at your agent URL
```

## Built with

`gemini-2.5-pro` · `google-adk` · `mcp` · `mongodb-mcp-server` · `mongodb-atlas` · `fastapi` · `python 3.11` · `expo` · `react-native` · `typescript` · `websocket` · `gemini-live` · `yarngpt` · `render` · `docker` · `arc` · `vertex-ai`

## Demo video

[FILL — Devpost-standard, ≤3 min recommended. The demo should hit: (1) ask the agent a catalogue question that needs a live MongoDB query, (2) edit a doc in Atlas live + re-ask to prove the data is live, (3) the voice path in one of Yoruba / Igbo / Hausa.]

## Public repo URL

https://github.com/KaJota-inc/kajota-coach/tree/hackathon/rapid-agent
