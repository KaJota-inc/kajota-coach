# Demo video plan — NEAR HACKATHON re-cut

## Where Mesh Singapore stands as of today (2026-11-02)

Per `[[hackathon-arbitrum-singapore-result]]` memory, read at session start:

- **Overall Prize ($70K) was announced on 2026-10-16.** Mesh did not podium. Winners: Zona ($40K, tokenized stock lending on Robinhood Chain), Peridot ($20K, cross-chain stock-token lending), AquaZero ($10K, stablecoin liquidity).
- **Promising Products ($15K)** track: not reported in Oct 16 announcement. May still be in review. Memory flag: *"check again mid-November"* — so there is a chance of a Promising Products reveal falling inside the NEAR submission window.
- **Grants ($30K, milestone-tied)**: also pending; evidence-and-milestone based, not video based. No video-reuse conflict.
- Mesh is not invited to Phase 2 Founder House (Oct 23–25 Singapore in-person).

**Conclusion for video reuse:** the headline competition is CLOSED. The only live tracks are Promising Products ($15K, likely video-visible) and Grants ($30K, not video-visible). Re-cutting the Mesh Singapore demo with a NEAR HACKATHON overlay carries one real risk: a Promising Products judge who re-opens the Mesh HackQuest page in mid-November and sees a NEAR HACKATHON overlay on the same video might read that as "project pivoted away from Arbitrum / Robinhood Chain."

That risk is small (Promising Products is a sweep over the field, not a per-project re-review) but non-zero. Mitigation: upload the NEAR re-cut as a **separate URL** (fresh X post, fresh file, do not overwrite the HackQuest-hosted asset at `assets.hackquest.io/.../demoVideo/aIJPgph8_JPWSDZTihp3T.mp4`).

## Plan

### Phase 1 — Start now (user call, 2026-11-02): the hold was not worth the timeline risk

Original plan held the re-cut until Nov 9 to let Promising Products announce first. User reversed that today — start the re-cut immediately. Reasoning:

- The Promising Products review is **evidence-based** (`demo/dryrun-ui.sh` output, `kajota-mesh.vercel.app` state, GitHub commits), not video-timeline-based. A fresh video on a fresh X URL will not reach a Promising Products judge who is reviewing against HackQuest's own asset.
- The HackQuest-hosted Mesh Singapore video asset at `assets.hackquest.io/.../demoVideo/aIJPgph8_JPWSDZTihp3T.mp4` is **not touched** by any re-cut here — the NEAR version lives at a new X-hosted URL, so the two tracks are visually and chronologically separable.
- Delaying by a week with three live fires (PayPal, Dubai, hub) is more expensive than the Promising-Products-perception risk it hedges against.

Decision tree collapsed to one branch: **re-cut starts 2026-11-02, user records VO 11-03/11-04, published to X by 11-05.** Everything after is contingency.

- **If Promising Products announces and Mesh wins** before Nov 14: the already-published NEAR re-cut becomes an asset, not a risk. Add a reply tweet to the NEAR X post citing the Arbitrum result as substrate credibility.
- **If Promising Products announces and Mesh does not place** before Nov 14: no change to the NEAR submission.
- **If Promising Products has not announced by 2026-11-14** (NEAR deadline): the NEAR submission is already in — zero coupling to Mesh Singapore's unresolved tracks.

### Phase 2 — The re-cut itself (target: 2 build hours, user records VO)

Source material: the existing 62.1s @ 1920×1080 H.264+AAC Mesh Singapore demo (per `[[hackathon-arbitrum-singapore]]`'s `demo/dryrun-ui.sh` pipeline). Already under NEAR HACKATHON's silent-on-length rule (HACKATHON.md confirmed silent on length / speed / hosting / newly-recorded).

Changes:

1. **Open with a new 8-10s title card.** Scene 0 overlay: *"NEAR HACKATHON · Post-signature destination verification · catches `near/intents#384`."* Static card with the one-liner from `SUBMISSION.md`. 2-second fade in, hold 6s, fade out.
2. **Insert a new mid-video scene** at ~30s (after the N-party split demo, before the final "live counter" scene): a 15s screen recording of the Shield destination verifier running on the two tx hashes from `#384`, showing the `MISMATCH(quoted=b45e..., actual=51e8f94d...)` output in the terminal. Zoom level: the terminal filling the right half of the frame, the NearBlocks tx page for `3djtQ3pU...` filling the left half.
3. **Replace the voiceover for the first 25s and the mid-video insert.** The original VO opens with the Mesh Singapore framing — needs a fresh take with NEAR HACKATHON framing. Keep the Mesh N-party split narration (seconds ~25–50) and the live-counter close (~50–60) as-is: they are the primitive, the primitive did not change.
4. **Replace the closing frame.** Original closing: Mesh counters. New closing: `kajota-mesh.vercel.app` counter + a new line *"Shield gates each leg of this split through NEAR Intents on-chain destination verification."*
5. **Rules compliance check against the HACKATHON.md § The demo post requirement:** the X post text must say *"built at NEAR HACKATHON"* — the video itself does not need to say it (the HACKATHON.md says "it says the project was built at NEAR HACKATHON" of the X post, not the video). Keep video at **1.0× speed** throughout per `[[feedback-submission-form-rules_first]]` and the Zama S4 1.117× atempo near-miss.

### Phase 3 — Publish the X post (user drives)

Draft X post (not posted by Claude; drafted here for the user to publish from `@Oluwabori6` or whichever handle the user wants attached):

```
We built Shield · Mesh · Coach at NEAR HACKATHON — post-signature destination
verification that catches what pre-sign policy misses.

Named against `near/intents#384`: confidential swaps misroute real ETH to
a sink account while the API returns SUCCESS. Shield reads the on-chain
`receiver_id` back and halts the agent when it diverges from the quote.

Live: kajota-mesh.vercel.app (8 settlement cycles, 36 txs)
Repo: github.com/[user]/[repo]

[video attached]

#NEARHACKATHON
```

Length: 426 chars (fits a single tweet with the video). Open thread with 1-2 reply tweets if the user wants to expand (per playbook's "quantified impact close" guidance).

### Phase 4 — Hosting

Options for the video asset:

- **X-native video upload** (preferred): HACKATHON.md's `demoUrl` field is the X post URL, so X-hosted video keeps the artifact and the post in the same place. 2:20 cap on X video uploads matches our ~62s video with headroom.
- **YouTube unlisted + X link preview**: back-up. Only if X upload fails.
- **HackQuest / Vercel re-host**: NO. We agreed not to overwrite the HackQuest Mesh Singapore asset. Vercel re-host is fine on `kajota-mesh.vercel.app` as a secondary mirror, but the X post is primary.

Avoid: Loom (requires account), Vimeo (free tier adds branding), Google Drive (shows "requires access" to non-signed-in users). HACKATHON.md is silent on hosting restrictions, so this is my call, not a rule — but we match the pattern winners used (per `[[hackathon-winning-playbook]]` demo-video-craft section).

### Phase 5 — Fallback if the user cannot record VO in time

Screenshots-only submission is explicitly allowed by HACKATHON.md: *"it says the project was built at NEAR HACKATHON and has the demo video **or screenshots** attached"*. If VO recording slips, cut to 6 annotated screenshots:

1. `near/intents#384` title + sink account balance (the HOST defect)
2. Shield verifier terminal output on the two tx hashes
3. Coach orchestration view (the agent calling `verifyIntentDestination`)
4. Mesh N-party split live settlement
5. `kajota-mesh.vercel.app` counter
6. Rubric table from `SUBMISSION.md`

Each screenshot captioned in the X thread with 1-2 sentences. Drop in quality (video > screenshots per playbook), but keeps the submission alive.

## Timeline

| Date (UTC) | Action | Driver |
|---|---|---|
| 2026-11-02 | This plan written + MESH_RECUT_RECORDING.md VO beats drafted + MESH_RECUT_X_POST.md variants drafted | Claude (this session) |
| 2026-11-03 | User reads VO script, records fresh VO (6 beats) per MESH_RECUT_RECORDING.md | User |
| 2026-11-04 | User delivers VO + Shield verifier terminal recording of the two #384 tx hashes to the worktree | User |
| 2026-11-04 to 11-05 | Scene 0 title card, mid-video Shield insert, closing frame; mux + caption | Claude (next session) |
| 2026-11-05 | User reviews final cut, publishes X post from MESH_RECUT_X_POST.md | User |
| 2026-11-06 to 11-13 | Buffer. Submission build + upstream PR work continues in parallel | — |
| 2026-11-14 | Submission form filled; `demoUrl` + `projectUrl` sent to `POST /api/applications` | User |

Hard cut-off: 2026-11-14 23:59 UTC. Any slip after that is a disqualification. The 8-day buffer from Nov 6 → Nov 14 absorbs any Mesh re-cut iteration without touching submission week.

## TODO this session

- [x] User reads this plan.
- [x] User signals go/no-go on hold vs start-now. **Chose start-now 2026-11-02.**
- [x] Draft `MESH_RECUT_RECORDING.md` VO beats
- [x] Draft `MESH_RECUT_X_POST.md` variants

## Follow-ups for the next session

- User records VO per MESH_RECUT_RECORDING.md (6 beats, 1.0× speed only).
- Confirm the HackQuest asset at `assets.hackquest.io/.../demoVideo/aIJPgph8_JPWSDZTihp3T.mp4` is **not** touched — the NEAR re-cut lives on a fresh X-hosted URL only.
- Cut Scene 0 title card + mid-video Shield insert at ~30s + new closing frame. Keep middle 25-50s unchanged from the Mesh Singapore demo.
