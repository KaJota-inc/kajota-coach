#!/usr/bin/env bash
# Option-2 combined cut: full 89s CLI submission video + mobile receipt-mode
# clip as a phone-shaped inset overlaid during the matching CLI beats.
#
# Sync (chosen so mobile "Signed EIP-3009" and "Insight+tx" land on the
# CLI's onchainos signing / settlement moments — see captions.srt for the
# CLI beat windows):
#
#   CLI 33.5–36s  ← mobile Live 402 (2.5s) — transition Beat 2→3
#   CLI 36–40s    ← mobile Signed EIP-3009 (4s) — CLI onchainos signs
#   CLI 40–45.5s  ← mobile Insight + tx (5.5s) — CLI shows settlement
#   CLI 45.5–48.5s ← mobile End card (3s) — CLI wraps Settlement
#
# Mobile Beat 1 (Home) is skipped — the CLI Marketplace beat already
# covers "here's the ASP" so a mobile Home overlay would be redundant.
#
# CLI VO audio is preserved as-is (`-c:a copy`).
#
# Inset sizing: mobile scaled to 880px tall, framed with an 8px charcoal
# bezel to read as a phone. Positioned right of CLI content with 60px
# margin, vertically centered.

set -euo pipefail
cd "$(dirname "$0")"

ffmpeg -y \
  -i demo-okx-genesis.mp4 \
  -i app-xlayer-demo-receipts.mp4 \
  -filter_complex "
    [1:v]trim=start=1.5:end=16.5,setpts=PTS-STARTPTS,scale=-1:880,pad=iw+8:ih+8:4:4:color=0x1a1a1a[phone];
    [0:v][phone]overlay=x=W-w-60:y=(H-h)/2:enable='between(t,33.5,48.5)'[out]
  " \
  -map "[out]" -map 0:a \
  -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -profile:v high -level 4.1 -movflags +faststart \
  -c:a copy \
  demo-combined-pip.mp4

echo
echo "wrote: $(pwd)/demo-combined-pip.mp4"
ffprobe -v error -show_entries stream=width,height -show_entries format=duration \
        -of default=noprint_wrappers=1 demo-combined-pip.mp4
