#!/usr/bin/env bash
# Muxes the user-recorded VO WAV into the silent mock MP4.
# Then burns captions via the Mesh Singapore ASR term-fixes pipeline
# (see MESH_RECUT_RECORDING.md for the dict).
#
# Usage: ./build/mux_vo.sh <vo.wav>
# Writes: demo-dryrun/mesh-near-recut.FINAL.mp4
#
# Prerequisites (user supplies):
#   - vo.wav recorded per MESH_RECUT_RECORDING.md (continuous single take,
#     1.0× speed, 48kHz mono, ~68-72s)
#   - demo-dryrun/mesh-near-recut.dryrun.mp4 exists (run stitch_video.sh first)
#
# What this DOESN'T do yet:
#   - Caption burn-in via whisper + ASR term-fixes (next session; the
#     MESH_RECUT_RECORDING.md dict is ready to feed into Mesh's pipeline)
#   - Scene-length re-alignment to match real silencedetect boundaries.
#     The dry-run durations are MIDPOINTS from MESH_RECUT_RECORDING.md.
#     When real VO arrives, `silencedetect noise=-32dB d=0.6` detects the
#     true beat boundaries and the stitch should be re-run with those
#     durations. See build/align_to_silencedetect.sh (TODO next session).

set -euo pipefail

VO="${1:-}"
if [ -z "$VO" ] || [ ! -f "$VO" ]; then
  echo "usage: $0 <vo.wav>" >&2
  exit 2
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SILENT="$ROOT/mesh-near-recut.dryrun.mp4"
OUT="$ROOT/mesh-near-recut.FINAL.mp4"

if [ ! -f "$SILENT" ]; then
  echo "silent mock missing — run ./build/stitch_video.sh first" >&2
  exit 3
fi

echo "[mux] VO:     $VO"
echo "[mux] silent: $SILENT"
echo "[mux] out:    $OUT"

# Loudness-normalize the VO to -16 LUFS (X playback target per Mesh Singapore pipeline)
NORM="$ROOT/build/tmp/vo_normalized.aac"
mkdir -p "$ROOT/build/tmp"

ffmpeg -y -i "$VO" \
  -af "loudnorm=I=-16:LRA=11:TP=-1.5" \
  -c:a aac -b:a 192k -ar 48000 -ac 2 \
  "$NORM" \
  >/dev/null 2>&1

echo "[mux] VO normalized → $NORM"

# Mux. Video stays unchanged (copy); audio is the normalized VO; shortest stream
# ends the output so the silent tail of either doesn't bloat the file.
ffmpeg -y -i "$SILENT" -i "$NORM" \
  -map 0:v -map 1:a \
  -c:v copy -c:a copy \
  -shortest \
  -movflags +faststart \
  "$OUT" \
  >/dev/null 2>&1

dur="$(ffprobe -v error -show_entries format=duration -of default=nk=1:nw=1 "$OUT")"
size="$(stat -f%z "$OUT" 2>/dev/null || stat -c%s "$OUT")"

echo "[mux] done → $OUT"
echo "[mux] duration: ${dur}s"
echo "[mux] size:     ${size} bytes"
echo ""
echo "Next steps:"
echo "  - Review the MP4 in a player (QuickTime, mpv, VLC)"
echo "  - If scene timing drifts against the VO beats, edit SCENE_FILES"
echo "    in build/stitch_video.sh to the real silencedetect boundaries,"
echo "    re-run stitch_video.sh, then re-run this mux_vo.sh"
echo "  - If captions are needed, run the whisper + ASR term-fixes pass"
echo "    per MESH_RECUT_RECORDING.md § 'ASR term-fixes dict'"
echo "  - Upload to X per MESH_RECUT_X_POST.md § Variant A"
