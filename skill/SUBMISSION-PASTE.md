# Kajota Trade — Ignyte submission (paste-ready)

Copy each field into the Ignyte submission form. The only placeholder is
`<YOUR YOUTUBE LINK>` — paste it after uploading the demo video.

---

## Project name
```
Kajota Trade
```

## Track
```
SME Trade Finance
```

## One-liner
```
An invoice-financing rail that turns an African micro-SME's unpaid invoice into working capital today — creditworthiness scored and anchored on-chain, repayment settled through a smart-contract letter of credit, all in USDC on Polygon.
```

## Problem + target market
```
A micro-SME sells $5,000 of goods on 30-day terms, then waits a month to get paid while rent, restock and payroll don't wait. Traditional invoice financing is closed to informal SMEs: no audited statements, no credit-bureau file, no bank-recognised collateral.

Target market: African micro-merchants. Kajota already runs the commerce layer for thousands of them (listings, orders, wallet, payments) — giving us the one thing a lender can't get elsewhere: a real, continuous trade history to turn into on-chain credit.
```

## Solution
```
Kajota Trade adds three on-chain primitives on top of Kajota's live Mesh contracts, wired into one flow on Polygon:

1. Tokenized receivable — the SME registers its unpaid invoice as an on-chain asset a financier can underwrite (ReceivableRegistry).
2. On-chain trade-credit score — a deterministic engine scores the SME from its order + repayment history and anchors a verifiable hash on-chain; a Band-A SME unlocks a 90% advance (ScoreAttestation). Raw financials never touch chain.
3. Smart-contract letter of credit — the debtor's repayment lands in escrow and auto-splits: the financier recovers principal + fee, the SME keeps the residual. The debtor can only pay the agreed way (CosellEscrow).
```

## Technical architecture (on Polygon)
```
Solidity (Hardhat 3 + Viem, 87 tests) deployed to Polygon Amoy (chainId 80002):
- ReceivableRegistry — 0xa0BD67C32B357406ab1ceACFBa3f942463638F8e
- ScoreAttestation   — 0x2eC77B54bdF7C2360f0B6Af22c0978Cd5B04F1cd
- MockUSDC           — 0x6F0EaF790309e05C550bD7bbdB36ADF6db978f4d
- CosellRegistry     — 0x33A1029d5E43E0A4eb1E9397881390D28f02DA7e
- CosellEscrow (letter of credit) — reused, live on Ethereum Sepolia + Mantle Sepolia

Scoring service: a deterministic rules engine (FastAPI, 13 tests) → POST /credit/score computes the score and anchors its hash on ScoreAttestation.

Live on-chain proof (Polygon Amoy): a 910/Band-A credit score anchored on-chain —
tx 0x77a07d9e8de9f85caf235445a4fcac40fce5cb0ad370e535afb7367c770c2984 (verifyPayload = true).
```

## Revenue model + scalability
```
- Take rate on each financing (a slice of the financier's discount).
- Scoring-as-a-service — the on-chain score is a portable credential other lenders consume via ScoreAttestation.
- Network effect: every repaid invoice sharpens the SME's on-chain score, widening access and tightening pricing over time.
```

## Roadmap / GTM
```
Now: contracts live on Polygon Amoy, scoring service, interactive web app, end-to-end demo.
Next: wire the scorer to live Kajota Mongo order history; financier marketplace UI in the Kajota app; controller → escrow event automation.
Later: mainnet Polygon + real Circle USDC; secondary market for tokenized receivables; multi-lender syndication.
```

## Team
```
Oluwabori Ola (GitHub: bori7) — fintech background, building Kajota: commerce & payments infrastructure for African micro-merchants (waitlist.kajota.io). Kajota already runs listings, orders, wallet and settlement for thousands of micro-sellers; Kajota Trade extends that into on-chain trade finance.
```

## MVP / Prototype
```
- Live interactive web app (score an SME, watch it verify against the on-chain attestation): https://ignyte-9jyi9cbex-kajotadev-1226s-projects.vercel.app
- Contracts live on Polygon Amoy (addresses above) with a real on-chain credit-score attestation as proof.
- Full lifecycle runs end-to-end: score → tokenize → finance → escrow repayment → settle, with balance invariants asserted.
- 87 Solidity tests + 13 Python tests, all passing.
- Demo video: <YOUR YOUTUBE LINK>
```

## Links

| Field | Value |
|---|---|
| Live web app | https://ignyte-9jyi9cbex-kajotadev-1226s-projects.vercel.app |
| Demo video | `<YOUR YOUTUBE LINK>` |
| Contracts repo | https://github.com/KaJota-inc/kajota-mesh/tree/hackathon/ignyte-polygon |
| Scoring service + demo repo | https://github.com/KaJota-inc/kajota-coach/tree/hackathon/ignyte |
| On-chain proof tx | https://amoy.polygonscan.com/tx/0x77a07d9e8de9f85caf235445a4fcac40fce5cb0ad370e535afb7367c770c2984 |
| ScoreAttestation | https://amoy.polygonscan.com/address/0x2eC77B54bdF7C2360f0B6Af22c0978Cd5B04F1cd |
| Website | https://waitlist.kajota.io |

---

## Before the one-shot Submit
- [ ] YouTube link pasted into both `<YOUR YOUTUBE LINK>` spots
- [ ] Web-app URL opens in a fresh/incognito window (still public)
- [ ] One entry only — review, then submit
