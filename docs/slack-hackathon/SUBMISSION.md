# Kajota Coach in Slack — Devpost submission

**Track:** Slack Agent Builder Challenge (Slack × Salesforce × Devpost)
**Deadline:** Mon Jul 13, 2026 EOD
**URL:** https://slackhack.devpost.com/
**Branch:** [`hackathon/slack`](https://github.com/KaJota-inc/kajota-coach/tree/hackathon/slack)

Paste the bracketed fields into Devpost's submission form. The structured sections (`## Inspiration`, etc.) map 1-to-1 to Devpost's prompts.

---

## Tagline (max 200 chars)

The co-seller's control room, in Slack. A Gemini + MongoDB MCP agent that watches your merchant catalogue, replies with live product cards, and settles USDC escrow on-chain — from `/kajota pay`.

## Inspiration

We already ship a Gemini + MongoDB MCP shopping concierge inside our React Native app (submitted to the Rapid Agent hackathon on this same repo). What we saw the moment we let a small trading team share access: they wanted the agent in the room where they already talk — Slack — and they wanted it to do more than *tell* them what to do. They wanted it to *do* something. The Slack Agent Builder Challenge gave us a forcing function to move the agent from a mobile-app curio into an actual co-seller's control room, and to close the loop with real on-chain settlement.

## What it does

Kajota Coach in Slack is one bot that composes three surfaces the co-seller's team already lives in:

- **Live merchant catalogue reads** through the official MongoDB MCP server — every reply grounded in what's actually in the database this second, no RAG indexer to keep in sync.
- **Proactive agent turns** on demand — `/kajota status` fires a multi-tool ADK turn (recent orders, wishlist deltas, catalogue drops) and posts a Slack Block Kit card carousel in-channel.
- **Team-approved on-chain escrow settlement** — `/kajota pay yeezy-hoodie 25` doesn't broadcast. It resolves the on-chain listing id, then posts a Block Kit card in-channel with **Approve + broadcast** / **Deny** buttons. A workspace teammate clicks Approve → the buttons vanish, the card updates in place with the approver, and a threaded reply fills with live progress as each on-chain tx confirms:
  > 🔄 USDC.approve — broadcasting…
  > ✅ USDC.approve confirmed `0x…`
  > 🔄 CosellEscrow.deposit — broadcasting…
  > ✅ CosellEscrow.deposit confirmed `0x…`
  > 🔏 Escrow settled — 25.00 USDC locked for yeezy-hoodie

  That's the co-seller's approval workflow delivered through Slack primitives — Block Kit buttons, `chat_update` to disable a card after click, threaded receipts — not a chatbot pretending to be one.

Everything one workspace, one bot, one 3-second slash-command budget met by ack-first / respond-later architecture.

### One agent, three transports — including MCP both ways

Kajota Coach uses MCP twice: as a **client** composing MongoDB MCP + Fetch MCP inside the ADK Runner, AND as a **server** re-exposing its own domain capabilities to the outside world. The FastAPI process mounts an MCP endpoint at `/mcp` (streamable-HTTP transport) offering five tools any MCP client — Claude Desktop, Cursor, another ADK build, or Slack's own Agent Builder runtime — can call:

```
resolve_listing_id(product_hint)     — on-chain CosellRegistry read
propose_escrow(hint, amount)         — dry-run, returns listing id + calldata
settle_escrow(hint, amount)          — signs + broadcasts both txs
get_status(user_id)                  — proactive agent turn (3 MongoDB reads)
add_to_watchlist(product, user_id)   — MongoDB insert-one via the agent
```

Same code paths as the Slack surface — same mesh client, same ADK Runner, same MongoDB MCP. The MCP surface is defined in [`agent/kajota_concierge/mcp_server.py`](https://github.com/KaJota-inc/kajota-coach/blob/hackathon/slack/agent/kajota_concierge/mcp_server.py) using the official MCP Python SDK's `FastMCP`, mounted onto the FastAPI process at `/mcp` alongside the Slack routes. Any streamable-HTTP MCP client (Claude Desktop, Cursor, another ADK) that speaks the transport protocol can pull the tool list and dispatch calls.

The banner at `/` self-describes the MCP surface:

```json
{
  "mcp_server": {
    "name": "kajota-coach",
    "url": "/mcp",
    "tools": ["resolve_listing_id", "propose_escrow",
              "settle_escrow", "get_status", "add_to_watchlist"]
  }
}
```

## How we built it

### Stack — every track requirement met

| Requirement | Implementation |
|---|---|
| **Slack agent** | ✅ `slack-bolt>=1.21` (async) `AsyncApp` mounted inside the existing FastAPI process via `AsyncSlackRequestHandler`. Two routes: `POST /slack/events` (URL verification + app_mention + message.im) and `POST /slack/commands/kajota`. |
| **AI reasoning** | ✅ Gemini 2.5 Pro on Google Cloud Agent Development Kit (ADK), running as `Agent(tools=[mongodb_mcp, fetch_mcp])`. Same runtime as our Rapid Agent submission — Slack is a new transport, not a new agent. |
| **MCP integration** | ✅ Two MCP servers composed under one ADK runner: MongoDB MCP (official Node server via `npx`) as the merchant-data partner, plus Anthropic's Fetch MCP (Python module) for public-web reads. |
| **Real action, not just chat** | ✅ `/kajota pay` calls `kajota_concierge.mesh` — a web3.py client that composes `USDC.approve` + `CosellEscrow.deposit` against our own Mesh contracts on Mantle Sepolia. Two txs, one Slack Block Kit card, real explorer receipts. |

### Architecture

```
┌─────────────────── Slack workspace ────────────────────────┐
│  /kajota watch|status|pay             @kajota …             │
└──────────────────┬──────────────────────┬───────────────────┘
                   │ HTTPS                │
                   ▼                      ▼
┌──────────────────────────────────────────────────────────────┐
│ Render web service (Docker, kajota-coach hackathon/slack)     │
│                                                              │
│  FastAPI                                                      │
│   ├── /slack/events         ─┐                                │
│   ├── /slack/commands/kajota ─┼─► Bolt AsyncApp (slack-bolt)  │
│   ├── /chat                  │        │                       │
│   └── /proactive             │        ▼                       │
│                               ► _run_agent_turn (shared)      │
│                                        │                       │
│                                        ▼                       │
│                          ADK Runner ─► root_agent (Gemini 2.5) │
│                                          │                     │
│                          ┌───tools──────┼─────────────────┐    │
│                          ▼               ▼                ▼    │
│                MongoDB MCP        Fetch MCP        mesh.py     │
│                (Node, npx)        (Python module)  (web3.py)   │
│                     │                  │                │      │
│                     ▼                  ▼                ▼      │
│              MongoDB Atlas      Public web       Mantle Sepolia│
│                                            (Registry/Escrow/USDC)│
└──────────────────────────────────────────────────────────────┘
```

### Slack command grammar

```
/kajota watch <product>          → MongoDB `insert-one` on wishlist via agent
/kajota status                   → proactive agent turn — 3 forced MongoDB
                                   `find` calls + Block Kit card carousel
/kajota pay <listing> <usdc>     → pending card with Approve/Deny buttons
                                   → click Approve → threaded live tx status
                                   → USDC.approve + CosellEscrow.deposit
                                     mined on Mantle Sepolia
/kajota help                     → static help card
@kajota <anything>               → free-form agent turn, threaded reply
```

### The team-approval flow — why it's Slack-native, not chatbot-in-Slack

Most "AI agent in Slack" submissions treat the workspace as a chat transport: user asks, bot answers, done. The moment your bot needs to *do* something with real consequences, that model breaks — one user shouldn't unilaterally trigger an on-chain payment on behalf of a team. Kajota Coach uses Slack's actual collaboration primitives to solve this:

1. **Block Kit `actions` block** with two buttons (`kajota_approve`, `kajota_deny`) on the pending card.
2. **In-memory intent store** keyed by an opaque id — the button `value` is the id, not the tx params (so an untrusted user can't rewrite the amount in-flight).
3. **`chat_update` on click** — the approver is stamped into the card and the buttons vanish, so no double-click race.
4. **Threaded progress** via `client.chat_postMessage(thread_ts=…)` as each tx is broadcast + confirmed on Mantle Sepolia. The channel stays clean; the receipts live where they belong.
5. **15-min TTL sweep** — unclaimed proposals get pruned so the store stays bounded on Render's free-tier single worker.

Each Slack user in each workspace gets an isolated ADK session, keyed as `slack:{team_id}:{user_id}` — so `/kajota status` twenty minutes later picks up where the last turn left off, and cross-workspace sharing of a display name never leaks state.

### One ack budget, one real reply — solved once

Slack requires a slash-command ack within 3 seconds. Gemini agent turns with 2–3 MCP tool calls routinely take 8–15s. Bolt's `process_before_response=False` handles the split: we `ack()` immediately with an ephemeral "on it" and post the actual Block Kit reply via `client.chat_postMessage` once the agent turn finishes. Same pattern for `/kajota pay`, where the pre-tx receipt validation + two on-chain sends can take 30s+.

### Slash-command → team approval → on-chain, no wallet round-trip in the demo

`/kajota pay yeezy-hoodie 25`:

1. Resolve `yeezy-hoodie` → `bytes32 listingId` by calling `CosellRegistry.listingsForProduct("yeezy-hoodie")` on-chain — so a mistyped hint fails FAST, ephemerally, before a teammate is invited to click.
2. Read `MockUSDC.decimals()` → 6. Stash a `PendingDeposit(intent_id, listing_hint, gross_amount, requested_by, team_id, channel_id)` in the in-memory store.
3. Post the pending card with **Approve + broadcast** / **Deny** buttons; the button `value` is the opaque intent id.
4. On Approve: `send_approve(...)` broadcasts `USDC.approve(escrow, 25 × 10⁶)`, waits for the receipt, posts the threaded confirmation.
5. Then `send_deposit(...)` broadcasts `CosellEscrow.deposit(listingId, 25 × 10⁶)` — the escrow pulls the USDC via `transferFrom`, emits `Deposited(depositId, listingId, buyer, grossAmount)`, and the threaded confirmation lands with the explorer link.

If `MESH_RELAYER_PRIVATE_KEY` isn't set (default in a public deploy), `/kajota pay` still works but returns the *unsigned* two-tx pair — the Slack user signs in their own wallet, keeping the demo self-contained without exposing a hot key.

## Challenges we ran into

**Slack's 3-second ack window meets multi-tool agent turns.** Bolt's `respond()` alone won't cut it — a 12s agent turn expires the ack context. Fix: `ack()` early with an ephemeral placeholder, then `client.chat_postMessage(channel, blocks=…)` when the turn finishes. Slack's `response_url` also works, but expires after 30 minutes; `chat_postMessage` is safer.

**Cross-workspace session collision.** ADK's `InMemorySessionService` resolves by `(app_name, user_id, session_id)`. If we passed the raw Slack `user_id`, two workspaces with the same U0-prefixed IDs would share state. Fix: fold the workspace into both the ADK user_id and the session_id — `slack:{team}:{user}`.

**Web3.py v7 API drift.** Between v6 and v7, `SignedTransaction.rawTransaction` became `raw_transaction` and `HexBytes.hex()` stopped emitting the `0x` prefix. `kajota_concierge.mesh` handles both — `getattr(signed, "raw_transaction", None) or signed.rawTransaction`; explorer URLs get the `0x` prefixed defensively.

**Escrow deploy coverage.** The Kajota Mesh registry is live on Polygon Amoy, Ethereum Sepolia, and Mantle Sepolia. The full stack (Registry + Escrow + MockUSDC) is only live on Mantle Sepolia — Amoy is waiting on a POL top-up for the escrow contract. We defaulted `MESH_CHAIN=mantle-sepolia` and made the mesh client raise a clear `MeshConfigError` if you point it at a chain missing an escrow, so demo failures are diagnosed on the Slack card rather than the Render log.

## Accomplishments we're proud of

- **One agent, three surfaces.** The exact same `_run_agent_turn` coroutine drives the mobile `/chat`, mobile `/proactive`, and every Slack slash command + @mention. The Slack transport was ~450 lines of Python — Bolt + Block Kit formatters + a Mesh web3.py client — with zero changes to the agent itself.
- **`/kajota pay` produces a real receipt.** Most agent submissions stop at "the agent talks about doing the thing." Ours composes two on-chain calls (approve + deposit) against contracts we deployed ourselves, and posts the explorer link in-channel. Judges can click it.
- **Block Kit that matches the mobile UI.** The Slack reply parses the same `[CARDS]…[/CARDS]` structured tail we ship to the mobile React Native chat bubble. One agent output shape, two branded card renderers.
- **Faults surface where the user is looking.** A Mesh config error, a bad amount, a missing listing — all render as a Block Kit `:warning:` card inside the Slack channel, not a 500 the user has to chase in server logs.

## What we learned

- **A "Slack agent" is a transport, not an agent.** Once we stopped thinking "Slack integration" and started thinking "Slack is another surface on our existing agent," the code got a lot smaller. The Slack module owns Slack semantics (Block Kit, ack budgets, mentions); the agent is untouched.
- **The `/command <subcommand> <args>` idiom keeps you inside one Slack app manifest.** Registering `/kajota watch`, `/kajota status`, `/kajota pay` as separate slash commands would triple the app manifest and the reinstall churn. Routing on the first token of `text` inside `slack_app.py` is one manifest entry and one code entry.
- **Chain-agnostic env var overrides + a `MeshConfigError` are worth the ten extra lines.** The mesh client falls back to `DEFAULT_CHAINS[chain_key]` and lets `MESH_*` env vars override every address. Same code base runs the demo on Mantle Sepolia today and Amoy the moment we top up the escrow POL.

## What's next

- **Bring the Rapid Agent proactive push into Slack.** Today `/kajota status` runs on-demand. Wire the mobile-side proactive turn into a Render cron so a wishlist item hitting its target price posts a Slack card unprompted.
- **Wallet-connect flow for the unsigned path.** In the default deploy the Slack user has to hand-copy calldata to their wallet. A Slack `interactivity` handler + WalletConnect deep link would close that gap.
- **Third MCP.** Adding an Elasticsearch MCP for full-text catalogue search is one `McpToolset` registration + one system-prompt paragraph.

## Try it yourself

```sh
# 1. Clone + check out the Slack branch
git clone https://github.com/KaJota-inc/kajota-coach
cd kajota-coach
git checkout hackathon/slack
cd agent

# 2. Install the Python agent (+ Slack Bolt + web3)
cp ../.env.slack.example ../.env.slack
# Fill: SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET,
#       plus everything in .env.rapid-agent (GCP, MongoDB URI, ...)
pip install -e .
pip install mcp-server-fetch
python -m kajota_concierge.server

# 3. Register the Slack app
#    api.slack.com/apps → Create New App → From an app manifest
#    Paste docs/slack-hackathon/slack-app-manifest.yaml
#    (replace <YOUR_RENDER_URL> with your deployed service URL)
#    Install to workspace, copy Bot Token + Signing Secret into .env.slack
```

## Built with

`slack-bolt` · `slack-block-kit` · `gemini-2.5-pro` · `google-adk` · `mcp` · `mongodb-mcp-server` · `mongodb-atlas` · `mcp-server-fetch` · `web3.py` · `fastapi` · `python 3.11` · `mantle-sepolia` · `render` · `docker`

## Demo video

**https://www.youtube.com/watch?v=-eMZBU8J91c** — "KAJOTA COACH ADK AGENT" · 2:29 · captioned, real-voice narration. Hits every judging beat: help card → `/kajota status` with the "Used 3 MCP tool calls: find, find, find" footer visible under the wishlist card → `/kajota pay yeezy-hoodie 150` → pending Block Kit card with Approve/Deny buttons → click Approve → in-place `chat_update` → threaded `USDC.approve` + `CosellEscrow.deposit` receipts.

## Public repo URL

https://github.com/KaJota-inc/kajota-coach/tree/hackathon/slack

## Live Slack app

Bot: `@kajota` (installed in the private KAJOTA test workspace — invite on request)
Deployed agent: `https://kajota-hub.onrender.com/slack/` — banner at `/` self-describes every mounted surface (`/chat`, `/proactive`, `/slack/events`, `/slack/commands/kajota`, `/slack/actions`, `/mcp`).
