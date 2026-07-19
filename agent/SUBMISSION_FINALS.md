# KaJota Coach — Agentic Commerce on Casper (Final Round)

Paste-ready BUIDL copy for the Casper Agentic Buildathon 2026 **Final Round**.
Replace `JUDGE_DEMO_URL` once the live demo is deployed.

---

**Tagline:** An AI commerce agent that **pays for its own work on Casper** — a
real CEP-18 micropayment, settled on-chain, no human in the loop. The only
finalist where the payment is real, not mock.

## ▶ Try it live — click and watch it settle on Casper (10 seconds)

**`JUDGE_DEMO_URL`** — open it, click **"Pay & settle on Casper"**, and a real
`transfer_with_authorization` is signed, verified, and written on-chain in front
of you. A live transaction hash appears with a link to cspr.live. Each settlement
is a net-zero self-transfer (payer → itself) with gas paid by Casper's sponsored
feePayer, so it costs you nothing — click again to settle another.

No wallet, no signup, no mock mode. This is the whole x402 loop, live.

## Verify it yourself in 5 steps

1. **See the paywall:** `curl -s https://kajota-hub.onrender.com/concierge/coach/premium`
   → HTTP `402` with a Casper price tag (0.001 KaJota USD, asset, payTo, feePayer).
2. **Watch it settle:** open `JUDGE_DEMO_URL`, click *Pay & settle* → a real tx hash
   appears; click it to open cspr.live and confirm `status: processed`.
3. **Inspect our CEP-18:** [contract package `354ca0ad…`](https://testnet.cspr.live/contract-package/354ca0ad7ef8c97a02b195a1f39e96908fd3bf20d6ec4255850d05f1784fb404)
   — our own token implementing `transfer_with_authorization`.
4. **Confirm gas was sponsored:** on any settlement tx, the gas caller is the
   facilitator's feePayer `81d557c9…`, not us — the agent moved value holding no CSPR.
5. **Reproduce locally:** `pip install -e ./agent && pytest agent/tests/test_x402_casper.py`
   (14 tests, no network) → then `node agent/scripts/settle_once.mjs` for your own
   on-chain settlement. Full steps in [TESTING.md](TESTING.md).

## Real, not mock

The x402 track rewards depth of settlement — $100K of the $150K pool is x402
ecosystem credits. Here is exactly what is real in this project:

| Component | Status |
|---|---|
| Own CEP-18 token deployed on Casper Testnet | **REAL** |
| `transfer_with_authorization` (EIP-712 signed) | **REAL** |
| Production CSPR.cloud facilitator `/verify` + `/settle` | **REAL** |
| On-chain settlement transaction (gas by sponsored feePayer) | **REAL** |
| Settlement from the **live hosted** endpoint (not just local) | **REAL** |
| Mock payment mode / stubbed settlement | **none** |

We settle actual value through Casper's own x402 rails. That is the core of the
buildathon, and it is production, not a prototype.

## On-chain proof (Casper Testnet — verifiable on cspr.live)

| What | Value |
|---|---|
| **Our CEP-18 contract** (KaJota USD, `transfer_with_authorization`) | package `354ca0ad7ef8c97a02b195a1f39e96908fd3bf20d6ec4255850d05f1784fb404` |
| **Contract deploy tx** | [`df084784…`](https://testnet.cspr.live/transaction/df0847848800502b1b6919c1ad9a2dc0845c309006382b21ef8ad759d7c4171a) |
| **x402 settlement tx** (real agent micropayment) | [`88c4153e…`](https://testnet.cspr.live/transaction/88c4153e211011915b7b7bc2af718ada2b506266512701a7488a80f77a58b4a3) — processed, block 8394190 |
| **Settlement from the live judge demo** | [`85041ff3…`](https://testnet.cspr.live/transaction/85041ff37d4e7b4840f738a465bfd933875bdf81604ced3fc6b62dba5fe1d7ea) — processed, block 8535087 |

## The problem

AI agents can reason, but they can't *transact*. The moment an agent needs a
paid resource — a premium analysis, another agent's API, a data feed — it hits a
human wall: sign up, get an API key, attach a card, wait for approval. That
breaks autonomy. Casper's own AI Toolkit frames the goal exactly: **pay-per-request
APIs and machine-to-machine commerce systems.** That is what we built.

## What we built

KaJota Coach is an agentic commerce concierge (Gemini + Google ADK, with MongoDB
and Fetch over MCP), serving African micro-merchants. For the Buildathon we made
it a **Casper-native economic actor**, two ways:

1. **It charges for its own premium work.** `POST /coach/premium` runs a deep
   purchase-insight turn behind an **x402 paywall**. A calling agent gets a `402`
   price tag, signs a CEP-18 `transfer_with_authorization`, and the CSPR.cloud
   facilitator settles it on Casper — no account, no key, no human. The response
   carries the on-chain deploy hash as proof.
2. **It reads Casper in natural language** via the Casper MCP server as a third
   MCP partner — "what's my balance?", "did that payment settle?" — the same
   MCP-as-architecture pattern as its MongoDB and Fetch partners.

## DeFi & RWA relevance

This is real-world-asset commerce, not a toy. KaJota's merchants sell physical
goods; the agent settling a stablecoin-denominated micropayment on-chain is the
DeFi rail under real trade. Our roadmap makes the RWA tie explicit: settle in a
Casper-native **stablecoin** so merchant payouts clear in a stable unit, turning
every agent purchase into an on-chain DeFi settlement backed by real goods.

## Why it's a reference implementation (ecosystem impact)

No official **Python** x402 *server* SDK existed — only Node and Go. We wrote one
and documented every wire-format correction found against the live facilitator:
`amount` vs `maxAmountRequired`, the v2 envelope, `"00"`-prefixed account-hash
`payTo`, `transfer_with_authorization` assets, and the mandatory `extra.version`
EIP-712 domain. The whole deploy → sign → settle path ships as runnable scripts
with a one-command demo. It is the "how do I actually ship x402 on Casper?"
answer the ecosystem needs — MIT-licensed, in [CASPER.md](agent/CASPER.md).

We also found and fixed a live outage: the facilitator's shared testnet gas
account had drained to zero (breaking settlement for everyone), which we topped
up on-chain so the whole cohort's demos work again.

## Tech stack

- **Casper AI Toolkit** — x402 Facilitator (CSPR.cloud), Casper MCP server,
  own CEP-18 (`transfer_with_authorization`) via Odra on testnet
- **Agent** — Google ADK + Gemini, FastAPI, Model Context Protocol
- **Payments** — x402 v2 (`exact` scheme, `casper:casper-test`), casper-js-sdk signer
- Server-side x402 module in pure Python + 14 unit tests

## Roadmap

1. **Mainnet x402** — flip to `casper:casper`, settle against a mainnet CEP-18.
2. **Stablecoin settlement (RWA)** — Casper-native stablecoin so merchant payouts
   clear in a stable unit; real goods, on-chain DeFi settlement.
3. **Agent-to-agent commerce** — KaJota agents paying *each other* per call — an
   x402 mesh (Coach → pricing agent → logistics agent).
4. **Publish `casper-x402-python`** — extract the reference layer as a package.

**Links & live product:**
- ▶ Live judge demo (click-to-settle): `JUDGE_DEMO_URL`
- Live agent API: https://kajota-hub.onrender.com/concierge/coach/premium
- Repo (`hackathon/casper`): https://github.com/KaJota-inc/kajota-coach/tree/hackathon/casper
- Demo video: https://youtu.be/fFbvIZV52RA
- Website: https://kajota.io · GitHub org: https://github.com/KaJota-inc
