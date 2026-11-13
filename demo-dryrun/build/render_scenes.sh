#!/usr/bin/env bash
# Renders the 6 scene HTML files to 1920×1080 PNGs via Chrome headless.
# Writes to demo-dryrun/scenes/.
#
# Usage: ./build/render_scenes.sh
# (run from demo-dryrun/ root)

set -euo pipefail

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
HTML_DIR="$(cd "$(dirname "$0")/.." && pwd)/html"
OUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/scenes"

mkdir -p "$OUT_DIR"

for html in "$HTML_DIR"/scene_*.html; do
  # Skip placeholder HTMLs — scenes 3 and 5 come from capture_mesh_live.sh, not from
  # a static HTML. Re-renders here would clobber the live crops.
  case "$html" in
    *.PLACEHOLDER.html) echo "[skip] $(basename "$html") (placeholder — see capture_mesh_live.sh)"; continue ;;
  esac
  name="$(basename "$html" .html)"
  out="$OUT_DIR/$name.png"
  echo "[render] $name"
  "$CHROME" \
    --headless=new \
    --disable-gpu \
    --hide-scrollbars \
    --window-size=1920,1080 \
    --screenshot="$out" \
    --default-background-color=00000000 \
    "file://$html" \
    >/dev/null 2>&1
done

echo "[render] done — $(ls "$OUT_DIR" | wc -l | xargs) PNGs in $OUT_DIR"
