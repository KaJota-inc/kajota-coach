# `near/intents#385` — paste-ready upstream contribution

Playbook gate #3 anchor: an upstream contribution to a sponsor project, posted during the build window, visible on deadline day.

## Why this is a COMMENT, not a PR

The brief asked for a "docs-fix upstream PR" against `near/intents#385`. On investigation (2026-10-24, re-verified 2026-11-02), the docs source for `docs.near-intents.org` is NOT in a public repo we can PR against. Specifically:

- `https://docs.near-intents.org` headers show `server: Vercel` and `x-mintlify-client-version: 0.0.4044` — hosted on Mintlify, which commonly syncs from a private repo.
- The affected page itself has no "Edit this page" link, no visible GitHub source link, no `.mdx` source URL exposed.
- `defuse-protocol/gitbook-docs` (the former docs source) was last updated 2026-05-20 and does **not** contain the current BTC-deposit-refund page.
- `near/intents` has a `/docs` path on its `docs-publish-test` branch, but that serves `near.github.io/intents/`, a different site from `docs.near-intents.org`.

So "a docs PR" has no public target. The upstream contribution lands as a **comment on the open issue with the exact replacement block**, which is public, verifiable, and gives maintainers a plug-and-play diff when a PR target does appear. If a maintainer responds asking for a PR against a specific repo, we file it then — but we do not block gate #3 on an invitation that may not come.

**Issue #385 state (verified 2026-11-02):** `open`, 0 comments, last updated 2026-10-19, filed by `@Anirudh-712`, no labels, no `closed_at`. Not stale, not duplicated, not resolved. The target is current.

## File + line to change

Target page: [`https://docs.near-intents.org/integration/bridging/btc-deposit-refund`](https://docs.near-intents.org/integration/bridging/btc-deposit-refund)

Target section: the "Timelock" table in Step 2 of the "Refund a stuck BTC deposit" flow.

Target page's live text (quoted verbatim, confirmed via WebFetch 2026-10-24):

```
| Timelock | Condition |
| - | - |
| 2 days | `refund_address` was provided in the original deposit |
| 14 days | `refund_address` was **not** provided in the original deposit |
| Instant | The caller holds the DAO or `RefundOperator` role on the connector |
```

## Before/after

### Before (current live state)

| Timelock | Condition |
| --- | --- |
| 2 days | `refund_address` was provided in the original deposit |
| **14 days** | `refund_address` was **not** provided in the original deposit |
| Instant | The caller holds the DAO or `RefundOperator` role on the connector |

### After (proposed)

| Timelock | Condition |
| --- | --- |
| 2 days | `refund_address` was provided in the original deposit (`refund_timelock_sec = 172800`) |
| **100 years** (since 2026-10-16) | `refund_address` was **not** provided in the original deposit (`unsafe_refund_timelock_sec = 3153600000`, set by DAO proposal 322 on `rainbowbridge.sputnik-dao.near`). In practice only the DAO or a `RefundOperator` can execute the refund within a human lifetime. The 2 NEAR `request_refund` fee is non-refundable, so if your deposit named no refund address, contact support before calling `request_refund`. |
| Instant | The caller holds the DAO or `RefundOperator` role on the connector |

**Additional change** — a one-paragraph insert BEFORE Step 1 of the "Refund a stuck BTC deposit" procedure:

> **If your deposit named no refund address, do not call `request_refund` yet.** The on-chain lock is currently `unsafe_refund_timelock_sec = 3153600000` (100 years). The 2 NEAR `request_refund` fee is non-refundable, and after it is paid only the DAO or a `RefundOperator` can call `execute_refund`. Contact support in Discord first.

## Rationale

The 14-day row is false on the current mainnet. `get_config` on `btc-connector.bridge.near` returns `unsafe_refund_timelock_sec: 3153600000` (100 years), set by DAO proposal 322 on `rainbowbridge.sputnik-dao.near` on 2026-10-16. The old value was `1209600` (14 days). The 2-day row (`refund_timelock_sec: 172800`) is unchanged and still accurate.

A user who follows the current docs with no refund address will pay 2 NEAR for `request_refund` (non-refundable per `required_balance_for_request_refund`) and then wait what is effectively forever for a path only the DAO can trigger. The fix is a verbatim text replacement — no code change, no re-build, no coordinator approval beyond the maintainer who owns the Mintlify sync.

Source verification (user runs this before posting the comment, to confirm nothing has moved):

```bash
near view btc-connector.bridge.near get_config '{}'
```

Expect `unsafe_refund_timelock_sec` to still be `3153600000` and `refund_timelock_sec` to still be `172800`. If either has changed, update the proposed replacement block before posting.

## Paste-ready comment body

The copy between the next `---` delimiters is the comment to post on `near/intents#385`. Verbatim, no edits. Target channel: comment on the issue itself, from the user's `@bori7` GitHub account.

---

A verbatim replacement block for the timelock table on https://docs.near-intents.org/integration/bridging/btc-deposit-refund to resolve this issue, based on `get_config` on `btc-connector.bridge.near` at the time of writing:

| Timelock | Condition |
| --- | --- |
| 2 days | `refund_address` was provided in the original deposit (`refund_timelock_sec = 172800`) |
| **100 years** (since 2026-10-16) | `refund_address` was **not** provided in the original deposit (`unsafe_refund_timelock_sec = 3153600000`, set by DAO proposal 322 on `rainbowbridge.sputnik-dao.near`). In practice only the DAO or a `RefundOperator` can execute the refund within a human lifetime. |
| Instant | The caller holds the DAO or `RefundOperator` role on the connector |

Suggested additional change before step 1 of the "Refund a stuck BTC deposit" procedure:

> **If your deposit named no refund address, do not call `request_refund` yet.** The on-chain lock is currently `unsafe_refund_timelock_sec = 3153600000` (100 years). The 2 NEAR `request_refund` fee is non-refundable, and after it is paid only the DAO or a `RefundOperator` can call `execute_refund`. Contact support in Discord first.

Happy to open a PR against whichever repo currently hosts docs.near-intents.org — the live site is Mintlify-served and I could not find the source repo publicly. (I checked defuse-protocol/gitbook-docs, near/intents/docs on docs-publish-test, and the near-one org repos.)

(Context: shipping an agent-side destination verifier for NEAR HACKATHON, 2026-11-01 to 2026-11-14. Reading the docs carefully is part of the pitch. Fixes #385.)

---

Character count of the comment body: measured below. GitHub's comment field has a 65,536-char limit so there is no cap concern.

```bash
python3 -c "import sys; t=open('UPSTREAM_PR_DRAFT.md').read(); e=t.split('\n---\n')[1].strip(); print(len(e))"
```

## About the `Fixes #385` footer

The brief asked for a `Fixes #385` footer. GitHub's `Fixes`/`Closes`/`Resolves` keywords only auto-close an issue when they appear in a **PR description** that merges into the default branch. In a plain issue comment they are a label, not a trigger — the issue stays open until a maintainer closes it.

Kept the `Fixes #385` text at the end of the comment body anyway because:
1. It signals intent to a human reader.
2. If a maintainer later converts this content into a PR (against whatever private repo hosts the docs), the footer transfers cleanly.
3. It costs nothing.

## Pre-post checklist

- [ ] User runs `near view btc-connector.bridge.near get_config '{}'` and confirms `unsafe_refund_timelock_sec` is still `3153600000` and `refund_timelock_sec` is still `172800`. If either value changed, edit the comment body before posting.
- [ ] User verifies issue #385 is still open and has 0-few comments (another contributor may have posted the same fix in the time since this draft). If a maintainer or peer already fixed it, SKIP the post and record the resolver in UPSTREAM_PR.md under "What landed first."
- [ ] User posts the comment from their own GitHub account (`@bori7`).
- [ ] Record the comment URL in SUBMISSION.md's rubric table under gate #3 and in UPSTREAM_PR.md's TODO section.

## Target: by 2026-11-04

Three days from the Nov 2 kickoff. Leaves 3 days of maintainer response window before the Nov 7 halfway mark. The stretch SDK PR against `defuse-protocol/one-click-sdk-typescript` ships separately after this (see UPSTREAM_PR.md § Stretch).

## If #385 is closed before posting

If, between the time of this draft and the time of posting, issue #385 has been closed (whether by a maintainer's fix or by a duplicate PR landing elsewhere), **DO NOT POST**. Instead:
- Record which commit/PR closed it and under which repo.
- Shift the gate #3 anchor entirely to the stretch SDK PR against `defuse-protocol/one-click-sdk-typescript`.
- Update SUBMISSION.md's rubric table to point at the SDK PR URL instead of the #385 comment URL.

The gate still fires if we ship the SDK PR — just without the comment to cite.
