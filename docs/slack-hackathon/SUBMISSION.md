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
- **On-chain escrow settlement** — `/kajota pay yeezy-hoodie 100` prepares (and, if a demo relayer is configured, broadcasts) the two-tx USDC deposit sequence against the Kajota Mesh CosellEscrow on Mantle Sepolia. The Slack reply is a settlement receipt with clickable explorer links.

Everything one workspace, one bot, one 3-second slash-command budget met by ack-first / respond-later architecture.

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
/kajota pay <listing> <usdc>     → USDC.approve + CosellEscrow.deposit;
                                   returns explorer receipt (or unsigned
                                   tx pair if no relayer key set)
/kajota help                     → static help card
@kajota <anything>               → free-form agent turn, threaded reply
```

Each Slack user in each workspace gets an isolated ADK session, keyed as `slack:{team_id}:{user_id}` — so `/kajota status` twenty minutes later picks up where the last turn left off, and cross-workspace sharing of a display name never leaks state.

### One ack budget, one real reply — solved once

Slack requires a slash-command ack within 3 seconds. Gemini agent turns with 2–3 MCP tool calls routinely take 8–15s. Bolt's `process_before_response=False` handles the split: we `ack()` immediately with an ephemeral "on it" and post the actual Block Kit reply via `client.chat_postMessage` once the agent turn finishes. Same pattern for `/kajota pay`, where the pre-tx receipt validation + two on-chain sends can take 30s+.

### Slash-command → on-chain, no wallet round-trip in the demo

`/kajota pay yeezy-hoodie 100`:

1. Hash `yeezy-hoodie` → `bytes32 listingId` (deterministic; same string always addresses the same listing across demo runs).
2. Read `MockUSDC.decimals()` → 6.
3. `USDC.approve(escrow, 100 × 10⁶)` — sign + broadcast from the demo relayer.
4. `CosellEscrow.deposit(listingId, 100 × 10⁶)` — sign + broadcast.
5. Slack Block Kit reply with two `<explorer_url|0xhash…>` links.

If `MESH_RELAYER_PRIVATE_KEY` isn't set (default in a public deploy), the same command returns the *unsigned* two-tx pair inside the Block Kit card — the Slack user then signs in their own wallet, keeping the demo self-contained without exposing a hot key.

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

[FILL — ≤3 min. Shot list in docs/slack-hackathon/demo-shot-list.md.]

## Public repo URL

https://github.com/KaJota-inc/kajota-coach/tree/hackathon/slack

## Live Slack app

Bot: `@kajota` (workspace: [FILL — test workspace invite link])
Deployed agent: `https://kajota-concierge-slack.onrender.com/` (base), `/slack/events` + `/slack/commands/kajota`
