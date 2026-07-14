#!/usr/bin/env bash
#
# Stitch the four beats + voice-over + captions into the final <=90s
# demo video for OKX.AI Genesis.
#
# Input beat clips (drop them in this directory before running):
#   beat1_marketplace.mp4        20s — OKX.AI Coach card (screencap; see vo-script.md)
#   beat2_402_challenge.mp4      22s — vhs terminal (rendered by beat2_402_challenge.tape)
#   beat3_settlement.mp4         30s — signing/settlement flow (screencap or vhs)
#   beat4_asp_identity.mp4       14s — vhs terminal (rendered by beat4_asp_identity.tape) + OKLink cutaway
#
# VO input:
#   vo-raw.wav        recorded real-voice per vo-script.md
#
# Output:
#   demo-okx-genesis.mp4         <=90s final, ready for the Google Form
#
# Recipe follows [[feedback-demo-video-production]]:
#   1. Concatenate beat MP4s with the concat demuxer (no re-encode)
#   2. Re-encode the concatenated stream (H.264, 30 fps, faststart) so
#      Twitter / OKX Google Form accept it
#   3. Overlay the VO on the audio track (adelay+amix, so beat clips can
#      keep any UI sounds they had) — you can skip amix if beats are silent
#   4. Confirm final duration is under 90.000 seconds

set -euo pipefail

cd "$(dirname "$0")"

REQ=(beat1_marketplace.mp4 beat2_402_challenge.mp4 beat3_settlement.mp4 beat4_asp_identity.mp4 vo-raw.wav)
for f in "${REQ[@]}"; do
    [[ -f "$f" ]] || { echo "missing: $f"; exit 1; }
done

# 1. Concat list (concat demuxer)
{
    echo "file 'beat1_marketplace.mp4'"
    echo "file 'beat2_402_challenge.mp4'"
    echo "file 'beat3_settlement.mp4'"
    echo "file 'beat4_asp_identity.mp4'"
} > concat.txt

# 2. Concatenate + normalize (30 fps, 1080p canvas, H.264, faststart)
ffmpeg -y \
    -f concat -safe 0 -i concat.txt \
    -i vo-raw.wav \
    -filter_complex "[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,fps=30[v]; [1:a]adelay=0|0[a]" \
    -map "[v]" -map "[a]" \
    -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -profile:v high -level 4.1 -movflags +faststart \
    -c:a aac -b:a 192k -shortest \
    demo-okx-genesis.mp4

# 3. Verify duration <= 90s (Google Form + X thread cap)
duration=$(ffprobe -v error -show_entries format=duration -of csv=p=0 demo-okx-genesis.mp4)
awk -v d="$duration" 'BEGIN { if (d > 90.0) { print "FAIL: duration " d "s exceeds 90s cap"; exit 1 } else print "OK: duration " d "s under 90s cap" }'
