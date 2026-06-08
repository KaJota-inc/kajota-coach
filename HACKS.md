# Hackathon credentials & branches — kajota-coach

One section per active hackathon target on this repo. Each section
pins:

- the dedicated branch
- where local secrets live (gitignored)
- which `.env.<hack>.example` template seeds local config
- the human-side credential-mint steps

Branches use the `hackathon/<id>` convention, matching the existing
`hackathon/coach` / `hackathon/coach-agent-v2` branches across the
sibling KaJota repos and `hackathon/mantle-turing` on kajota-mesh.

---

## Mantle Turing Test 2026 (Jun 15, 2026, 15:59)

**Track URL:** https://dorahacks.io/hackathon/mantleturingtesthackathon2026
**Mantle DevHub:** https://devhub.mantle.xyz/
**Prompt confirmed Jun 8, 2026 via web search.**

| | |
|---|---|
| **Branch** | `hackathon/mantle-turing` |
| **Local env** | `.env.mantle-turing` (gitignored; template `.env.mantle-turing.example`) |
| **Secret store** | `secrets/mantle-turing/` (gitignored; `.gitkeep` keeps the dir) |
| **Render env group** | `kajota-coach-mantle-turing` (mirror `.env.mantle-turing` into the Render service env) |
| **GCP service account** | _(not used on this hack)_ |
| **Status** | Build authorized Jun 8, 2026 — stack pivot to OpenClaw + ERC-8004 |
| **Prize pool** | **$120k** (two-phase) |

### Required stack (per the published prompt)

The Mantle Turing Test track REQUIRES:

1. **AI agent on OpenClaw** — the AI agent framework that integrates
   on-chain identity + reputation. Docs: https://docs.openclaw.ai
2. **ERC-8004 identity** on Mantle testnet — the on-chain agent
   identity standard:
   - Identity Registry (ERC-721 agent identity NFTs)
   - Reputation Registry (signed feedback scores)
   - Validation Registry (zkML / TEE / staker verification)
   - ERC-8004 went live on Mantle mainnet Jan 2026; the hack runs on
     Mantle testnet
3. **Demonstrable on Mantle testnet** — every agent action becomes a
   verifiable on-chain trace via the ERC-8004 reputation registry

### Submission deliverables

- **X (Twitter) thread** with `#MantleAIHackathon` containing:
  - Pitch
  - Demo video
  - GitHub link
  - Mantle contract address
- **Phase I**: AI agent on OpenClaw with ERC-8004 identity (testnet)
- **Phase II**: open globally
- **Deadline:** Jun 15, 2026 15:59
- **Demo Day:** Jul 2-3, 2026

### Strategy

This maps cleanly to the existing Coach + Mesh architecture:
- Coach already has on-chain identity ambitions (the v2 spec mentions
  this)
- Wrap the coach agent runtime as an OpenClaw agent
- Mint an ERC-8004 identity for the coach on Mantle Sepolia
- Record key coach actions (price-drop trigger fires, swap completes,
  notification sent) to the ERC-8004 reputation registry as
  verifiable traces
- The existing OpenAI/Anthropic intelligence layer stays — the hack
  is about the on-chain identity + reputation, not the LLM provider

### Credentials to mint

1. **Mantle Sepolia signer EOA.** Generate fresh
   (`cast wallet new`) and fund via
   <https://faucet.sepolia.mantle.xyz>. Set as
   `DEPLOYER_PRIVATE_KEY`. This signer:
   - Deploys the agent's ERC-8004 identity NFT
   - Signs ERC-8004 reputation-registry feedback entries
   - Mints reputation feedback when the agent completes actions

2. **Mantlescan API key.** Create at
   <https://explorer.sepolia.mantle.xyz/api-keys>. Set as
   `MANTLESCAN_API_KEY`. Used for contract verification on deploy.

3. **OpenClaw account + framework install.** Per
   <https://docs.openclaw.ai/gateway/configuration-reference>:
   - Self-host or use OpenClaw Cloud
   - Register the coach agent → get an OpenClaw agent id
   - Set as `OPENCLAW_AGENT_ID` + `OPENCLAW_GATEWAY_URL`

4. **LLM provider key** _(unchanged from coach main)_. The hack is
   stack-additive — OpenAI / Anthropic continue to power the
   agent's reasoning; OpenClaw wraps it for on-chain interaction.
   Set as `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`.

5. **Managed Mantle RPC** _(optional, recommended)_. Alchemy /
   QuickNode endpoint. Set as `MANTLE_SEPOLIA_RPC`. The public
   endpoint rate-limits hard on dev-loop calls.

### Render env group — `kajota-coach-mantle-turing`

Variables to mirror from `.env.mantle-turing` into the Render service
env (Render dashboard → Environment → Add env group):

- `MANTLE_SEPOLIA_RPC`
- `DEPLOYER_PRIVATE_KEY`
- `MANTLESCAN_API_KEY`
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`
- `OPENCLAW_AGENT_ID` / `OPENCLAW_GATEWAY_URL`
- `ERC8004_IDENTITY_REGISTRY` (Mantle Sepolia deployed address)
- `ERC8004_REPUTATION_REGISTRY` (ditto)
- `ERC8004_VALIDATION_REGISTRY` (ditto — only if using staker/zkML proofs)
- `COACH_BACKEND_URL` (the Render service's own URL; circular ref
  intentional for self-discovery)

### TODO before the demo

- [x] Mantle Turing track prize prompt published — confirmed Jun 8, 2026
- [ ] Pull the canonical ERC-8004 deploy addresses on Mantle Sepolia
      from <https://devhub.mantle.xyz> and pin in
      `.env.mantle-turing.example`
- [ ] Install OpenClaw framework + register the coach as an OpenClaw
      agent
- [ ] Deploy the agent's ERC-8004 identity NFT on Mantle Sepolia →
      record tx hash + token id under "Deployed"
- [ ] Wire one coach action (price-drop trigger fire?) to write
      a reputation feedback entry via ERC-8004
- [ ] Demo Day live demo (Jul 2-3) — agent takes an action,
      reputation entry appears on Mantlescan in real time
- [ ] X thread with `#MantleAIHackathon` + pitch + demo video +
      GitHub + Mantle contract address (Jun 15)

### Reference docs

- **OpenClaw docs:** https://docs.openclaw.ai
- **ERC-8004 standard (ERC-721 + 3 registries):**
  https://www.ainvest.com/news/erc-8004-chain-flow-21-000-ai-agents-2602/
- **OpenClaw + ERC-8004 builder guide:**
  https://www.bittime.com/en/blog/erc-8004-openclaw-scroll
- **OpenClaw 2026 guide:** https://www.buildmvpfast.com/openclaw-guide-2026

### Deployed

_(none yet — fill once the first deploy lands; record tx hash +
ERC-8004 identity token id + Mantle Sepolia contract addresses)_

---

## Google Cloud Rapid Agent (Jun 11, 2026)

See the `hackathon/rapid-agent` branch — that section lives there
because Rapid Agent is the only hack on this repo using a GCP
service account, so the credential-mint flow is materially
different.

---

## Adding a new hackathon

1. Cut the branch off `main`: `git checkout -b hackathon/<id>`.
2. Copy `.env.mantle-turing.example` → `.env.<id>.example` and adjust.
3. `mkdir -p secrets/<id> && touch secrets/<id>/.gitkeep`.
4. Add a new top-level section to this file mirroring the structure
   above.
5. The repo `.gitignore` already covers `.env.<anything>` (with
   `.env.<anything>.example` re-included) and `secrets/<hack>/*`
   (with `.gitkeep` re-included) — no further gitignore changes
   needed.
