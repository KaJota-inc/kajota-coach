# Kajota Trade — Ignyte × Polygon Smart Commerce Challenge

**Track:** SME Trade Finance
**Chain:** Polygon PoS (Amoy testnet)
**One line:** On-chain invoice financing for the UAE–Africa trade
corridor — micro-SMEs turn an unpaid cross-border invoice into instant
working capital in USDC on Polygon, underwritten by a verifiable
on-chain trade-credit score, built for DIFC's regulated stablecoin rails.

---

## 1. The problem

The UAE moves over **$50B in annual remittances**, and stablecoins
already make up **51.3% of its crypto activity** — with the world's
first comprehensive stablecoin regulation now live. Behind those flows
are real trade relationships: African micro-SMEs importing, sourcing and
reselling goods, who wait 30–60 days to get paid while rent, restock and
payroll don't. Traditional invoice financing is closed to them — no
audited statements, no credit-bureau file, no collateral a bank
recognises. Globally, **$2 trillion in trade finance goes unfilled**
and **40% of SME applications are rejected**; letters of credit still
take **7–10 days of manual processing** — at Jebel Ali's 15M+ TEUs a
year, that friction compounds.

The capital to fund them exists (diaspora savings, remittance-adjacent
liquidity, DIFC-based lenders, stablecoin treasuries). The missing piece
is a way to **underwrite a thin-file SME** and move the money
trustlessly. Kajota already runs the commerce layer for these sellers
(listings, orders, wallet, settlement), so we hold the one thing a
lender can't get anywhere else: **a real, continuous trade history**.
DIFC's regulatory clarity + Polygon's low-cost USDC rails are the
launchpad to turn that history into cross-border SME credit.

**Target market:** African micro-merchants trading into and out of the
UAE/GCC corridor.

**Traction:** [FILL: # active sellers] active sellers · $[FILL: GMV]
processed · [FILL: waitlist] on the waitlist (waitlist.kajota.io).
[FILL: pilot LOI / partner financier — delete if none yet.]

## 2. The solution

Kajota Trade adds three on-chain primitives on top of Kajota's live Mesh
contracts, wired into one flow:

1. **Tokenized receivable** — the SME registers its unpaid invoice as an
   on-chain asset a financier can underwrite.
2. **On-chain trade-credit score** — Kajota's engine scores the SME from
   its order + repayment history and anchors a verifiable commitment
   on-chain; a Band-A SME unlocks a 90% advance. The score turns an
   invisible seller into a scored, repayment-tracked counterparty a
   lender can actually price.
3. **Smart-contract letter of credit** — the debtor's repayment lands in
   escrow and auto-splits: the financier recovers principal + fee, the
   SME keeps the residual. The debtor can only pay the agreed way.

**Why DIFC + Polygon:** DIFC's live stablecoin regulation makes it
viable to move real USDC for cross-border SME credit; Polygon makes
settlement cheap and fast enough to finance a $500 invoice — the ticket
sizes traditional trade finance ignores.

## 3. The three track deliverables → contracts

**The track asked for exactly three things — tokenized receivables,
smart-contract letters of credit, and on-chain trade-credit scoring on
Polygon. We built and deployed all three, live on Amoy with a real
on-chain attestation.**

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

## 7. Liquidity & business model

**Where the money comes from:** financiers are diaspora capital,
remittance-adjacent liquidity, DIFC-based lenders, and stablecoin
treasuries. The on-chain trade-credit score is what makes underwriting
these SMEs possible for the first time; as repayments accrue on-chain,
each score sharpens — unlocking larger advances and more lenders
(syndication off the shared, portable score).

- **Take rate** on each financing (a slice of the financier's discount).
- **Scoring-as-a-service** — the on-chain score is a portable credential
  other lenders can consume via `ScoreAttestation`.
- **Network effect:** every repaid invoice sharpens the SME's on-chain
  score, widening access and tightening pricing over time.

## 8. What's live

- **Live interactive web app:** [https://ignyte-9jyi9cbex-kajotadev-1226s-projects.vercel.app](https://ignyte-9jyi9cbex-kajotadev-1226s-projects.vercel.app)
  — move the sliders to score an SME, and watch the page read the real
  on-chain attestation from Polygon Amoy (verify on PolygonScan).

- **Local end-to-end demo** (no wallet/faucet): `pnpm demo:trade-finance`
  runs the full lifecycle on-chain with balance invariants asserted.
  See [`DEMO.md`](./DEMO.md).
- **Polygon Amoy deployment:**

  | Contract | Address | Status |
  |---|---|---|
  | **ReceivableRegistry** (new) | [`0xa0BD67C3…638F8e`](https://amoy.polygonscan.com/address/0xa0BD67C32B357406ab1ceACFBa3f942463638F8e) | ✅ live on Amoy |
  | **ScoreAttestation** (new) | [`0x2eC77B54…04F1cd`](https://amoy.polygonscan.com/address/0x2eC77B54bdF7C2360f0B6Af22c0978Cd5B04F1cd) | ✅ live on Amoy |
  | MockUSDC | [`0x6F0EaF79…78f4d`](https://amoy.polygonscan.com/address/0x6F0EaF790309e05C550bD7bbdB36ADF6db978f4d) | ✅ live + verified functional |
  | CosellRegistry | [`0x33A1029d…02DA7e`](https://amoy.polygonscan.com/address/0x33A1029d5E43E0A4eb1E9397881390D28f02DA7e) | ✅ live + verified functional |
  | CosellEscrow (LoC) | live on Sepolia + Mantle | reused — see §3 |

  Deployer / attester `0x682A3a435B139C4A3E4D0b1C1d7ae89a4f3cF9f6` ·
  chainId 80002 · explorer https://amoy.polygonscan.com

  **Live proof — on-chain trade-credit score anchored on Polygon:**
  tx [`0x77a07d9e…c2984`](https://amoy.polygonscan.com/tx/0x77a07d9e8de9f85caf235445a4fcac40fce5cb0ad370e535afb7367c770c2984)
  — `ScoreAttestation.attest` wrote a 910/Band-A score for a demo SME
  (block 41860842); `verifyPayload` returns true against the off-chain
  payload. The scoring service anchors here via
  `MESH_SCORE_ATTESTATION_ADDRESS=0x2eC77B54bdF7C2360f0B6Af22c0978Cd5B04F1cd`.

## 9. Roadmap

- **Now:** contracts + scoring + live interactive app on Polygon Amoy,
  with a real on-chain attestation.
- **Next (DIFC pilot):** one **UAE–Africa corridor** (e.g. UAE–Nigeria)
  — wire the scorer to live Kajota order history (the Concierge agent
  already has it), onboard a pilot financier, and run **real USDC
  advances on Polygon mainnet** within DIFC's regulated environment.
- **Later:** multi-corridor expansion, a secondary market for tokenized
  receivables, and multi-lender syndication off the shared on-chain score.

## 10. Repos

- Contracts: `kajota-mesh` @ `hackathon/ignyte-polygon`
- Scoring service + demo: `kajota-coach` @ `hackathon/ignyte`
