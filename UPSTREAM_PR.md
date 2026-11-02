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

**Primary — ship by 2026-11-04 (3 days):** post a correction comment on `near/intents#385` with the exact replacement block for the BTC-deposit-refund docs. Not a PR, but an upstream contribution that is public, verifiable, and reads as "we read the chain, we read the docs, we filed the delta." If a maintainer later asks for a PR, we have the diff ready.

**Stretch — ship by 2026-11-07 (5 days):** a surgical PR on `defuse-protocol/one-click-sdk-typescript` adding a `verifyIntentDestination(statusResponse, expectedRecipient)` helper that reads the on-chain `receiver_id` from the returned tx hash and raises if it differs from the quote's `recipient`. This maps directly to `near/intents#384` and is capability-add, not correctness-fix (playbook gate #4). The repo was last merged on `2026-09-22` by `emochka2007`; it is active enough to review a tight PR.

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

### Scope

Add a single helper `verifyIntentDestination(status, expectedRecipient)` that:

1. Takes a parsed `/v0/status` response and the `recipient` from the original quote.
2. For each tx hash in the status response's `txs` array (or whatever the field is named — needs verification against the current SDK), fetches the NEAR tx via the SDK's existing RPC helper.
3. Walks the actions, finds the signed-transfer intent, extracts `receiver_id`.
4. Returns `{ok: true}` if `receiver_id === expectedRecipient`, else `{ok: false, quoted: expectedRecipient, actual: receiver_id, reason: "DESTINATION_MISMATCH"}`.

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

A single helper that reads the on-chain `receiver_id` back from the tx
hashes `/v0/status` returned, and compares it against the quote's `recipient`:

```ts
export async function verifyIntentDestination(
  status: StatusResponse,
  expectedRecipient: string,
): Promise<
  | { ok: true }
  | { ok: false; quoted: string; actual: string; reason: 'DESTINATION_MISMATCH' }
> { /* ... */ }
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

- The SDK may already structure the status response differently than I'm assuming. The PR body needs tightening after a 1-hour read of the SDK source. Open question for the user: is this worth the ~3-day commitment, or do we stop at the comment?
- A PR filed by an unknown author gets reviewed by whoever is on-call for the SDK that week. Merge pace on this repo is good for small fixes but PRs have sat for a year (`#4` TEE-based PDS validation from 2025-12). Risk of not merging by day 7 is real.

### Decision point for user

- **Default (safe):** ship the primary comment on #385 only. Satisfies gate #3's spirit if a maintainer acknowledges it, but is not a merged PR.
- **Stretch (ambitious):** ship the primary comment AND the SDK PR. Costs ~3 days of focus. Pays off only if the PR merges by Nov 7.
- **Fallback (if SDK PR stalls):** publish the helper as a standalone npm package (`@kajota/near-intents-destination-check`) and reference it in the submission. Not a merged upstream PR, but it is a shippable artifact that reads as "we fixed it anyway." Downgrade from gate #3 ✓ to gate #3 ~, same as the KeeperHub entry's loss.

**Recommendation:** default to the comment this week. Open the SDK PR only if (a) PayPal AI's Nov 12 ship is on track and (b) Dubai Phase 0 verify is green on Nov 3. If either is red, drop the SDK PR scope and ship the comment only.

**Nigeria eligibility — accepted risk, not a gate.** Per user call (2026-11-02), we are not asking NEAR Discord about Nigerian payout eligibility. The HACKATHON.md is silent on geography; the common hackathon OFAC-exclusion list (Iran / Syria / N.Korea / Russia / Crimea / Belarus / Quebec / Italy / Brazil, per `[[hackathon-winning-playbook]]` red-flag #7) does not include Nigeria. The residual risk is post-win: if Mesh places and NEAR Foundation declines payout citing an off-page sanctions rule, that is a resolution-via-DM path with Illia, not a submission blocker. No build hours are gated on this.

---

## Playbook ties

- Gate #3 requires a merged upstream PR; a comment is a hedge. The user is already carrying three fires — a hedge is honest here, not weak.
- Gate #4 (capability not correctness) only lands if the SDK PR ships. The comment alone is a correctness fix on docs.
- The KeeperHub teardown's "raid the maintainers' backlog" lesson applies — `near/intents` has 17 open issues; next session should scan them for one with a clear scope ≤ 1 day that we have not already touched.

## TODO this session

- [ ] User reviews this scope and picks default vs stretch.
- [ ] If default: user posts the #385 comment from their GitHub account. Record URL here.
- [ ] If stretch: open PR scope expands to include SDK PR; add timeline to this file.

## TODO next session

- [ ] Watch the comment thread for 48h.
- [ ] If maintainer invites a docs PR, draft it against whichever repo they name.
- [ ] If going stretch, read `one-click-sdk-typescript` source for 1h and tighten the PR body.
