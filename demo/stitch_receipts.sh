#!/usr/bin/env bash
# Build the Option-C receipt-mode cut. Three-pass to sidestep the sim
# recording's variable frame rate:
#   0) normalize the raw mov to a constant-30fps master
#   1) extract chunks from the master using accurate `-ss` + `-t` (duration)
#   2) concat + tpad + overlay
#
# (Direct `-ss/-to` on the VFR original was silently truncating chunk 4 to
# a single frame; `-t <duration>` is reliable.)

set -euo pipefail
cd "$(dirname "$0")"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# Pass 0: normalize to CFR master
ffmpeg -y -i app-xlayer-demo.mp4 -r 30 -c:v libx264 -preset veryfast -crf 20 \
  -pix_fmt yuv420p -an "$TMP/master.mp4" 2>/dev/null
MDUR=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$TMP/master.mp4")
printf "master duration: %s\n" "$MDUR"

# Pass 1: extract chunks by (start, duration) — reliable
extract() {  # start duration outname
  ffmpeg -y -ss "$1" -i "$TMP/master.mp4" -t "$2" -c:v libx264 -preset veryfast \
    -crf 20 -pix_fmt yuv420p -an "$TMP/$3" 2>/dev/null
}
# Anchors calibrated against the CFR master, not the raw VFR clip.
extract 1.4  1.5 c1.mp4   # Home (skips the Metro "Refreshing…" toast at mst 0.2–1.0)
extract 26   2.5 c2.mp4   # Live 402 renders (price tag)
extract 28.5 4   c3.mp4   # Signed EIP-3009 authorization panel
extract 36   5.5 c4.mp4   # Settled: insight + on-chain tx

for f in c1 c2 c3 c4; do
  d=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$TMP/$f.mp4")
  printf "  %s duration: %s\n" "$f" "$d"
done

cat > "$TMP/list.txt" <<EOF
file '$TMP/c1.mp4'
file '$TMP/c2.mp4'
file '$TMP/c3.mp4'
file '$TMP/c4.mp4'
EOF

# Pass 2: concat + tpad + overlays
ffmpeg -y -f concat -safe 0 -i "$TMP/list.txt" \
  -i receipt_bottom.png \
  -i receipt_top_1.png \
  -i receipt_top_2.png \
  -i receipt_top_3.png \
  -i receipt_top_4.png \
  -i receipt_top_5.png \
  -filter_complex "
    [0:v]tpad=stop_mode=clone:stop_duration=3[padded];
    [padded][1:v]overlay=x=0:y=main_h-overlay_h[b];
    [b][2:v]overlay=x=0:y=0:enable='between(t,0,1.5)'[o1];
    [o1][3:v]overlay=x=0:y=0:enable='between(t,1.5,4)'[o2];
    [o2][4:v]overlay=x=0:y=0:enable='between(t,4,8)'[o3];
    [o3][5:v]overlay=x=0:y=0:enable='between(t,8,13.5)'[o4];
    [o4][6:v]overlay=x=0:y=0:enable='between(t,13.5,16.5)'[out]
  " \
  -map "[out]" \
  -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p -movflags +faststart -an \
  app-xlayer-demo-receipts.mp4

echo
echo "wrote: $(pwd)/app-xlayer-demo-receipts.mp4"
ffprobe -v error -show_entries stream=width,height -show_entries format=duration \
        -of default=noprint_wrappers=1 app-xlayer-demo-receipts.mp4
