# Recording lock

**Lock timestamp:** `2026-11-12T23:59:00Z` (T-48h before NEAR submission deadline)

**Submission deadline:** `2026-11-14T23:59:00Z`

**Today:** 2026-11-09 (3 days + 23h 59m to the lock; 5 days to the submission)

---

## Why T-48h, not T-24h

The playbook's demo-video-craft section says *"submit ~5 days early on multi-week events / leave 2–3 hrs on short ones."* This hackathon is 2 weeks (Nov 1 → Nov 14) — in the playbook's "multi-week" bracket, which earns a 48h buffer. The buffer absorbs:

- Processing time on X's native video upload (varies; can take an hour for a 1920×1080 MP4)
- Any final `make replay-384-fixture` smoke test on a cold clone that surfaces a drop-in bug
- A one-cycle `pnpm test` on the SDK PR fork if a reviewer asks for a last change
- Browser reCAPTCHA / sign-in flakiness on the submission form (per `[[feedback-submission-form-rules-first]]` the DoraHacks form had non-obvious last-step blockers; the nearhackathon.com form is simpler but the pattern holds)
- The user's own sleep / time-zone considerations — Lagos is UTC+1; Nov 14 23:59 UTC = Nov 15 00:59 WAT, so a clean Nov 12 23:59 UTC lock means Nov 13 and Nov 14 are full work days in WAT

## What "locked" means

After `2026-11-12T23:59:00Z`, the following are **frozen**:

- **The demo video MP4** — no more re-cuts, no more voiceover re-takes, no more caption passes
- **The `idea` field body** in `SUBMISSION_IDEA_FIELD.md` — character count stays at 1,973
- **The `projectName` + `tracks` + `size`** fields in `SUBMISSION_PACKET.md` — no last-minute track reshuffling
- **The submission repo's `main` branch** — no more commits to what gets submitted. The repo can accept non-submission commits (e.g. a follow-up README polish on a side branch) but nothing on the branch the `projectUrl` points at
- **`replay-384.ts`** — no more parser refinements once locked, even if live-mainnet mode is still INDETERMINATE. The Makefile aliases `replay-384` → fixture mode at the lock if live doesn't work

## What's NOT locked after T-48h

- **The X post itself** can still be published after the lock (Nov 13 target). The *content* of the post is locked at T-48h; the *publish moment* is Nov 13 planning.
- **The NEAR Discord presence** — the user can reply to any thread referencing our submission between lock and submit, same as any normal community engagement.
- **The `near/intents#385` comment thread** — if a maintainer replies and asks for a PR, the user can open the PR after lock. The submission's gate-#3 anchor already fires on the posted comment.
- **The SDK PR review loop** on `defuse-protocol/one-click-sdk-typescript` — if a reviewer asks for a small change, push it. That doesn't touch the submission repo.

## Deadline math

| Checkpoint | UTC | WAT (Lagos, UTC+1) | Days from now |
|---|---|---|---|
| Today | 2026-11-09 09:35 | 2026-11-09 10:35 | — |
| NEAR account created (user action step 1) | 2026-11-11 23:59 | 2026-11-12 00:59 | 2d 14h |
| `#385` comment posted (step 2) | 2026-11-10 23:59 | 2026-11-11 00:59 | 1d 14h |
| SDK PR opened (step 3) | 2026-11-11 23:59 | 2026-11-12 00:59 | 2d 14h |
| VO recording delivered (step 4) | 2026-11-11 23:59 | 2026-11-12 00:59 | 2d 14h |
| **RECORDING LOCK** (step 5) | **2026-11-12 23:59** | **2026-11-13 00:59** | **3d 14h** |
| X post published (step 6) | 2026-11-13 15:00 | 2026-11-13 16:00 | 4d 5h |
| Repo made public (step 7) | 2026-11-13 23:59 | 2026-11-14 00:59 | 4d 14h |
| **SUBMISSION DEADLINE** (step 8) | **2026-11-14 23:59** | **2026-11-15 00:59** | **5d 14h** |

## What happens if the lock slips

If VO recording isn't delivered by 2026-11-11 23:59 UTC:

1. Push the lock to **2026-11-13 12:00 UTC** at the latest (T-36h). Any later and the X post timing + repo-public window compress dangerously.
2. If recording slips past T-36h, switch to the **screenshots-only fallback** from `MESH_RECUT_X_POST.md` § Variant C. 6 annotated screenshots, published on Nov 13 or Nov 14. HACKATHON.md explicitly allows this: *"the demo video or screenshots attached."*
3. If both recording and screenshot capture slip past 2026-11-14 00:00 UTC, the submission is in **recovery mode** — screenshot the current `kajota-mesh.vercel.app` live counter + the Shield verifier terminal output and submit with those. Placing probability drops sharply but the submission is in.

## The hard boundary

**Under no circumstances POST the submission after 2026-11-14 23:59 UTC.** The API returns 403 outside the window per HACKATHON.md § Submission API. A 403 after 23:59 UTC is not a retry situation; it is a disqualification.

The user's own safety margin: aim to POST by **2026-11-14 20:00 UTC** (4h buffer) so any 413 / 400 / 503 can be fixed and resent without the deadline landing on a retry.

## Who locks

The user locks. This file is a planning doc, not an enforcement mechanism — the lock is a norm the user keeps themselves to. If the user wants to extend past 2026-11-12 23:59 UTC for a specific reason (e.g. the SDK PR review ping on Nov 13 morning), that's a judgment call. This file documents the default.

## TODO at lock time

- [ ] User says "locked" in chat (or writes it here with a timestamp)
- [ ] All files in `SUBMISSION_PACKET.md` § "Verification before POST" are green
- [ ] The X post content in `MESH_RECUT_X_POST.md` § Variant A is final
- [ ] The repo on `projectUrl` passes `make replay-384-fixture` from a cold clone
- [ ] The `requestId` UUID is generated and recorded in `SUBMISSION_PACKET.md`

**Lock state (fill at T-48h):** `_____`
