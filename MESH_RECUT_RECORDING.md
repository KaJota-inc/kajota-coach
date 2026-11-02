# Mesh re-cut — VO recording script (for the user)

**Target duration:** 68–72 seconds total (vs 62.1s on the Mesh Singapore demo). Six beats. **1.0× speed throughout** — no atempo, per `[[feedback-submission-form-rules_first]]` and the Zama S4 near-miss.

**Pipeline inherited from Mesh Singapore's `demo/dryrun-ui.sh`:** scenes captured headlessly at 1920×1080, VO beats detected via `silencedetect noise=-32dB d=0.6`, scenes aligned so each beat covers its silence tail, ASR term-fixes dict for whisper's known mistakes (`Kajodamesh → Kajota Mesh`, etc.). The Mesh Singapore memory is the authoritative pipeline doc — this file only overrides the beats.

**Record the whole thing in a single continuous take.** Silences separate the beats; the pipeline detects them. Do not try to record beat-by-beat and splice — misses the silencedetect assumption and breaks captioning.

---

## Six beats (verbatim, with timing cues)

Record a 1-second silence before beat 1, a 1-second silence after beat 6, and roughly 0.8–1.0 seconds of silence between each beat so `silencedetect` cleanly separates them.

### Beat 1 — Open on the HOST defect (10–12 seconds)

> "On NEAR Intents, a confidential swap can return `status SUCCESS` while the money lands in the wrong account. Issue three-eighty-four, open as of today, has the receipts: zero point zero three nine ETH stuck in a solver sink account that keeps growing."

(0.9s pause)

### Beat 2 — Name what we built (10–12 seconds)

> "We're Shield · Mesh · Coach — a post-signature destination verifier that reads the on-chain receiver_id back from each NEAR transaction, and halts the agent when it doesn't match the quote. Not a replacement for OutLayer's pre-sign policy — the layer that fires after."

(0.9s pause)

### Beat 3 — Show the Mesh N-party split (8–10 seconds) — unchanged from the Singapore cut

> "Here, Coach is orchestrating an eight-way revenue split across two chains. Each leg goes through Mesh's atomic escrow and gets its destination verified before signing."

(0.9s pause)

### Beat 4 — The replay against #384 (12–14 seconds)

> "The replay against the two transaction hashes from issue three-eighty-four: Shield pulls the receiver_id, compares to the quoted recipient, flags mismatch, halts. Thirty-eight thousandths of an ETH that would have been lost — caught before the second signature."

(0.9s pause)

### Beat 5 — The live counter (8–10 seconds) — unchanged from Singapore cut

> "`kajota-mesh.vercel.app` — the counter ticks every real settlement. Eight cycles live, thirty-six transactions across Arbitrum Sepolia and Robinhood Chain. Clone the repo, run the replay script, see Shield halt on your own machine."

(0.9s pause)

### Beat 6 — Close on the pitch (6–8 seconds)

> "Built at NEAR HACKATHON. Shield, Mesh, Coach. The thing that catches what pre-sign policy misses."

(1.0s pause to end)

**Total estimated speaking time (sum of midpoints): 69.0s + 5 × 0.9s silences + 2 × 1.0s head/tail = 76.5s.** The target is 68–72s; trim ~5s on Beats 1, 4, or 6 if the first full-take recording comes in over 75s. Beat 3 and Beat 5 are inherited from the Singapore cut and should sound identical — same words, same pacing.

---

## Scene map (for the editor, after VO is recorded)

| Beat | Visual (scene source) | Duration budget |
|---|---|---|
| 1 | **NEW SCENE 0:** `near/intents#384` title + two Nearblocks tx pages. 1920×1080 PNG from Chrome headless (same pattern as `demo/dryrun-ui.sh`). | 10–12s |
| 2 | **NEW TITLE CARD:** `"Shield · Mesh · Coach · post-signature destination verification"` over a dark background. 10–12s. | 10–12s |
| 3 | **REUSE** Mesh Singapore N-party-split scene (unchanged, same frames). | 8–10s |
| 4 | **NEW SCENE:** Shield verifier terminal + Nearblocks tx `3djtQ3pU...` side-by-side split frame. User captures with the same `demo/dryrun-ui.sh` headless pipeline. | 12–14s |
| 5 | **REUSE** Mesh Singapore live counter scene (unchanged). | 8–10s |
| 6 | **NEW CLOSING FRAME:** `"Built at NEAR HACKATHON — Shield · Mesh · Coach"` + `kajota-mesh.vercel.app` URL. 6–8s. | 6–8s |

Each NEW scene is a single still PNG held for its full duration — matches the Singapore pipeline's `ffmpeg -loop 1 -t N` pattern.

---

## ASR term-fixes dict additions (for whisper caption pass)

Add these to the existing Mesh ASR term-fixes dict for the NEAR re-cut (keep the old entries from Mesh Singapore):

```
"issue three eighty four"       → "issue #384"
"issue three-eighty-four"       → "issue #384"
"NEAR Intents"                  → "NEAR Intents"   # already correct, keep as pin
"receiver_id"                   → "receiver_id"    # whisper tends to say "receiver ID"
"OutLayer"                      → "OutLayer"       # whisper may say "outlier"
"intents"                       → "Intents"        # capitalize when preceded by "NEAR"
"Shield"                        → "Shield"
"Mesh"                          → "Mesh"
"Coach"                         → "Coach"
"NEAR HACKATHON"                → "NEAR HACKATHON" # whisper may normalize to "Near Hackathon"
"Nearblocks"                    → "Nearblocks"
"Arbitrum Sepolia"              → "Arbitrum Sepolia"
"Robinhood Chain"               → "Robinhood Chain"
"zero point zero three nine"    → "0.039"
"thirty-eight thousandths"      → "0.038"
"eight-way"                     → "8-way"
```

Captions are burned-in per the Mesh Singapore pipeline — judges with sound off can still read. HACKATHON.md is silent on captions; adding them is strict upside.

---

## Recording environment (one-liner reminder for the user)

- Same mic + room setup as Mesh Singapore (that take was clean, don't change the input).
- Quiet room; close doors, HVAC off for the take, phone on silent, laptop fans at idle.
- One continuous take. Playback immediately; redo the full take if there's an obvious misread. Do not splice.
- Record in **48 kHz mono WAV** at `-23 LUFS` target. Mesh Singapore pipeline normalizes to `-16 LUFS` for X playback.

## Follow-up for next session

- [ ] User delivers raw VO WAV + the two NEW scene PNGs (title card + Shield verifier split frame) to the worktree root as `vo_near_recut.wav`, `scene_0_near_384.png`, `scene_shield_verify.png`, `scene_closing_near.png`.
- [ ] Next session cuts, muxes, captions, and writes the final `mesh-near-recut.mp4` to the worktree (or the user's video drafts folder if they prefer; the worktree is acceptable since it is < 16 MB per the pipeline's budget).
- [ ] Final MP4 reviewed by the user; X post publishes with the video attached per MESH_RECUT_X_POST.md.
