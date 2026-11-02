# Upstream PR scope — playbook gate #3

Target: at least one upstream contribution **merged** by the halfway point of the hackathon, **2026-11-07** (5 days from today). This is non-negotiable per `[[hackathon_winning_playbook]]` gate #3 and the KeeperHub teardown — a PR open on deadline day scores zero.

## Finding that forces a scope pivot from the SCOUT_MEMO

The memo defaulted to a one-line docs fix for `near/intents#385`. On investigation (2026-11-02 session), **the docs source for `docs.near-intents.org` is not in a public repo we can PR against.** Verified via:

- `https://docs.near-intents.org` headers return `server: Vercel`, `x-mintlify-client-version: 0.0.4044` — hosted on Mintlify, which commonly syncs from a private repo.
- The page itself has no "Edit this page" link.
- `defuse-protocol/gitbook-docs` (the former docs source) was last updated 2026-05-20 (6 months stale) and does **not** contain the current BTC-deposit-refund page.
- `near/intents` repo has a `/docs` path on `docs-publish-test` branch, but that serves `near.github.io/intents/`, a different site from `docs.near-intents.org`.

So "a docs PR" has no public target. The upstream contribution has to land somewhere else.

## Chosen scope

User chose **stretch** on 2026-11-02 — ship both.

**Primary — ship by 2026-11-04 (3 days):** post a correction comment on `near/intents#385` with the exact replacement block for the BTC-deposit-refund docs. Not a PR, but an upstream contribution that is public, verifiable, and reads as "we read the chain, we read the docs, we filed the delta." If a maintainer later asks for a PR, we have the diff ready.

**Stretch — ship by 2026-11-07 (5 days):** a surgical PR on `defuse-protocol/one-click-sdk-typescript` adding a `verifyIntentDestination(status, expectedRecipient, nearRpcUrl)` helper that reads the on-chain `receiver_id` from each entry in `status.swapDetails.nearTxHashes` and raises if any diverges from `status.quoteResponse.quoteRequest.recipient`. Maps directly to `near/intents#384` and is capability-add, not correctness-fix (playbook gate #4). The repo was last merged `2026-09-22` by `emochka2007`; it is active enough to review a tight PR.

Both land before the halfway mark. If the primary comment prompts a maintainer to invite a doc PR, we file it then — but we do not wait for that invitation.

---

## Primary: comment on `near/intents#385`

### Target

[github.com/near/intents/issues/385](https://github.com/near/intents/issues/385) — *"Docs: 'Refund a stuck BTC deposit' says 14 days without a refund address; the BTC connector's lock is 100 years since 16 Oct"*

### Why this issue over #384

- #384 is a routing bug — fixing it requires solver-side changes that we cannot ship from outside. Writing a comment that proposes a solver fix without being on the solver team reads as noise, not help.
- #383 is also a solver-side issue (confidential swap pipeline).
- **#385 is a documentation defect** — the docs page says 14 days, but a DAO proposal changed the on-chain lock to 100 years on 2026-10-16. The fix is a verbatim text replacement. Outside contributors can usefully propose the exact replacement block.

### Comment body (paste-ready)

```
A verbatim replacement block for the timelock table on
https://docs.near-intents.org/integration/bridging/btc-deposit-refund
to resolve this issue, based on `get_config` on
`btc-connector.bridge.near` at the time of writing:

| Timelock | Condition |
| - | - |
| 2 days | `refund_address` was provided in the original deposit (`refund_timelock_sec = 172800`) |
| **100 years** (since 2026-10-16) | `refund_address` was **not** provided in the original deposit (`unsafe_refund_timelock_sec = 3153600000`, set by [DAO proposal 322 on `rainbowbridge.sputnik-dao.near`](https://nearblocks.io/address/rainbowbridge.sputnik-dao.near)). In practice only the DAO or a `RefundOperator` can execute the refund within a human lifetime. If your deposit named no refund address, contact support before calling `request_refund` — the 2 NEAR fee for `request_refund` is not returned. |
| Instant | The caller holds the DAO or `RefundOperator` role on the connector |

Suggested additional change to step 1 of the "Refund a stuck BTC deposit"
page (before `request_refund` is first mentioned):

> **If your deposit named no refund address, do not call `request_refund` yet.** The timelock is currently set to `unsafe_refund_timelock_sec = 3153600000` (100 years). The 2 NEAR `request_refund` fee is non-refundable, and after it is paid only the DAO or a `RefundOperator` can call `execute_refund`. Contact support in Discord first.

Happy to open a PR against whichever repo currently hosts
docs.near-intents.org — the live site is Mintlify-served and I could not
find the source repo publicly. (I checked defuse-protocol/gitbook-docs,
near/intents/docs on docs-publish-test, and the near-one org repos.)

(Context: shipping an agent-side destination verifier for NEAR HACKATHON,
2026-11-01 to 2026-11-14. Reading the docs carefully is part of the pitch.)
```

Length: 229 words of body + the table. Reads like help, not promotion. The last paragraph discloses the hackathon context in one line, so maintainers aren't surprised when the submission references this comment.

### Verification before posting

- Re-check `get_config` on `btc-connector.bridge.near` right before posting to confirm the values haven't changed again.
- Re-verify DAO proposal 322 on `rainbowbridge.sputnik-dao.near` is still the authoritative source.
- Both via `near view btc-connector.bridge.near get_config '{}'` from a wallet that has `near-cli` installed (user drives).

### Posting mechanics

- The user posts from their own GitHub account (`bori7`) — this is a public contribution, so attribution is theirs.
- Record the comment URL in `SUBMISSION.md`'s rubric table under gate #3.
- Watch for maintainer response for 48h. If a maintainer invites a PR, draft against whichever repo they name.

---

## Stretch: `defuse-protocol/one-click-sdk-typescript` PR

### Target

[github.com/defuse-protocol/one-click-sdk-typescript](https://github.com/defuse-protocol/one-click-sdk-typescript) — the TypeScript SDK for the 1Click API that `near/intents#384` is about. ISC licensed, has 5 open issues and 3 open PRs, last merge 2026-09-22.

### Scope (confirmed against SDK source 2026-11-02)

Real types in `src/models/`:

- `GetExecutionStatusResponse` carries `status: enum { SUCCESS | REFUNDED | ... }`, `quoteResponse: QuoteResponse` (which echoes the original `QuoteRequest.recipient`), and `swapDetails: SwapDetails`.
- `SwapDetails` carries `nearTxHashes: Array<string>`, `intentHashes: Array<string>`, `originChainTxHashes` and `destinationChainTxHashes` as `Array<TransactionDetails>`, and the `refundedAmount` / `refundReason` fields (both empty when `status === SUCCESS`).
- `QuoteRequest` carries `recipient: string` + `recipientType: enum { DESTINATION_CHAIN | CONFIDENTIAL_INTENTS | INTENTS }` + optional `virtualChainRecipient` and `customRecipientMsg`. In the #384 case, `recipient` is the account `b45e...605c6` and `recipientType` is `CONFIDENTIAL_INTENTS`.

Add a single helper `verifyIntentDestination(status, nearRpcUrl)`:

1. Takes a `GetExecutionStatusResponse` (so the quoted recipient is already attached via `status.quoteResponse.quoteRequest.recipient`) and a NEAR RPC URL.
2. For each hash in `status.swapDetails.nearTxHashes`, calls `tx` or `EXPERIMENTAL_tx_status` on the RPC, walks the `receipts_outcome` → finds the `FunctionCall` on `intents.near` → parses the args to extract the signed-transfer intent's `receiver_id`.
3. Compares each extracted `receiver_id` to `status.quoteResponse.quoteRequest.recipient` (or `virtualChainRecipient` when `recipientType === VIRTUAL_CHAIN`).
4. Returns `{ok: true, verified: number}` if every hash's `receiver_id` matched, else `{ok: false, quoted: string, mismatched: Array<{txHash, actual}>, reason: 'DESTINATION_MISMATCH'}`.

The signature `verifyIntentDestination(status, nearRpcUrl)` is tighter than the memo's earlier `(status, expectedRecipient)` — the status response already carries the quoted recipient, so a caller cannot accidentally pass a mismatched expected.

Capability-add per playbook gate #4: *"X could not do Y at all; now it can."* X = the one-click SDK, Y = catch `#384`-style post-sign destination mismatch.

### PR body (draft)

```markdown
# Add `verifyIntentDestination(status, expectedRecipient)` — post-signature destination check

## Motivation

`near/intents#384` reports confidential swaps misrouting user deposits to
a solver-routed sink account while `/v0/status` returns `SUCCESS`:

- Tx `3djtQ3pUHv8SGtNKS3CMGice7E7S9oeS4DJzNYyjCUVD` — quoted recipient `b45e...`, actual `receiver_id: 51e8f94d...`, API status `SUCCESS`.
- Tx `jNeJZQ4pa4p69LBiEvTDbTj2WmhCgiKRY2a2scA193j` — same sink, same pattern.
- The sink `51e8f94d...de7cbe` holds `~0.0673 ETH` of `nep141:hood.omft.near`, more than the two reported deposits — ongoing.

SDK consumers currently have no way to catch this before continuing the
flow. OutLayer-style pre-sign policies cannot — the signature is valid.
The only check possible is **post-sign, on-chain** against the quoted recipient.

## What this adds

A single helper that reads the on-chain `receiver_id` back from
`status.swapDetails.nearTxHashes` and compares it against
`status.quoteResponse.quoteRequest.recipient`:

```ts
import { GetExecutionStatusResponse } from '../models/GetExecutionStatusResponse';

export type VerifyDestinationResult =
  | { ok: true; verified: number }
  | {
      ok: false;
      quoted: string;
      mismatched: Array<{ txHash: string; actual: string }>;
      reason: 'DESTINATION_MISMATCH';
    };

export async function verifyIntentDestination(
  status: GetExecutionStatusResponse,
  nearRpcUrl: string,
): Promise<VerifyDestinationResult> { /* ... */ }
```

Zero behavior change to existing code paths — purely additive. Opt-in: callers choose when to run it (after `getStatus`, before enqueueing the next swap, before trusting a `SUCCESS` for accounting).

## Example

See `examples/verify-destination.ts`. Runs the two tx hashes from #384 through the helper against the quoted recipients and prints the mismatch each time.

## Not addressed by this PR

- The underlying solver routing bug — that is `near/intents#384`'s own fix, not this SDK's.
- Confidential swap execution reliability — see `near/intents#383`.

Fixes #384 (at the SDK consumer layer only).
```

### Risk

- A PR filed by an unknown author gets reviewed by whoever is on-call for the SDK that week. Merge pace is good for small fixes (#21 merged same-day on 2026-09-22) but one PR has sat for a year (#4 TEE-based PDS validation from 2025-12). Risk of not merging by Nov 7 is real.
- The `nep141:hood.omft.near` signed-transfer intent format is specific to confidential swaps on the NEAR Intents verifier. The helper must handle at least the public (`DESTINATION_CHAIN`) and confidential (`CONFIDENTIAL_INTENTS`) recipient types; parsing the `FunctionCall` args for each is slightly different.

### Fallback if the PR stalls

Publish the helper as a standalone npm package (`@kajota/near-intents-destination-check`) and reference it in the submission. Not a merged upstream PR, but a shippable artifact that reads as *"we fixed it anyway."* Downgrade from gate #3 ✓ to gate #3 ~ — same shape as the KeeperHub entry's loss, so this is a known-bad fallback, acceptable only if the PR explicitly 403s or is explicitly refused by a maintainer. Not acceptable as a "we gave up" fallback.

**Nigeria eligibility — accepted risk, not a gate.** Per user call (2026-11-02), we are not asking NEAR Discord about Nigerian payout eligibility. The HACKATHON.md is silent on geography; the common hackathon OFAC-exclusion list (Iran / Syria / N.Korea / Russia / Crimea / Belarus / Quebec / Italy / Brazil, per `[[hackathon-winning-playbook]]` red-flag #7) does not include Nigeria. The residual risk is post-win: if Mesh places and NEAR Foundation declines payout citing an off-page sanctions rule, that is a resolution-via-DM path with Illia, not a submission blocker. No build hours are gated on this.

---

## Playbook ties

- Gate #3 requires a merged upstream PR; a comment is a hedge. The user is already carrying three fires — a hedge is honest here, not weak.
- Gate #4 (capability not correctness) only lands if the SDK PR ships. The comment alone is a correctness fix on docs.
- The KeeperHub teardown's "raid the maintainers' backlog" lesson applies — `near/intents` has 17 open issues; next session should scan them for one with a clear scope ≤ 1 day that we have not already touched.

## TODO this session

- [x] User reviews this scope and picks default vs stretch. **Picked stretch 2026-11-02.**
- [x] Read `one-click-sdk-typescript` source for real field names. **Done 2026-11-02, see "Scope (confirmed against SDK source 2026-11-02)" above.**
- [ ] User posts the #385 comment from their GitHub account. Record URL here: `_____`
- [ ] User (or next session) forks `defuse-protocol/one-click-sdk-typescript`, drops in `src/verify-destination.ts` + `src/__tests__/verify-destination.test.ts` + `examples/verify-destination.ts`, runs the two #384 tx hashes through it as the real-world integration test, opens the PR.
- [ ] Record SDK PR URL here: `_____`

## TODO next session

- [ ] Watch the #385 comment thread for 48h; if a maintainer invites a docs PR, draft it against whichever repo they name.
- [ ] Watch the SDK PR for 48h; if the on-call reviewer asks for scope changes, tighten and re-push same-day.
- [ ] If Nov 7 arrives and the SDK PR is unmerged but reviewed, record what the reviewer asked for — the submission's "What we got wrong first" section (gate #7) wants a real post-mortem on the first PR shape.
