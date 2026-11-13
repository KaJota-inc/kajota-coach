#!/usr/bin/env bash
# Re-captures scenes 3 and 5 from the live Mesh Singapore site.
#
# Scene 3 = hero section ("One USDC in. N parties out. In one atomic settlement.")
# Scene 5 = live-state section ("PROTOCOL USAGE · LIVE FROM ARBITRUM SEPOLIA")
#
# Writes directly to demo-dryrun/scenes/scene_{3_mesh_split,5_live_counter}.png,
# overwriting whatever was there. render_scenes.sh skips scene_*.PLACEHOLDER.html
# so the two sources do not step on each other.
#
# Usage: ./build/capture_mesh_live.sh
# (run from demo-dryrun/ root)
#
# Prerequisite: kajota-mesh.vercel.app reachable. If offline, re-render the
# placeholder HTMLs by renaming scene_{3,5}_*.PLACEHOLDER.html back and running
# render_scenes.sh — the placeholders are explicitly labeled so a judge sees
# the gap.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCENES="$ROOT/scenes"
TMP="$ROOT/build/tmp"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
URL="https://kajota-mesh.vercel.app"

mkdir -p "$SCENES" "$TMP"

FULL="$TMP/mesh_full_page.png"

echo "[capture] fetching $URL at 1920x5400"
"$CHROME" \
  --headless=new \
  --disable-gpu \
  --hide-scrollbars \
  --window-size=1920,5400 \
  --virtual-time-budget=5000 \
  --screenshot="$FULL" \
  "$URL" \
  >/dev/null 2>&1

echo "[capture] cropping scene_3_mesh_split (hero, 1920x1080 at y=0)"
magick "$FULL" -crop 1920x1080+0+0 +repage "$SCENES/scene_3_mesh_split.png"

echo "[capture] cropping scene_5_live_counter (live state, 1920x1080 at y=720)"
magick "$FULL" -crop 1920x1080+0+720 +repage "$SCENES/scene_5_live_counter.png"

rm -f "$FULL"

echo "[capture] done"
echo "  $SCENES/scene_3_mesh_split.png"
echo "  $SCENES/scene_5_live_counter.png"
echo ""
echo "If the Mesh Singapore page layout has shifted and the live-state section"
echo "no longer lands at y=720, open the full page in a browser, measure the"
echo "section's offsetTop, and update the crop Y in this script."
