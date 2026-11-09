# Demo dry-run

**What this folder is:** the pre-VO assembly for the NEAR HACKATHON demo video. The goal is to prove the pipeline wires together end-to-end BEFORE the user records voiceover, so the only delta between the dry-run and the final is the audio track.

**What ran on 2026-11-09:** six scene HTMLs → Chrome-headless render → 1920×1080 PNGs → ffmpeg stitch → 65.5s silent mock MP4 → thumbnail contact sheet. Zero errors (the ghostscript warning on contact-sheet generation is label-text rendering, not scene content).

## Output artifacts

| File | What it is |
|---|---|
| `mesh-near-recut.dryrun.mp4` | 65.5s silent mock video, H.264 yuv420p, 1920×1080 @ 30fps, 707 KB. The structural proof. |
| `build/contact_sheet.png` | 1968×752 PNG, 3×2 grid of all 6 scenes. Review before recording to catch typos / wrong hash chars / wrong amounts. |
| `scenes/scene_N_*.png` | Individual 1920×1080 scene renders. Static frames the video is built from. |
| `html/scene_N_*.html` | The source HTML. Edit here, re-run `render_scenes.sh`, re-run `stitch_video.sh` to iterate. |

## Scene inventory and timing

Each beat maps to one of the six MESH_RECUT_RECORDING.md beats. Dry-run durations are **midpoints** of the ranges in that file plus a 0.9s silence tail (1.0s for scene 6). When the real VO arrives, silencedetect gives the true boundaries and `stitch_video.sh`'s `SCENE_FILES` array gets updated with those.

| Scene | Beat | Role | Duration | Source |
|---|---|---|---|---|
| 0 | 1 | The HOST defect (near/intents#384 + two tx receipts + sink) | 11.9s | New HTML (this folder) |
| 2 | 2 | The pitch (Shield · Mesh · Coach + the flow) | 11.9s | New HTML (this folder) |
| 3 | 3 | Mesh N-party split | 9.9s | **Placeholder** — replace with Mesh Singapore's existing scene |
| 4 | 4 | Shield verifier replay against #384 (Nearblocks split + terminal) | 13.9s | New HTML (this folder) |
| 5 | 5 | Live counter | 9.9s | **Placeholder** — replace with Mesh Singapore's existing scene |
| 6 | 6 | Closing (built at NEAR HACKATHON) | 8.0s | New HTML (this folder) |

Total: **65.5s**. Target was 68–72s from MESH_RECUT_RECORDING.md; the dry-run is at the fast end because scenes 3 and 5 are placeholders using slightly shorter copy than the Mesh Singapore originals. When Mesh Singapore's real scenes drop in, re-measure durations against their content.

## How to iterate on a scene

```bash
# Edit the HTML
vim demo-dryrun/html/scene_0_hostdefect.html

# Re-render just that one PNG
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --hide-scrollbars \
  --window-size=1920,1080 \
  --screenshot=demo-dryrun/scenes/scene_0_hostdefect.png \
  "file://$(pwd)/demo-dryrun/html/scene_0_hostdefect.html"

# Re-stitch the full video
cd demo-dryrun && ./build/stitch_video.sh

# (Optional) regenerate contact sheet
magick montage scenes/scene_*.png -geometry 640x360+8+8 \
  -background '#0a0f1e' -tile 3x2 build/contact_sheet.png
```

## Replacing the placeholder scenes (3 and 5)

Mesh Singapore's `demo/dryrun-ui.sh` pipeline (in the `kajota-mesh` repo, not here) already produced the 6 Mesh Singapore scene PNGs for the Oct 4 submission. Two of them are directly reusable:

- Mesh Singapore's **N-party-split scene** → replace `demo-dryrun/scenes/scene_3_mesh_split.png`
- Mesh Singapore's **live-counter scene** → replace `demo-dryrun/scenes/scene_5_live_counter.png`

```bash
# From kajota-mesh checkout:
cp demo/output/scene_3.png <this-worktree>/demo-dryrun/scenes/scene_3_mesh_split.png
cp demo/output/scene_5.png <this-worktree>/demo-dryrun/scenes/scene_5_live_counter.png
# Then re-stitch:
cd <this-worktree>/demo-dryrun && ./build/stitch_video.sh
```

Exact filenames depend on the Mesh Singapore pipeline naming; adjust as needed. The placeholder HTMLs explicitly label themselves as placeholders in the render so a judge seeing the dry-run accidentally would not mistake them for the final.

## Adding the VO

Once the user records `vo_near_recut.wav` per MESH_RECUT_RECORDING.md:

```bash
cd demo-dryrun
./build/mux_vo.sh /path/to/vo_near_recut.wav
# Writes mesh-near-recut.FINAL.mp4
```

The mux script:
- Loudness-normalizes VO to −16 LUFS (X playback target)
- Keeps the video stream unchanged (copies H.264, no re-encode)
- Takes the shorter of the two streams as the output length

## Known gaps (not blocking)

### Caption burn-in

The `mux_vo.sh` script does NOT burn captions in. Reasons:
- Whisper caption pass needs the Mesh Singapore ASR term-fixes dict (in MESH_RECUT_RECORDING.md), plus a pre-trained whisper model and a `drawtext` or `subtitles` ffmpeg filter pass
- The dict is ready; the caption step belongs in the Mesh-side pipeline that already has whisper configured

**Fallback:** upload the video to X with X's auto-captions enabled. HACKATHON.md is silent on captions, so this is strictly nice-to-have, not required.

### Scene-length re-alignment against real VO silencedetect

Current durations are midpoint-of-range estimates. When real VO lands:

```bash
ffmpeg -i vo_near_recut.wav -af silencedetect=noise=-32dB:d=0.6 -f null - 2>&1 \
  | grep -E 'silence_(start|end)' | tail -14
```

Pipe the detected boundaries into a new `SCENE_FILES` array in `stitch_video.sh`.

### The placeholder scenes

Scenes 3 and 5 are intentionally labeled placeholders in the dry-run. They must be swapped for Mesh Singapore's real captures before the final mux. The placeholder labels are embedded in the HTML/render, so running the dry-run MP4 as-is in a submission would advertise this gap — the swap is non-optional for Nov 13 publication.

## Playback sanity check

Opening `mesh-near-recut.dryrun.mp4` in any player should show:
1. 0.0–11.9s: Scene 0 (HOST defect, #384, two tx receipts on dark blue)
2. 11.9–23.8s: Scene 2 (pitch: Shield·Mesh·Coach, Coach→Intents→Mesh→Shield flow)
3. 23.8–33.7s: Scene 3 (placeholder, labeled "replace with Mesh Singapore")
4. 33.7–47.6s: Scene 4 (Shield verifier split: Nearblocks ↔ terminal output)
5. 47.6–57.5s: Scene 5 (placeholder, labeled "replace with Mesh Singapore")
6. 57.5–65.5s: Scene 6 (closing: Built at NEAR HACKATHON)

No audio. That's expected for the dry-run.

## File sizes (sanity)

- Silent mock MP4: **707 KB** (65.5s, H.264 yuv420p from static scenes — very compressible)
- Each scene PNG: 69–185 KB
- Contact sheet: ~1 MB

The final MP4 with VO should land around 1–3 MB — well under X's 512 MB upload cap.
