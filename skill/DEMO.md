# Kajota Trade — SME invoice-financing demo

**Ignyte × Polygon Smart Commerce Challenge — SME Trade Finance track.**

An SME sitting on an unpaid invoice gets working capital *today* instead
of waiting for the buyer to pay. Kajota Trade tokenizes the invoice,
scores the SME's creditworthiness on-chain, lets a financier advance
cash against it, and settles repayment through an escrow letter of
credit — all in USDC on Polygon.

It reuses Kajota's live Mesh contracts (the co-sell escrow is already a
letter-of-credit engine) and the Coach agent's on-chain skill, adding
two things: **tokenized receivables** and **on-chain trade-credit
scoring**.

## The three track deliverables, in one flow

| Deliverable | Where |
|---|---|
| Tokenized receivables | `ReceivableRegistry` — mints/tracks the invoice as an on-chain asset |
| Smart-contract letter of credit | `CosellEscrow` — debtor pays in, auto-splits on confirmation |
| On-chain trade-credit scoring | Coach engine (`scoring.py`) → `ScoreAttestation` anchor |

## Run it (no wallet, no faucet, ~10s)

**1. The credit score — real engine, off-chain:**

```bash
cd skill && .venv/bin/python demo/run_scoring.py
```

Scores a representative SME (18 months trading, $35k GMV, a clean 6/6
on-chain repayment record) → **910 / 1000, Band A → 90% advance rate**,
with a per-factor breakdown. The engine is pure: the `payload_hash` it
prints is the verifiable commitment anchored on-chain.

**2. The full lifecycle — real contracts, local chain:**

```bash
cd ../kajota-mesh/packages/contracts && pnpm demo:trade-finance
```

Deploys the whole stack to an in-memory node with four distinct actors
(service / supplier / financier / debtor) and walks every step on-chain
with assertions:

```
1. Credit score (Coach engine) → ScoreAttestation   [910/A, verifyPayload: true]
2. Tokenize invoice → ReceivableRegistry            [INV-2026-0042, $5.00, Registered]
3. Finance → advance to supplier + markFinanced      [financier → $4.50, Financed]
4. Maturity → debtor pays escrow → auto-split        [financier $4.75, supplier $0.25]
5. Settle → markRepaid                               [Repaid]

Final ledger: supplier $4.75 · financier $5.25 (+$0.25 fee) · debtor $0.00 · escrow $0.00
```

## The economics

A $5.00 invoice, Band-A supplier, 90% advance:

- Supplier gets **$4.50 up-front** (vs waiting for the buyer), plus a
  **$0.25 residual** at settlement → **$4.75 net**, i.e. a 5% financing
  discount for early cash.
- Financier lays out $4.50, recovers **$4.75** at maturity → **$0.25
  fee** (~5.6% on a short-dated advance).
- The debtor simply pays the **$5.00** they always owed — into an escrow
  that can only route the funds the agreed way.

## What's real vs. staged

- **Real:** the scoring engine (deterministic, `pytest`-covered), all
  four contracts and their state transitions, the USDC movements, the
  escrow split, `verifyPayload`.
- **On the local node** the demo uses distinct funded signers. On live
  **Polygon Amoy**, the same script runs with `--network polygonAmoy`
  against the deployed stack (`deploy:amoy:mock` emits all four
  addresses); point the skill at them via `MESH_SCORE_ATTESTATION_ADDRESS`
  and the `/credit/score` endpoint anchors for real.

## The service surface

The scoring lives behind the Mesh skill so any Kajota agent can call it:

- `POST /credit/score` — `{subject, history}` → score + band + advance
  rate + factor breakdown, and anchors the hash on `ScoreAttestation`.
- `GET /credit/{subject}` — the latest on-chain attestation.

See [`README.md`](./README.md) for the endpoint table and env vars.
