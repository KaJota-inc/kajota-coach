# KaJota Coach × Casper — 90-second demo script

Goal: show an AI agent paying for its own work on Casper, and reading Casper
over MCP — with real, on-screen facilitator responses (not slideware).

**Setup before recording**
```sh
cd agent
cp .env.casper.example .env.casper       # values pre-filled; add your CSPR.cloud key
set -a; . .env.casper; set +a
export CASPER_MCP_ENABLED=1               # Docker running, for the MCP scene
kajota-agent                              # FastAPI on :8080  (second terminal)
```

---

### Scene 1 — The hook (0:00–0:12)
**On screen:** the Coach chat answering a normal shopping question (free `/chat`).
**VO:** "This is KaJota Coach — an AI shopping concierge. Reasoning is free. But
its *premium* analysis costs money. Watch how an agent pays for it — on Casper,
with no account and no human."

### Scene 2 — The 402 price tag (0:12–0:30)
**On screen:** run `python scripts/x402_demo.py`.
**VO:** "The agent calls the premium endpoint with no payment. It gets back
HTTP 402 — Payment Required — with a Casper price tag: the asset, the amount,
who to pay, on testnet."
**Highlight:** the printed `accepts[0]` line — `scheme=exact`,
`network=casper:casper-test`, `amount=1000000`, the Wrapped CSPR `asset`.

### Scene 3 — The facilitator is live (0:30–0:45)
**On screen:** `python scripts/x402_demo.py --supported`.
**VO:** "This isn't a mock. The CSPR.cloud x402 Facilitator is live — here are
the networks it settles on and the account that sponsors gas for us."
**Highlight:** the real `/supported` JSON (v2, casper-test, feePayer).

### Scene 4 — Pay, and settle on Casper (0:45–1:05)
**On screen:** `python scripts/x402_demo.py --payment <signed-payload>` →
HTTP 200 with the `settlement.transaction` deploy hash. Cut to that hash on
testnet.cspr.live.
**VO:** "The agent signs a transfer-with-authorization, retries, and the
facilitator settles a CEP-18 micropayment on Casper. Here's the deploy hash —
real, on-chain, in seconds. Now the premium insight runs."
**Highlight:** `settlement.transaction` + the premium agent response.

### Scene 5 — The agent reads Casper (1:05–1:25)
**On screen:** `/chat` with "Did deploy <hash> settle, and what's the balance of
<account>?" → the agent calls Casper MCP tools and answers from chain state.
**VO:** "And because Casper is wired in over MCP, the Coach can verify its own
payment — querying the chain in natural language, the same way it queries its
database."

### Scene 6 — Close (1:25–1:30)
**On screen:** title card — "KaJota Coach · Agentic AI + Payments on Casper".
**VO:** "An agent that earns, pays, and reads on-chain. That's agentic
commerce on Casper."

---

**Honesty note for the recording:** Scenes 2, 3, and 5 are fully live today.
Scene 4's signed payload comes from Casper's reference signer
(`make-software/casper-x402` client) — the server side that verifies and
settles is ours and is already validated against the live facilitator. If the
signer isn't wired by record time, show Scene 4 as the live `/verify` reaching
signature validation with the real asset (proof the settlement path is correct)
and narrate the deploy-hash step.
