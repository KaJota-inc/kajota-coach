#!/usr/bin/env bash
# Stitches the 6 scene PNGs into a silent mock MP4 at 1920×1080, 30fps.
# Each scene duration matches MESH_RECUT_RECORDING.md beat midpoints + ~0.9s silence tail.
# Output: demo-dryrun/mesh-near-recut.dryrun.mp4
#
# Usage: ./build/stitch_video.sh
# (run from demo-dryrun/ root)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCENES="$ROOT/scenes"
OUT="$ROOT/mesh-near-recut.dryrun.mp4"
CONCAT_LIST="$ROOT/build/concat.txt"

# Beat durations (seconds) — midpoint of MESH_RECUT_RECORDING.md ranges + 0.9s silence tail
# Scene 0 (Beat 1): 11s speaking + 0.9s silence = 11.9s
# Scene 2 (Beat 2): 11s + 0.9s = 11.9s
# Scene 3 (Beat 3): 9s + 0.9s = 9.9s
# Scene 4 (Beat 4): 13s + 0.9s = 13.9s
# Scene 5 (Beat 5): 9s + 0.9s = 9.9s
# Scene 6 (Beat 6): 7s + 1.0s (tail silence) = 8.0s
# Head silence (before Beat 1): 1.0s baked into Scene 0
# Total: 1.0 + 11.9 + 11.9 + 9.9 + 13.9 + 9.9 + 8.0 - 1.0 = 65.5s target

declare -a SCENE_FILES=(
  "scene_0_hostdefect.png:11.9"
  "scene_2_pitch.png:11.9"
  "scene_3_mesh_split.png:9.9"
  "scene_4_shield_verify.png:13.9"
  "scene_5_live_counter.png:9.9"
  "scene_6_closing.png:8.0"
)

# Build a video clip per scene, then concat
TMP="$ROOT/build/tmp"
mkdir -p "$TMP"
rm -f "$TMP"/*.mp4 "$CONCAT_LIST"

for entry in "${SCENE_FILES[@]}"; do
  png="${entry%%:*}"
  dur="${entry##*:}"
  name="${png%.png}"
  echo "[stitch] $name  dur=${dur}s"
  ffmpeg -y -loop 1 -framerate 30 -i "$SCENES/$png" \
    -t "$dur" \
    -c:v libx264 -pix_fmt yuv420p -preset veryfast \
    -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x0a0f1e" \
    -movflags +faststart \
    "$TMP/$name.mp4" \
    >/dev/null 2>&1
  echo "file '$TMP/$name.mp4'" >> "$CONCAT_LIST"
done

echo "[stitch] concat"
ffmpeg -y -f concat -safe 0 -i "$CONCAT_LIST" -c copy "$OUT" >/dev/null 2>&1

dur="$(ffprobe -v error -show_entries format=duration -of default=nk=1:nw=1 "$OUT")"
size="$(stat -f%z "$OUT" 2>/dev/null || stat -c%s "$OUT")"

echo "[stitch] done → $OUT"
echo "[stitch] duration: ${dur}s"
echo "[stitch] size:     ${size} bytes"
