# Kajota Coach + Mesh — 7-Tier Advancement Roadmap

> **Status:** Living document. Specs are drafted ahead of build to keep
> hackathon submissions defensible (we ship what we said we'd ship) and
> to make the project picker-uppable by a future contributor without
> losing context.
>
> **Last updated:** 2026-06-08, immediately after the first successful
> end-to-end `CosellRegistry.register()` on Ethereum Sepolia
> ([tx](https://sepolia.etherscan.io/tx/0x9e25902a348b3ee6c7beb87da495037ffbc2c3fe695ee8aeae2759911eae127d)).

## TL;DR

Kajota today: a mobile app that drafts a co-sell listing from a photo
(Coach v1), plus an agentic version that does the same multi-turn (Coach
Agent v2), with on-chain commitment via `CosellRegistry.register()` on
Ethereum Sepolia. Everything we just proved works.

What's missing for real-world deployment is **trust → settlement →
accessibility**:

- Listings are on-chain, but the **money that resolves the deal isn't**.
  CosellEscrow + CosellShipmentVerifier exist as contracts but aren't
  wired into the user flow.
- The wallet UX is "fund this 0x address with 0.003 Sepolia ETH" —
  unusable for anyone who isn't already a crypto native.
- The Coach Agent only speaks/reads text — locks out non-literate users
  who are the **explicit target audience** in our own marketing copy.
- We have no platform moat: leave Kajota, lose nothing. Reputation
  doesn't follow users.

The seven tiers below close those gaps. They're ordered by **dependency
graph + impact**, not by difficulty. Each is independently shippable so
the project can absorb scope cuts without breaking the demo path.

## The seven tiers at a glance

| Tier | What it does | Why it matters | Lines of code (est) |
| --- | --- | --- | --- |
| [1 — Close the Mesh loop](./tier-1-mesh-loop.md) | Wire CosellEscrow + ShipmentVerifier into the mobile flow. Buyer pays → escrow holds → courier API confirms delivery via Chainlink Functions → commission auto-splits. | Today Mesh stops at "the agreement exists." Tier 1 makes the agreement **enforceable**. | ~600 mobile + ~150 contracts |
| [2 — Invisible wallet](./tier-2-invisible-wallet.md) | ERC-4337 account abstraction with paymaster + Yellow Card/Transak fiat ramp. User pays in NGN, never sees "gas". | The "fund this 0x with Sepolia ETH" wall is the #1 adoption killer. Tier 2 removes it. | ~400 mobile + paymaster contract |
| [3 — On-chain reputation](./tier-3-reputation.md) | Soulbound reputation NFT minted per (wholesaler, coseller) pair. Successful register → ship → deliver → settle cycles accrue score. Surface in agent before commit. | Trust is the single biggest barrier in informal commerce. Reputation = network moat. | ~250 contracts + ~200 mobile |
| [4 — Voice-first multilingual](./tier-4-voice-first.md) | Gemini Live API speech I/O in Yoruba / Igbo / Hausa / Pidgin. Coach Agent becomes accessible to non-literate sellers. | The marketing line "especially relevant for non-text-literate sellers" becomes true. | ~300 mobile + ~200 backend |
| [5 — WhatsApp Business integration](./tier-5-whatsapp.md) | Coach pushes listings directly to user's WhatsApp Business catalog. Customer inquiries route through agent. Payment links auto-arm escrow. | African informal commerce runs on WhatsApp. Meet sellers where they are. | ~500 backend + Meta API setup |
| [6 — Pricing oracle + demand intelligence](./tier-6-intelligence.md) | Aggregate competitor scraping + FX feeds + Google Trends. Push notifications on demand surges. Suggested prices that beat gut. | Sellers undercut themselves by 15-30% versus actual market. Tier 6 closes the gap. | ~400 backend + Mongo schema |
| [7 — Multi-chain / cross-border](./tier-7-multichain.md) | Move Mesh from Sepolia → Mantle (or Base) for low fees. LI.FI for cross-chain stablecoin swaps so Nigerian wholesaler ↔ Kenyan co-seller works as one tap. | Africa-to-Africa trade is bottlenecked by FX and banking. Unblocks $300B of latent commerce. | ~200 contracts redeploy + ~300 mobile |

## Sequencing — what to build when

The dependency graph is **not strictly linear**, but some tiers
prerequisite others. The recommended order (by hackathon target):

```
NOW ──────────────────────────────────────────────────────────────────►
│
├─ Jun 11 (Google Cloud Rapid Agent submission)
│   └── Tier 4: Voice-first multilingual
│       Standalone. No dependencies. Ships entirely in Coach Agent v2.
│
├─ Jun 15 (Mantle Turing Test Phase 2 submission)
│   └── Tier 1: Close the Mesh loop
│       Depends on: Tier 2 *recommended* (escrow without invisible
│       wallet still works but UX is harder to demo).
│       Standalone-shippable on Sepolia for the submission video; move
│       to Mantle as part of Tier 7.
│
├─ Q3 2026 (AWS Activate Web3 + general production-readiness)
│   ├── Tier 2: Invisible wallet
│   │   Depends on: Privy dashboard config + paymaster contract deploy.
│   ├── Tier 3: On-chain reputation
│   │   Depends on: Tier 1 (need settled escrows to score on).
│   └── Tier 7: Multi-chain (partial — move to Mantle main + Base)
│       Depends on: Tier 1 (contracts must be settled first).
│
└─ ETHGlobal NY 2026 finale
    ├── Tier 5: WhatsApp Business
    │   Depends on: Tier 2 (so payment links work end-to-end).
    └── Tier 6: Pricing oracle + demand intelligence
        Standalone — independent backend service.
```

Each tier doc says explicitly what it depends on, what depends on it,
and what slips if the upstream tier is incomplete.

## Hackathon mapping

| Hackathon | Deadline | Tier(s) in scope | Demo asset |
| --- | --- | --- | --- |
| **Google Cloud Rapid Agent** | 2026-06-11 | Tier 4 (voice) | 90-sec video of Coach Agent taking a voice prompt in Yoruba, calling tools, replying in Yoruba. |
| **Mantle Turing Test Phase 2** | 2026-06-15 | Tier 1 (escrow loop) + Tier 4 (voice if Rapid Agent landed) | End-to-end: voice → listing → escrow deposit → simulated courier confirms → commission split. Recorded as a single take. |
| **AWS Activate Web3** | Q3 2026 (rolling) | Tier 2 (invisible wallet) + Tier 3 (reputation) | Onboarding flow + reputation-aware listing suggestion. |
| **ETHGlobal NY 2026** | 2026-11 (estimated) | Tier 5 (WhatsApp), Tier 6 (intelligence), Tier 7 (cross-border) | Lagos seller + Nairobi co-seller transact via WhatsApp; settlement clears across two chains in ≤30 sec. |

## Carry-over from this session's debugging

While shipping the first register() tx, we accumulated three patches in
the mobile that are **prerequisites for any of the tiers below** and
should land in commits before any tier work starts:

1. **`MeshSignScreen.tsx`: explicit `wallets.create()` call** — Privy
   doesn't auto-provision the embedded wallet without a dashboard
   toggle; the `useEffect` we added handles it client-side. *Either land
   the dashboard toggle and rip out the useEffect, or commit the
   useEffect as a defensive client-side fallback. Pick one — current
   state has both.*
2. **`MeshSignScreen.tsx`: static `gas: toHex(400_000)`** — Privy's
   gateway under-estimates gas (returns revert-path gas) and the
   provider doesn't auto-fill `gasLimit`. The 400k cap is generous;
   actual register() empirically uses 229,471. *Keep this until Tier 2
   replaces the manual signing flow with a paymaster.*
3. **`CoachAgentService.java`: `@Value` placeholders read
   `${app.ai.gemini.hack.api-key}`** — Already pushed to `back-to-go`
   (commit `608f522`). The deeper refactor (delegate to the
   `geminiService` bean instead of building URL inline) is tracked as a
   separate task chip.

## Reading order

If you're a contributor picking this up cold:

1. **Read this README end-to-end** (5 min).
2. **Pick the tier you're working on** — each tier doc is
   self-contained.
3. **Inside the tier doc, look at the "Files to touch" section first** —
   that tells you the blast radius before you start.
4. **Then read "Acceptance criteria"** — that tells you when to stop.

Specs use ⚠️ for known-unknowns and 🚧 for things that need a real
spike before committing to scope.

## License + scope guarantees

Every tier respects the existing project constraints:

- **No breaking changes** to the public `/ai/coach/agent/chat` REST
  contract without a deprecation cycle (the mobile app's bundle
  predates each backend deploy).
- **No persistent CI changes** for one-shot work (we learned tonight
  that auto-arming the Render deploy step inside `sync-render-env.yml`
  was the wrong choice — keep deploys in `ci-cd.yml`).
- **No commits that mix scope** — each tier ships as a discrete branch
  + PR.
- **No secret values in code, env files, or chat output** — see
  `docs/architecture.md` for the credential-rotation policy.
