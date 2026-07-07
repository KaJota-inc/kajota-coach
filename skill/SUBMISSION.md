# Kajota Trade — Ignyte × Polygon Smart Commerce Challenge

**Track:** SME Trade Finance
**Chain:** Polygon PoS (Amoy testnet)
**One line:** An invoice-financing rail that lets African micro-SMEs turn
an unpaid invoice into working capital *today* — with creditworthiness
scored and anchored on-chain, and repayment settled through a
smart-contract letter of credit, all in USDC.

---

## 1. The problem

A micro-SME sells $5,000 of goods on 30-day terms and then waits a month
to get paid — while rent, restock, and payroll don't wait. Traditional
invoice financing exists, but it's closed to informal SMEs: no audited
statements, no credit bureau file, no collateral a bank recognises.

Kajota already runs the commerce layer for thousands of these sellers
(listings, orders, wallet, payments). That gives us the one thing a
lender can't get anywhere else: **a real, continuous trade history**. The
missing piece is a rail that turns that history into on-chain credit and
routes financing trustlessly.

## 2. The solution

Kajota Trade adds three on-chain primitives on top of Kajota's live Mesh
contracts, wired into one flow:

1. **Tokenized receivable** — the SME registers its unpaid invoice as an
   on-chain asset a financier can underwrite.
2. **On-chain trade-credit score** — Kajota's engine scores the SME from
   its order + repayment history and anchors a verifiable commitment
   on-chain; a Band-A SME unlocks a 90% advance.
3. **Smart-contract letter of credit** — the debtor's repayment lands in
   escrow and auto-splits: the financier recovers principal + fee, the
   SME keeps the residual. The debtor can only pay the agreed way.

## 3. The three track deliverables → contracts

| Deliverable | Contract | Status |
|---|---|---|
| Tokenized receivables | `ReceivableRegistry.sol` | new; 26 tests |
| Smart-contract letter of credit | `CosellEscrow.sol` | reused (live on Sepolia + Mantle); conditional release, dispute + arbiter, 14-day self-refund |
| On-chain trade-credit scoring | `ScoreAttestation.sol` + `scoring.py` | new; 14 + 13 tests |
| Shipment/doc verification (bonus) | `CosellShipmentVerifier.sol` | reused; Chainlink Functions auto-release |

**87 Solidity tests + 13 Python tests, all passing.**

## 4. Architecture

```
 SME (mobile)                Kajota Coach skill (FastAPI)         Polygon Amoy
 ───────────                 ───────────────────────────         ────────────
 raise invoice ───────────►  POST /credit/score                  ScoreAttestation
                              • scoring.py (rules engine)  ─────► attest(hash,score,band)
                              • anchors keccak(payload)
 register receivable ─────►  MeshClient  ──────────────────────► ReceivableRegistry
 financier funds  ────────►  MeshClient  ──────────────────────► CosellEscrow (LoC)
 debtor repays ───────────►  confirmReceipt ────────────────────► auto-split USDC
```

- **Scoring engine** ([`scoring.py`](./kajota_mesh_skill/scoring.py)):
  deterministic, explainable, no ML. Five weighted factors →
  0–1000 score, band A–E, recommended advance rate, per-factor reasons.
- **Privacy:** only a keccak hash of the scoring payload is anchored —
  raw financials never touch chain. A financier verifies a shown score
  against chain via `ScoreAttestation.verifyPayload`.
- **Reuse:** the co-sell escrow is already a letter-of-credit engine, so
  the LoC deliverable is proven code, not a prototype.

## 5. Credit scoring model

| Factor | Weight | Signal |
|---|---|---|
| Repayment record | 400 | on-chain repaid vs defaulted (thin-file baseline 200) |
| Trade tenure | 150 | months active (full at 24) |
| Trade volume | 200 | lifetime GMV, log-scaled (full at $50k) |
| Order fulfilment | 150 | completed orders (full at 100) |
| Conduct | 100 | disputes (−25 each) |

Deterministic: same inputs → same score → same anchored hash. Example
SME (18 mo, $35k GMV, 6/6 repaid) → **910/1000, Band A, 90% advance**.

## 6. Economics (worked example)

$5.00 invoice, Band-A supplier, 90% advance:

- **Supplier:** $4.50 up-front + $0.25 residual = **$4.75 net** (a 5%
  discount for early cash).
- **Financier:** lays out $4.50, recovers $4.75 = **$0.25 fee** (~5.6%
  on a short-dated advance).
- **Debtor:** pays the **$5.00** owed, into escrow that can only route it
  the agreed way.

## 7. Business model

- **Take rate** on each financing (a slice of the financier's discount).
- **Scoring-as-a-service** — the on-chain score is a portable credential
  other lenders can consume via `ScoreAttestation`.
- **Network effect:** every repaid invoice sharpens the SME's on-chain
  score, widening access and tightening pricing over time.

## 8. What's live

- **Local end-to-end demo** (no wallet/faucet): `pnpm demo:trade-finance`
  runs the full lifecycle on-chain with balance invariants asserted.
  See [`DEMO.md`](./DEMO.md).
- **Polygon Amoy deployment:**

  | Contract | Address | Status |
  |---|---|---|
  | MockUSDC | [`0x6F0EaF79…78f4d`](https://amoy.polygonscan.com/address/0x6F0EaF790309e05C550bD7bbdB36ADF6db978f4d) | ✅ live + verified functional |
  | CosellRegistry | [`0x33A1029d…02DA7e`](https://amoy.polygonscan.com/address/0x33A1029d5E43E0A4eb1E9397881390D28f02DA7e) | ✅ live + verified functional |
  | CosellEscrow | `<pending POL top-up>` | ⏳ |
  | ReceivableRegistry | `<pending POL top-up>` | ⏳ `deploy:amoy:new` |
  | ScoreAttestation | `<pending POL top-up>` | ⏳ `deploy:amoy:new` |

  Deployer `0x682A3a435B139C4A3E4D0b1C1d7ae89a4f3cF9f6` ·
  chainId 80002 · explorer https://amoy.polygonscan.com

## 9. Roadmap

- **Now:** contracts on Amoy, scoring service, end-to-end demo.
- **Next:** wire the scorer to live Kajota Mongo order history (the
  Concierge agent already has it); financier marketplace UI in the
  Kajota mobile app; controller → escrow event automation.
- **Later:** mainnet Polygon + real Circle USDC; secondary market for
  tokenized receivables; multi-lender syndication.

## 10. Repos

- Contracts: `kajota-mesh` @ `hackathon/ignyte-polygon`
- Scoring service + demo: `kajota-coach` @ `hackathon/ignyte`
