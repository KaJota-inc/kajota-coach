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

### Phase 1 — Hold until 2026-11-09 at the latest (fallback: start earlier if Promising Products announces first)

Reason: Promising Products announcement is "mid-November" per the memory flag. Mid-November is probabilistically Nov 10–15. The NEAR submission deadline is Nov 14 23:59 UTC. We want to **publish the NEAR demo after any Promising Products result lands**, so the two are chronologically separate on the project's public timeline (an audience reading the X thread sees the Mesh Singapore story close before NEAR opens).

Decision tree:
- **If Promising Products announces by 2026-11-09:** start the NEAR re-cut on Nov 10, publish Nov 11-12. Buys a 2-3 day buffer before submission deadline.
- **If Promising Products has not announced by 2026-11-09:** the memory flag was optimistic. Proceed with the re-cut on Nov 10 regardless — Promising Products review is evidence-based (`demo/dryrun-ui.sh` output, `kajota-mesh.vercel.app` state, GitHub commits), not video-timeline-based. A fresh video on a fresh URL will not confuse a judge looking at HackQuest.
- **If Promising Products announces and Mesh wins:** the NEAR re-cut becomes an asset, not a risk. Re-use the "we just placed on Arbitrum" framing in the NEAR X post's opening line as evidence of substrate credibility.
- **If Promising Products announces and Mesh does not place:** re-cut as planned, no change.

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
| 2026-11-02 | This plan written | Claude (this session) |
| 2026-11-03 to 11-08 | HOLD on re-cut | — |
| 2026-11-09 | Check Promising Products status; decide re-cut start | User + Claude |
| 2026-11-10 | Start re-cut (title card, mid-video insert, closing frame edits) | Claude |
| 2026-11-10 to 11-11 | User records fresh VO per `demo/RECORDING.md` pipeline | User |
| 2026-11-12 | Finish cut, mux, caption | Claude |
| 2026-11-13 | User publishes X post, user records `demoUrl` | User |
| 2026-11-14 | Submission form filled; `demoUrl` + `projectUrl` sent to `POST /api/applications` | User |

Hard cut-off: 2026-11-14 23:59 UTC. Any slip after that is a disqualification.

## TODO this session

- [ ] User reads this plan.
- [ ] User signals OK to the hold-until-Nov-9 approach.
- [ ] User notes any Promising Products insider knowledge (e.g. a specific announcement date Arbitrum confirmed privately) that would shift the hold date.

## Follow-ups for the next session

- Draft `demo/RECORDING.md` for the fresh VO beats (1-page script, timed to each scene).
- Draft the X post variants (short / threaded) once the submission framing is final.
- Confirm the HackQuest asset at `assets.hackquest.io/.../demoVideo/aIJPgph8_JPWSDZTihp3T.mp4` is **not** touched.
