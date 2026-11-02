# `idea` field extract for the submission form

HACKATHON.md § Submission API, verbatim: *"idea | string | 20-2000 characters"* and *"What they built (20-2000 characters): the problem, the product, and how NEAR fits in."*

**Hard cap:** 2000 characters. Over = 400 BadRequest, field listed in `fields` of the response. Target: ~1,900 for headroom and to match playbook gate #5 (bursar won 3rd with 1,903 chars; the next winner at 2,330 would be refused here).

**Do not** paste any Markdown header characters (`#`, `**`) if the form strips them to literal text — see `[[feedback-submission-form-rules-first]]` on the DoraHacks rich-text mangling. The submission is a plain-string body, so Markdown should render through, but check once in the preview before confirming. If it displays literal, strip the asterisks before resending (same `requestId`).

**One-liner at the top is identical to SUBMISSION.md's and MESH_RECUT_X_POST.md's Variant A opening** — same words, same emphasis — so the three artifacts tell one story to a judge who skims any one of them.

---

## The extract (ready to paste as `idea`)

Everything below the next `---` through the `---` after it is the paste-exact copy. Character count is in a comment at the bottom.

---

**Shield · Mesh · Coach** — post-signature destination verification that catches what pre-sign policy misses. Named against **near/intents#384** (open, filed 2026-10-18): confidential swaps return `status: SUCCESS` while real ETH lands in a solver-routed sink account.

On-chain receipts cited in the issue: NEAR txs `3djtQ3pU...jCUVD` and `jNeJZQ4...A193j`. Quoted recipients `b45e...605c6` and `201178...9af97`; actual `51e8f94d...de7cbe`. The sink holds ~0.0673 ETH of `nep141:hood.omft.near` and growing. API said success. Money went to the wrong account.

OutLayer (listed partner) runs the pre-signature policy — caps, whitelist, kill switch, TEE attestation on NEAR MPC. All fire before the signature. None would catch #384: the signature is valid; the solver's post-sign routing is where it goes wrong.

Shield reads the on-chain `receiver_id` back from `status.swapDetails.nearTxHashes`, compares to `status.quoteResponse.quoteRequest.recipient`, halts the agent on divergence. Fires after OutLayer approves, not instead of it.

Three primitives, composed:
- **Shield**: FHE spend mandate + kill switch + new post-sign verifier
- **Mesh**: N-party atomic escrow (17 contracts live on Arbitrum Sepolia + Robinhood Chain testnet; 8 settlement cycles; 36 on-chain txs)
- **Coach**: agent orchestration + two new NEAR tools (`callNearIntents`, `verifyIntentDestination`)

Flow: Coach → NEAR Intents (cross-chain execution) → Mesh N-party split → Shield verifies each leg → NEAR Intents on-chain transfer. Chain Signatures sign cross-chain; Function Call Keys scope Shield's `emergencyFreeze` without root key; Sub-Accounts partition per-agent spend; NEP-141 is the asset class we gate.

Try it: clone the repo, run `make replay-384`. The two #384 tx hashes replay against Shield; the verifier returns `MISMATCH(quoted=b45e..., actual=51e8f94d...)`; the agent halts before the second signature.

Built at NEAR HACKATHON. Live Mesh settlements at kajota-mesh.vercel.app.

---

<!-- Character count: 1973 (trimmed, measured 2026-11-02 via python3). Under the 2000-char cap by 27. In the playbook's "winners run 1,903 to 2,330" band. -->

## Verification before paste

Run from this worktree to confirm the extract is under 2,000 chars:

```bash
awk '/^---$/{c++;next} c==1' SUBMISSION_IDEA_FIELD.md | awk 'NR>1 && !/^<!--/' | wc -c
```

Or, more carefully, isolate the text between the two `---` markers in a scratch file and `wc -c` it. Trim trailing whitespace before counting; the server counts bytes, so emojis count more than one. There are no emojis in this draft — safe to count as chars.

**Current count: 1,973 characters** (confirmed 2026-11-02 by the python3 one-liner above; re-verify before submission in case this file has been edited since).

If the count is over 2,000: trim the "Three primitives, composed" bullet list first (drop the parentheticals), then the "Try it" paragraph (drop the exact MISMATCH example), then the opening sink detail (drop the balance). Preserve the one-liner, the #384 citation, and the OutLayer composition framing at all costs — those are the gate #2 and gate #4 anchors.

## Edge cases this draft handles

- **No emojis** — safe for forms that count bytes rather than characters.
- **No AI-voice references** — HACKATHON.md is silent on AI voice; the X post is real-voice regardless; the `idea` field is text and does not touch this.
- **One architecture arrow** — matches playbook writeup-craft rule ("ONE architecture diagram (its absence is a scored gap)"). The arrow line is the diagram in text form.
- **Named primitives verbatim**: NEAR Intents, Chain Signatures, Function Call Keys, Sub-Accounts, NEP-141, OutLayer, TEE Attestation — Zama S3 addendum rule applied.
- **No "will do", "plan to", "roadmap"** — says what shipped, not what we promise. Gate #5 anti-pattern avoided.
- **No "serves all of Africa" charity framing** — none appears. Lagos-based solo-builder framing kept out of this field; it belongs in the repo README if anywhere, not here.
- **Does NOT include**: BLI, PayPal, Dubai, Mesh Singapore history. The field is for THIS submission; adjacent-project context in a 2k budget dilutes the HOST-defect anchor.

## What is NOT in the extract but IS in the repo README

Per playbook gate #7 ("disclose own bugs"), the repo README should carry a "What we got wrong first" section. That is a repo-README artifact, not an `idea`-field one. Candidates for that section (notes for next session's README pass):

- The initial `verifyIntentDestination(status, expectedRecipient)` signature in SCOUT_MEMO.md asked the caller for the expected recipient; realized against SDK source that `status` already carries it. Signature tightened to `(status, nearRpcUrl)` in UPSTREAM_PR.md after a 10-minute source read.
- Original scout memo defaulted to a docs PR against `near/intents#385`; discovered the Mintlify docs source is private and pivoted to a comment-on-issue + SDK capability PR split.
- Original demo plan held the Mesh re-cut until Nov 9 for Promising Products deconfliction; user call reversed to start-now because a one-week hedge against a low-probability perception risk cost more than it bought.

Three real pivots, each with what caught it. Lands as the "what we got wrong first" section in the README, not here.

## When to send

Send the full submission payload only when:
- Repo is public (projectUrl verifies 200 before send).
- Demo post is up (demoUrl verifies 200 before send).
- Shield replay against #384 actually works end-to-end locally (if a judge runs `make replay-384` from a cold clone, it must halt — this is the only line the extract claims that is runnable).

If any of the three isn't verified, the submission is not ready. Fix the gap, then send with the same `requestId` the HACKATHON.md procedure specifies.
