# Kajota Trade — Ignyte submission (paste-ready)

Copy each field into the Ignyte form. Two things to fill before you submit:
`<YOUR YOUTUBE LINK>` and every `[FILL: …]` (real Kajota numbers — don't leave brackets in).

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
On-chain invoice financing for the UAE–Africa trade corridor: micro-SMEs turn an unpaid cross-border invoice into instant working capital in USDC on Polygon, underwritten by a verifiable on-chain trade-credit score — built for DIFC's regulated stablecoin rails.
```

## Problem + target market
```
The UAE moves over $50B in annual remittances, and stablecoins already make up 51.3% of its crypto activity — with the world's first comprehensive stablecoin regulation now live. Behind those flows are real trade relationships: African micro-SMEs importing, sourcing and reselling goods, who wait 30–60 days to get paid while rent, restock and payroll don't. Traditional invoice financing is closed to them — no audited statements, no credit-bureau file, no collateral a bank recognises.

The capital to fund them exists (diaspora savings, remittance-adjacent liquidity, DIFC-based lenders, stablecoin treasuries). The missing piece is a way to underwrite a thin-file SME and move the money trustlessly. Kajota already runs the commerce layer for these sellers — listings, orders, wallet, settlement — so we hold the one thing a lender can't get: a real, continuous trade history. DIFC's regulatory clarity + Polygon's low-cost USDC rails are the launchpad to turn that history into cross-border SME credit.

Target market: African micro-merchants trading into and out of the UAE/GCC corridor.
```

## Solution
```
Kajota Trade adds three on-chain primitives on top of Kajota's live Mesh contracts, wired into one flow on Polygon:

1. Tokenized receivable — the SME registers its unpaid invoice as an on-chain asset a financier can underwrite (ReceivableRegistry).
2. On-chain trade-credit score — a deterministic engine scores the SME from its order + repayment history and anchors a verifiable hash on-chain; a Band-A SME unlocks a 90% advance (ScoreAttestation). Only the hash is stored — raw financials never touch chain — and the score turns an invisible seller into a scored, repayment-tracked counterparty a lender can actually price.
3. Smart-contract letter of credit — the debtor's repayment lands in escrow and auto-splits: the financier recovers principal + fee, the SME keeps the residual. The debtor can only pay the agreed way (CosellEscrow).

Why DIFC + Polygon: DIFC's live stablecoin regulation makes it viable to move real USDC for cross-border SME credit; Polygon makes settlement cheap and fast enough to finance a $500 invoice — the ticket sizes traditional trade finance ignores.
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

## Traction
```
Kajota today: [FILL: # active micro-sellers] active sellers · $[FILL: lifetime GMV] processed · [FILL: waitlist count] on the waitlist (waitlist.kajota.io).
[FILL: any pilot LOI, partner financier, or corridor partner — delete this line if none yet.]
```

## Liquidity — where the money comes from
```
Financiers = diaspora capital, remittance-adjacent liquidity, DIFC-based lenders, and stablecoin treasuries. The on-chain trade-credit score is what makes underwriting these SMEs possible for the first time. As repayments accrue on-chain, each SME's score sharpens — unlocking larger advances and more lenders (syndication). This is scoring-as-a-service: the score is a portable credential any lender can consume via ScoreAttestation.
```

## Revenue model + scalability
```
- Take rate on each financing (a slice of the financier's discount).
- Scoring-as-a-service — the on-chain score is a portable credential other lenders consume via ScoreAttestation.
- Network effect: every repaid invoice sharpens the SME's on-chain score, widening access and tightening pricing over time. One corridor's repayment data compounds into an underwriting moat.
```

## Roadmap / GTM
```
Now: contracts + scoring + live interactive app on Polygon Amoy, with a real on-chain attestation.
Next (DIFC pilot): one UAE–Africa corridor (e.g. UAE–Nigeria) — wire scoring to live Kajota order history, onboard a pilot financier, run real USDC advances on Polygon mainnet within DIFC's regulated environment.
Later: multi-corridor expansion, a secondary market for tokenized receivables, and multi-lender syndication off the shared on-chain score.
```

## Team
```
Oluwabori Ola (GitHub: bori7) — fintech background, building Kajota: commerce & payments infrastructure for African micro-merchants (waitlist.kajota.io). Kajota already runs listings, orders, wallet and settlement for thousands of micro-sellers; Kajota Trade extends that into cross-border on-chain trade finance.
[FILL: co-founders / advisors / DIFC- or trade-finance-relevant credibility, if any.]
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
- [ ] Every `[FILL: …]` replaced with real numbers (or the line deleted) — no brackets left
- [ ] YouTube link pasted into both `<YOUR YOUTUBE LINK>` spots
- [ ] Web-app URL opens in a fresh/incognito window (still public)
- [ ] One entry only — review, then submit
