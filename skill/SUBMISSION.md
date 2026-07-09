# NandaHack — copy-paste submission pack

Everything you need to fire once Render is up.  Deadline pressure: Jul 11
finale (in ~4 days).  No hard cutoff for skill submissions but earlier
= safer.

---

## 0. Prereqs (do these in order)

| Order | Action | Time | Blocks |
|---|---|---|---|
| 1 | **Fill registration form** → https://forms.gle/HKCSitSChcFSqyzY8 | 2 min | Everything |
| 2 | Deploy on Render — set `MESH_RPC_URL` + `MESH_RELEASE_AUTH_KEY` | 5 min | Steps 3+ |
| 3 | Smoke-test: `curl https://<render-url>/healthz` returns `mode:"live"` | 1 min | Demo recording |
| 4 | Record 90-second demo (script below) | 5 min | Submission |
| 5 | Submit at https://nandahack.media.mit.edu/go/submit (copy-paste below) | 3 min | Done |

Bonus: NANDA Index registration (optional but +adoption score) — after step 5.

---

## 1. Registration form draft answers

Google form fields (order may vary — adapt if the form asks fewer/more):

- **Name**: Oluwabori Ola
- **Email**: oluwaboriife@gmail.com
- **GitHub handle**: bori7
- **Team / affiliation**: KaJota (kajota.com) — cross-border commerce infrastructure for African micro-merchants
- **What are you planning to build?** (one line):
  > On-chain USDC escrow as a NANDA-discoverable skill so agents can lock, release, and refund payments on Ethereum Sepolia without holding wallet keys.
- **Which Phase(s) will you enter?** Both — Phase 1 (NANDA Town PR #24, merged) + Phase 2 (Mesh escrow skill).
- **Are you attending the July 11 finale in person?** Online (unless you're travelling — flip the answer)

---

## 2. Step 2 skill submission — copy-paste

Once you're at `/go/submit`, expect fields like these (verified language):

- **Service name**: `KaJota Mesh Escrow`
- **What it does** (one sentence):
  > On-chain USDC escrow for AI agents on Ethereum Sepolia — lock, release, or refund a deposit against a listing without the calling agent holding a wallet key.
- **Web address (hosted endpoint)**: `https://kajota-mesh-skill.onrender.com` *(swap when you know the real Render URL)*
- **GitHub link**: https://github.com/KaJota-inc/kajota-coach/tree/hackathon/nanda-mesh-skill/skill
- **SKILL.md URL**: https://kajota-mesh-skill.onrender.com/skill.md *(served live from the deploy — see main.py `/skill.md` route)*
- **Endpoints list**:
  - `GET  /healthz` — liveness + chain probe
  - `POST /wallet/create` — provision a fresh managed demo wallet, funded from treasury
  - `GET  /wallet/{id}` — ETH + USDC balances
  - `POST /escrow/quote` — USD → USDC base units
  - `POST /escrow/lock` — server-signed approve + deposit; returns deposit_id
  - `GET  /escrow/deposit/{id}` — read deposit state
  - `POST /escrow/release` — release USDC to seller (authorised)
  - `POST /escrow/refund` — refund USDC to buyer (authorised)
- **Steps to use** (from SKILL.md):
  > 1. `POST /wallet/create` → get a buyer `wallet_id`, funded automatically.
  > 2. `POST /escrow/quote` with USD price → get `gross_amount_units`.
  > 3. `POST /escrow/lock` with `buyer_wallet_id` + `listing_id` + `gross_amount_units` → get `deposit_id`.
  > 4. Off-chain: verify delivery.
  > 5. `POST /escrow/release` with `deposit_id` → settles on Sepolia.
  > 6. Or `POST /escrow/refund` if delivery failed.
  > 7. `GET /escrow/deposit/{id}` at any time to read state.
  > Every step is one HTTP call. No wallet keys leave the service.
- **Demo video URL**: *(paste after recording)*
- **Discoverable via NANDA Index?** Yes — AgentFacts at `${DEPLOY_URL}/agentfacts.json`.

---

## 3. 90-second demo video beat sheet

Record with QuickTime screen-record. Terminal + browser split.

| Sec | Screen | Voiceover |
|---|---|---|
| 0-10 | Browser: nandahack.media.mit.edu | "NandaHack Step 2. KaJota Mesh Escrow — real on-chain USDC settlement, agents drive the whole cycle from HTTP. No wallet keys required." |
| 10-25 | Editor: skill/SKILL.md | "One SKILL.md. Eight endpoints. Create a wallet, lock funds, release or refund. Every step is a single HTTP call." |
| 25-45 | Terminal: `SKILL_URL=<render-url> ./verify-skill.sh` — steps 3 + 4 (wallet create × 2) | "Watch the service provision two demo wallets, funded from treasury. This is where every other escrow service breaks — you'd normally have to bring your own key." |
| 45-65 | Terminal: step 5 (lock) + Etherscan transaction | "Now the buyer wallet locks $42.50 USDC into escrow. The service signs approve + deposit, both real transactions on Sepolia. Here's the deposit ID from the on-chain event." |
| 65-80 | Terminal: step 6 (release) + Etherscan | "Release. USDC leaves the escrow contract, lands in the seller wallet. This is Sepolia Etherscan — real chain, real settlement, all driven from three HTTP calls." |
| 80-90 | Editor: agentfacts.json served at /agentfacts.json | "Discoverable via the MIT NANDA Index. Any agent on the internet of agents finds this and completes an escrow using only the SKILL.md." |

Words on-screen: `KaJota Mesh Escrow · One SKILL.md · Sepolia settlement · Zero keys held by the agent`.

---

## 4. Post-deploy sanity check (paste in shell)

```bash
export RENDER_URL=https://kajota-mesh-skill.onrender.com   # swap real URL

# Health should say mode:"live"
curl -s "$RENDER_URL/healthz" | jq .

# SKILL.md must be reachable (agent discovery path)
curl -sI "$RENDER_URL/skill.md" | head -3

# AgentFacts served (for NANDA Index registration)
curl -s "$RENDER_URL/agentfacts.json" | jq .id

# Full 4-step demo
SKILL_URL="$RENDER_URL" ./verify-skill.sh
```

---

## 5. NANDA Index registration (bonus)

Once Render is live:

```bash
pip install nanda-adapter
# Follow the adapter's registration flow; point it at:
#   agentfacts_url = f"{RENDER_URL}/agentfacts.json"
```

If nanda-adapter registration is time-consuming, skip and just note in
the submission form that AgentFacts is served — judges can pull it
directly from the URL.

---

## 6. What's already done vs blocking on you

| Piece | Status |
|---|---|
| Step 1 PR to nandatown | ✅ [projnanda/nandatown#24](https://github.com/projnanda/nandatown/pull/24) MERGED Jun 19 |
| Step 2 service code | ✅ pushed on `hackathon/nanda-mesh-skill` |
| SKILL.md | ✅ `skill/SKILL.md` |
| AgentFacts | ✅ `skill/agentfacts.json` |
| verify-skill.sh | ✅ dry-run green |
| `/skill.md` + `/agentfacts.json` routes | ✅ this commit |
| Registration form | ⏳ **you** |
| Render deploy | ⏳ **you** |
| Demo recording | ⏳ **you** |
| Submission | ⏳ **you** |
