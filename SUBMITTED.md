# NEAR HACKATHON — submission receipt

**Submitted:** 2026-11-13T18:09:14Z (via `nearhackathon.com/#apply` form, Chrome)
**Server response:** `✓ SUBMISSION RECEIVED — You're on the radar!`
**Results announced:** 2026-11-18 · 23:59 UTC

## What went in (verbatim form state at submit click)

| Field | Value |
|---|---|
| Project name | Shield · Mesh · Coach |
| Team lead | Oluwabori |
| Email | oluwaboriife@gmail.com |
| Team size | 1 — Solo builder |
| Tracks | Autonomous Business · AI Security & Defense · Agent Economy |
| NEAR wallet address | `greatmoth7535.near` |
| Repository link | https://github.com/KaJota-inc/kajota-coach |
| Demo post link | https://x.com/Oluwabori6/status/2121260489992798300 |
| What did you build? | 1973-char body — see `SUBMISSION_IDEA_FIELD.md` |
| Consent | ✓ checked |

## What must stay up until 2026-11-18 23:59 UTC

- `github.com/KaJota-inc/kajota-coach` — **public**, replay-384 harness and SDK PR files reachable
- `x.com/Oluwabori6/status/2121260489992798300` — the demo post with the 4.5MB real-voice MP4
- `greatmoth7535.near` — wallet retained (prize sent here if the project wins)

## Remediation path if a field is wrong

Form footer provides a `Request changes` link. One submission per project; that link is the only edit path.

## Stretch items

### ✅ Gate #3 anchor — upstream contribution on `near/intents`

- **Comment posted:** https://github.com/near/intents/issues/385#issuecomment-6861182741
- **Author:** `@KaJota-inc` (org account, same as the repo link above)
- **Posted:** 2026-11-13T18:14:28Z — 5 minutes after submission
- **Content:** verbatim replacement block for the BTC-deposit-refund timelock table, with the live on-chain `unsafe_refund_timelock_sec = 3153600000` values (re-verified via mainnet RPC 2026-11-13T18:10Z — unchanged from the Nov 2 draft)
- **Issue state at posting:** open, 0 prior comments

### ✅ Gate #4 anchor — capability add via SDK PR

- **PR opened:** https://github.com/defuse-protocol/one-click-sdk-typescript/pull/23
- **Fork:** `KaJota-inc/one-click-sdk-typescript`, branch `feat/verify-destination`
- **Content:** `verifyIntentDestination(status, nearRpcUrl)` — the post-signature destination verifier `Shield · Mesh · Coach` is built on, packaged as a reusable SDK helper
- **Diff:** `+529 -1` across 4 files (`src/verify-destination.ts`, `src/__tests__/verify-destination.test.ts`, `examples/verify-destination.ts`, `src/main.ts` re-exports)
- **CI gates passed locally:** `pnpm test` → 15/15 (10 existing + 5 new), `pnpm run build` → ESM + CJS + DTS all built with `verifyIntentDestination` in `dist/index.d.ts`
- **Honest finding disclosed in PR body:** live mainnet replay against the two `#384` tx hashes returns `OK` because the public RPC can no longer serve them (`NOT_OBSERVED` — tx is archival-only now). PR body asks reviewer whether `null`-on-RPC-failure should be split into a third `INCONCLUSIVE` verdict.
- **#384 state at posting:** OPEN, 4 comments, updated 2026-10-21 — bug class is live upstream
