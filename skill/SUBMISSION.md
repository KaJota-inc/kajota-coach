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
  - `GET  /healthz` — service + chain liveness probe
  - `POST /escrow/quote` — convert USD → USDC base units
  - `GET  /escrow/deposit/{id}` — read deposit state
  - `POST /escrow/release` — release USDC to seller (authorised)
  - `POST /escrow/refund` — refund USDC to buyer (authorised)
- **Steps to use** (from SKILL.md):
  > Buyer approves `CosellEscrow` to spend USDC, calls `deposit(listingId, amount)` from their own wallet; retains the `depositId` from the `Deposited` event. Off-chain: seller delivers. Buyer agent POSTs `/escrow/release {deposit_id}`; service signs and broadcasts. `GET /escrow/deposit/{id}` returns `status: "released"`.
- **Demo video URL**: *(paste after recording)*
- **Discoverable via NANDA Index?** Yes — AgentFacts at `${DEPLOY_URL}/agentfacts.json`.

---

## 3. 90-second demo video beat sheet

Record with QuickTime screen-record or `simctl` (see [[feedback_ios_sim_recording]]
if you want the sim pattern).  Terminal + browser split.

| Sec | Screen | Voiceover |
|---|---|---|
| 0-10 | Browser: nandahack.media.mit.edu | "NandaHack Step 2 — a skill agents can use on their own. KaJota Mesh Escrow: on-chain USDC settlement, no keys required on the agent side." |
| 10-25 | Editor: skill/SKILL.md | "The full contract fits in one Markdown file — service name, what it does, endpoints, an end-to-end recipe. Agents read this and act." |
| 25-40 | Terminal: `SKILL_URL=<render-url> ./verify-skill.sh` — step 1 healthz | "Live health probe against the Render deploy — mode:live, chain:Sepolia, service wallet is the CosellEscrow releaseAuth." |
| 40-55 | Terminal: quote + release output | "Agent asks for a quote in USD, gets USDC base units back. Then releases the deposit — this is a real Sepolia transaction." |
| 55-75 | Browser: sepolia.etherscan.io/tx/... | "There's the transaction on Sepolia Etherscan. Real chain, real contract, real settlement — driven entirely from an HTTP call." |
| 75-90 | Editor: agentfacts.json | "And the whole service is registered in the NANDA Index via AgentFacts, so any agent on the internet of agents can discover and call it." |

Words on-screen: `KaJota Mesh Escrow · SKILL.md · Sepolia · No keys required`.

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
