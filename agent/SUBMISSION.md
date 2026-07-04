# DoraHacks BUIDL — KaJota Coach × Casper

Paste-ready copy for the [Casper Agentic Buildathon 2026](https://dorahacks.io/hackathon/casper-agentic-buildathon)
submission. Fill the bracketed links at submission time.

---

**Project name:** KaJota Coach — Agentic Commerce on Casper

**Tagline:** An AI shopping concierge that pays for its own premium work with
HTTP-native micropayments settled on Casper.

**Tracks:** Agentic AI · DeFi & Payments

**Links:**
- Repo / PR: https://github.com/KaJota-inc/kajota-coach/pull/3 (branch `hackathon/casper`)
- Demo video: [YouTube link — record before submit]
- Write-up: `agent/CASPER.md` in the repo

## On-chain proof (Casper Testnet)

Everything below is live and verifiable on cspr.live:

| What | Value |
|---|---|
| **Our CEP-18 contract** (KaJota USD, with `transfer_with_authorization`) | package `354ca0ad7ef8c97a02b195a1f39e96908fd3bf20d6ec4255850d05f1784fb404` |
| **Contract deploy tx** | [`df084784…`](https://testnet.cspr.live/transaction/df0847848800502b1b6919c1ad9a2dc0845c309006382b21ef8ad759d7c4171a) |
| **x402 settlement tx** (agent micropayment — a real `transfer_with_authorization`) | [`88c4153e…`](https://testnet.cspr.live/transaction/88c4153e211011915b7b7bc2af718ada2b506266512701a7488a80f77a58b4a3) — processed, block 8394190 |

The settlement's gas was paid by Casper's sponsored x402 **feePayer** — the
agent moved value without holding native gas, exactly the x402 promise.

---

## The problem

AI agents can reason, but they can't *transact*. The moment an agent needs a
paid resource — a premium analysis, another agent's API, a data feed — it hits
a human wall: sign up, get an API key, attach a card, wait for approval. That
breaks autonomy. Agents need to pay the way they call: per request, instantly,
with cryptographic proof and no human in the loop.

## What we built

KaJota Coach is an agentic shopping concierge (Gemini + Google ADK, with
MongoDB and Fetch reached over MCP). For the buildathon we made it a
**Casper-native economic actor**, two ways:

1. **It charges for its own premium work.** `POST /coach/premium` runs a deep
   purchase-insight turn (spend trends, wishlist price-drop opportunities, a
   grounded next-buy recommendation) behind an **x402 paywall**. An agent that
   wants it gets a `402` with a price tag, signs a CEP-18
   `transfer_with_authorization`, and the **CSPR.cloud x402 Facilitator**
   settles it on Casper — no account, no key, no human. The response carries
   the on-chain deploy hash as proof.

2. **It reads Casper in natural language.** The Casper MCP server is bolted on
   as a third MCP partner, so the Coach can answer "what's my CSPR balance?" or
   "did that payment settle?" by querying the chain directly — the same
   MCP-as-architecture pattern as its MongoDB and Fetch partners.

## Why it's real, not a mock

We built against the **production** facilitator and verified the wire protocol
live (Jun 27, 2026), correcting several things the public examples get wrong:

- The facilitator runs **x402 v2** and reads the price field as `amount` (not
  the x402-standard `maxAmountRequired`).
- `payTo` is a "00"-prefixed **account-hash**; the asset must implement
  **`transfer_with_authorization`** (we deployed our own — KaJota USD); and
  `extra.version` (the EIP-712 domain) is mandatory.

And it doesn't just pass `/verify` — **it settled for real.** We deployed our
own CEP-18, signed a `transfer_with_authorization`, and the production
facilitator settled it on Casper (tx `88c4153e…`, processed on-chain). The
full agent-payment loop runs against Casper's real infrastructure, not a mock.

## Tech stack

- **Casper AI Toolkit** — x402 Facilitator (CSPR.cloud), Casper MCP server,
  CEP-18 (`transfer_with_authorization`) on testnet
- **Agent** — Google ADK + Gemini, FastAPI, Model Context Protocol
- **Payments** — x402 v2 (`exact` scheme, `casper:casper-test`), settled on Casper
- 14 unit tests; isolated server-side x402 module in pure Python

## What's next

A real on-chain settlement in the demo via the client signer (Casper's
reference `make-software/casper-x402` client produces the `X-PAYMENT`), then
extend to agent-to-agent commerce: KaJota agents paying each other per call
across the mesh.
