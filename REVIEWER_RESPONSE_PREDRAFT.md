# Reviewer response pre-draft — PR #23

Pre-drafts for the two most-likely reviewer directions on [defuse-protocol/one-click-sdk-typescript#23](https://github.com/defuse-protocol/one-click-sdk-typescript/pull/23). Each is paste-ready: a short reply (no defensiveness, no re-arguing the premise) and, where it applies, a concrete diff you can commit to the same branch.

The scenarios are ranked by likelihood from the PR body's 4 open questions. Use the one that matches whatever the reviewer actually asks; skip the others.

---

## Scenario A — "split into a third `INCONCLUSIVE` verdict" (most likely)

### Trigger phrases from the reviewer

> *"The `null`-on-RPC-failure collapsing with `ok: true` is a footgun. Can we distinguish them?"*
> *"Callers need to know `could not verify` vs `verified clean`."*
> *"Return a third state instead of `ok: true` when no tx was readable."*

### Reply (paste-ready)

> Agreed — collapsing "could not verify" with "verified clean" is wrong for an agent-halting check. New verdict shape, keeping the two existing branches unchanged so callers that narrow on `ok` still compile:
>
> ```ts
> export type VerifyDestinationResult =
>     | { ok: true; verified: number }
>     | { ok: false; quoted: string; mismatched: DestinationMismatch[]; reason: 'DESTINATION_MISMATCH' }
>     | { ok: false; reason: 'INCONCLUSIVE'; unreachable: string[] };
> ```
>
> `unreachable[]` carries the tx hashes we couldn't resolve (RPC error, NOT_OBSERVED, no `execute_intents` on the verifier). `ok: false` either way, so a caller that halts on `!verdict.ok` halts in both; a caller that wants to distinguish reads `verdict.reason`.
>
> Pushed as a second commit to the same branch so the first commit's history stays legible.

### Diff sketch (commit + push separately after reviewer agrees)

```diff
 export type VerifyDestinationResult =
     | { ok: true; verified: number }
     | {
           ok: false;
           quoted: string;
           mismatched: DestinationMismatch[];
           reason: 'DESTINATION_MISMATCH';
-      };
+      }
+    | {
+          ok: false;
+          reason: 'INCONCLUSIVE';
+          unreachable: string[];
+      };
```

And in the loop body, track which tx hashes returned `null` from `readIntentReceiverId`:

```diff
     const mismatched: DestinationMismatch[] = [];
+    const unreachable: string[] = [];

     for (const txHash of txHashes) {
         const actual = await readIntentReceiverId(
             txHash,
             INTENTS_VERIFIER_ACCOUNT,
             nearRpcUrl,
             fetchFn,
         );
-        if (actual !== null && actual !== expected) {
+        if (actual === null) {
+            unreachable.push(txHash);
+        } else if (actual !== expected) {
             mismatched.push({ txHash, actual });
         }
     }

+    if (unreachable.length > 0 && mismatched.length === 0) {
+        return { ok: false, reason: 'INCONCLUSIVE', unreachable };
+    }
+
     if (mismatched.length === 0) {
         return { ok: true, verified: txHashes.length };
     }
```

Plus two new fixture tests: one with a tx that `readIntentReceiverId` returns `null` for alongside a matching one (expect `INCONCLUSIVE`), one with the `#384` pattern alongside an unreachable tx (expect `DESTINATION_MISMATCH` — mismatch beats inconclusive). Same test file, follows existing pattern.

Then update the example to split the three outcomes in its console output so the "OK" line stops meaning two different things.

---

## Scenario B — "also handle `MtWithdraw` / `FtWithdraw`"

### Trigger phrases

> *"What about NEP-245 / NEP-141 withdrawals? Those misroute the same way."*
> *"Scope should be any intent that touches `receiver_id`, not just `Transfer`."*

### Reply (paste-ready)

> Fair — `Transfer` was just the one `#384` exposed. Scope pivot in a follow-up PR against this branch (keeps this PR reviewable in one pass):
>
> - Parser gains two more `intents[]` kinds: `FtWithdraw` (`receiver_id`) and `MtWithdraw` (`receiver_id`).
> - `NativeWithdraw` has a `receiver_id` too; include it for completeness.
> - `IntentTransfer`, `IntentFtWithdraw`, `IntentMtWithdraw`, `IntentNativeWithdraw` are already declared in `src/models/` so the type imports exist.
> - Each kind extends the fixture test matrix with a matching pass + a mismatch.
>
> Prefer to land the `Transfer` version first (it's the one with a real open issue behind it) and ship the withdrawal kinds as PR #2 so you have two small reviews instead of one big one. Say the word and I'll push the follow-up branch.

---

## Scenario C — "we'll pass on this" (least likely but possible)

### Trigger phrases

> *"This belongs in a consumer library, not in the SDK."*
> *"We'd rather fix #384 on the solver side than add a check."*
> *"Closing — nack."*

### Reply (paste-ready)

> Understood — makes sense; the solver-side fix is the right long-run answer. For agents running today against unpatched solvers, I'll publish the three files as `@kajota/near-intents-destination-check` so the escape hatch is reachable until #384 lands. Any objection to me referencing `defuse-protocol/one-click-sdk-typescript` in that package's README as the eventual home?

Then close your own branch locally, publish the npm package, and update the NEAR HACKATHON submission post (via "Request changes") to cite the published package instead of PR #23.

---

## Scenario D — "LGTM"

### Reply (paste-ready)

> Thanks for the review. Standing by on the follow-ups for `MtWithdraw` / `FtWithdraw` and the `INCONCLUSIVE` verdict — happy to do either as separate PRs if useful.

No code work needed.

---

## Non-response scenarios (silence on both sides)

If the PR is still untouched by **2026-11-17 18:00 UTC** (T-30h to judging):

- Do NOT bump the PR thread. Maintainer silence after a 4-day window on a stale-ish repo (last push 2026-09-22) is signal, not an oversight.
- Do add one line to the submission's "idea" field via "Request changes" that reads: *"SDK PR #23 open on `defuse-protocol/one-click-sdk-typescript` — opened 2026-11-13, awaiting review. Capability shipped regardless as [the npm package name once published]."*
- The judging score for gate #4 (capability add) is "we shipped the artifact publicly," not "reviewer gave green." A PR open at judging time still scores, provided the code runs — which is what the `pnpm test` + `pnpm run build` evidence in the PR body proves.

## Pre-posting checklist (before you hit "Comment" on whichever scenario applies)

- [ ] Re-read the actual reviewer comment to confirm which scenario it is. Don't paste A if they asked B.
- [ ] Replace `[the npm package name once published]` placeholder in Scenario C before posting.
- [ ] If pasting Scenario A's diff: push the second commit BEFORE the reply, so the reviewer clicks "Files changed" and the diff is already there. "Pushed as a second commit" has to be true, not a promise.
- [ ] If pasting Scenario B: have the follow-up branch ready to push on their "say the word" — don't promise and then take a day.
- [ ] If pasting Scenario C: have the npm package name reserved first. `npm search @kajota/near-intents-destination-check` should return empty, then publish within the hour.
