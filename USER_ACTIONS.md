# User actions — close pass

Today: **2026-11-09**. Deadline: **2026-11-14T23:59:00Z** (5 days). Recording lock: **2026-11-12T23:59:00Z** (3 days, per `RECORDING_LOCK.md`).

Ordered manual steps. Each unblocks the next. All of these are things only the user can do.

## Note on the Discord Nigeria eligibility DM

The peer session's Nov 9 brief lists a Discord DM about Nigeria eligibility as the first action. **That item is omitted here** per the user's explicit decision on 2026-11-02 (commit `5ca92a4`): *"let's do without discord."* The decision rationale is in `UPSTREAM_PR.md` § "Nigeria eligibility — accepted risk, not a gate":

> *"HACKATHON.md is silent on geography; the common hackathon OFAC-exclusion list does not include Nigeria. Residual risk is post-win payout, resolution-via-DM path with Illia, not a submission blocker. No build hours are gated on this."*

If the user has changed their mind since Nov 2, surface that explicitly and I'll re-add the Discord draft. Otherwise proceeding as decided.

---

## Action list

### 1. Create the NEAR mainnet account — by 2026-11-11

- Open wallet.near.org or my.near.org
- Choose a named account: `shield-mesh-coach.near` or similar (lowercase alphanumerics + hyphens + dots per the HACKATHON.md regex)
- Fund it to satisfy the 0.1 NEAR minimum storage (small, not a blocker)
- Paste the account id into `SUBMISSION_PACKET.md` § `nearAddress`
- This is the one hackathon-side blocker that cannot be drafted or automated

**Unblocks:** `SUBMISSION_PACKET.md` becomes complete apart from the repo URL + demo URL.

### 2. Post the `near/intents#385` comment — by 2026-11-10

- Open `UPSTREAM_PR_DRAFT.md` § "Paste-ready comment body"
- Re-verify the on-chain state right before posting:
  ```bash
  near view btc-connector.bridge.near get_config '{}'
  ```
  Expect `unsafe_refund_timelock_sec: 3153600000` and `refund_timelock_sec: 172800`. If either has changed, edit the comment body before posting.
- Post as @bori7 on https://github.com/near/intents/issues/385
- Paste the comment URL into `SUBMISSION.md` rubric table under gate #3 and into this file:

  **Comment URL:** `<paste after posting>`

**Unblocks:** gate #3 primary artefact. The stretch SDK PR (step 4) is optional but covers gate #3 fully even if the comment gets no maintainer response.

### 3. Open the stretch SDK PR on `defuse-protocol/one-click-sdk-typescript` — by 2026-11-11

- Fork `https://github.com/defuse-protocol/one-click-sdk-typescript`
- `cp` the three files from `sdk-pr-files/` into the fork per `sdk-pr-files/README.md` § "Drop-in procedure"
- Add `export * from './verify-destination';` to `src/main.ts`
- Run: `pnpm install && pnpm test && pnpm run build && npx tsx examples/verify-destination.ts`
- Open the PR with the body from `UPSTREAM_PR.md` § "Stretch"
- Paste the PR URL here:

  **PR URL:** `<paste after opening>`

**Unblocks:** gate #3 stretch artefact (capability, not correctness). Mergeability by Nov 14 is a stretch target — if it's still open on submit day, it's still a valid gate-#3 citation in `SUBMISSION.md`.

**Known gap:** `replay-384/README.md` § "Known gap" notes the parser needs refinement against live RPC. The SDK PR has the same parser logic; the maintainer's review likely flushes out the right receipts walk. Carry the fix back into `replay-384.ts` before Nov 12.

### 4. Record the demo VO — by 2026-11-11

Mesh Singapore judging is fully closed (verified in `DEMO_PLAN.md` on 2026-11-02): Overall closed Oct 16, Promising Products closed Nov 2, Mesh in none of the three tracks. No duplicate-submission perception risk.

- Open `MESH_RECUT_RECORDING.md`
- Record one continuous take, 6 beats, 1.0× speed only (no atempo)
- Capture Scene 0 title card + Scene 4 Shield verifier split frame via the Mesh Singapore `demo/dryrun-ui.sh` pipeline
- Drop these files into the worktree root:
  - `vo_near_recut.wav`
  - `scene_0_near_384.png`
  - `scene_shield_verify.png`
  - `scene_closing_near.png`

**Unblocks:** the next session (or this one with the user's go-ahead) cuts, muxes, and captions into `mesh-near-recut.mp4`.

### 5. Finish the video cut + review — by 2026-11-12 23:59 UTC (**recording lock**)

- Scene 0 + mid-video Shield insert at ~30s + closing frame edits per `DEMO_PLAN.md` § Phase 2
- Mux audio + burn captions per `MESH_RECUT_RECORDING.md` § "ASR term-fixes dict"
- Final MP4 under 2:20, 1920×1080, H.264+AAC, under 512 MB
- User reviews once before the lock
- **After 2026-11-12 23:59 UTC the video is frozen** — see `RECORDING_LOCK.md`

### 6. Publish the X post — on 2026-11-13 around 16:00 WAT (15:00 UTC)

- Open `MESH_RECUT_X_POST.md` § Variant A
- Attach the final MP4
- Account: `@Oluwabori6` (same handle as the Mesh Singapore pinned post for substrate credibility)
- Verify the post is public (not restricted) before submission
- Record the URL:

  **X post URL:** `<paste after publishing>`

- Optionally pin the post and add Variant B thread replies

### 7. Make the submission repo public — on 2026-11-13

- Push the branch to the repo named in `SUBMISSION_PACKET.md` § `projectUrl`
- `cp replay-384/replay-384.ts scripts/` and `cat replay-384/Makefile.snippet >> Makefile` per `replay-384/README.md`
- Verify from a clean clone: `git clone <url> /tmp/cold && cd /tmp/cold && make replay-384-fixture` exits 0
- Switch repo visibility to public
- Record the URL:

  **Repo URL:** `<paste after making public>`

### 8. Submit on nearhackathon.com — on 2026-11-14 before 23:59 UTC

- Open `SUBMISSION_PACKET.md`
- Fill every placeholder with the real values collected above
- Generate `requestId`: `uuidgen | tr A-Z a-z`
- Read the consent notice verbatim (user says yes out loud)
- Walk the pre-POST verification checklist in `SUBMISSION_PACKET.md` § "Verification before POST"
- POST via `curl ... -d @/tmp/near-payload.json` (heredoc form)
- Delete `/tmp/near-payload.json` after a 201 — it contains personal data per HACKATHON.md

**Expected response:**
```
HTTP/2 201
{"id": "<id>", "requestId": "<uuid>", "status": "saved"}
```

### 9. Verify post-submit — right after step 8

- `curl -sS "https://nearhackathon.com/api/applications?limit=5"` returns updated count (should increment from current 345)
- No further field data is public pre-judging per the scout memo

Record the submission response here:

**Response:** `<paste full response after step 8>`
**Submission timestamp (UTC):** `<paste>`

---

## If something slips

Fallbacks ordered from least costly to most:

- **VO recording slips past 2026-11-12:** publish Variant C (screenshots-only) from `MESH_RECUT_X_POST.md` on Nov 13 or Nov 14. Submission still valid; placing probability drops, but the submission is in.
- **`make replay-384` live mode still returns INDETERMINATE on Nov 12:** alias the Makefile target to fixture mode only per `replay-384/README.md` § "Known gap". The `idea` field claim still fires.
- **SDK PR gets refused or stalls past Nov 14:** publish the three files as `@kajota/near-intents-destination-check` on npm and reference it in the submission. Not a merged PR; gate #3 falls back to the comment on #385.
- **NEAR Foundation refuses payout post-win citing Nigeria:** DM Illia (`@ilblackdragon` on X) with the submission ID and ask for an alternate payout rail. This is the post-win path called out in `UPSTREAM_PR.md`, not a submission-time blocker.

## Earliest action that unblocks the rest

**Step 1: create the NEAR mainnet account.** Without a value for `nearAddress`, the submission packet stays incomplete. Everything else (PR, VO, X post, repo) can proceed in parallel — the NEAR account is the single serial dependency.

Target: within the next 48 hours (by 2026-11-11), ideally today.
