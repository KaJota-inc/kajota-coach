#!/usr/bin/env bash
#
# Stitch the four beats + voice-over + captions into the final <=90s
# demo video for OKX.AI Genesis.
#
# Input beat clips (drop them in this directory before running):
#   beat1_marketplace.mp4        20s — OKX.AI Coach card / OKLink XLayer explorer
#   beat2_402_challenge.mp4      ~14s — vhs terminal
#   beat3_settlement.mp4         30s — signing/settlement flow slide
#   beat4_asp_identity.mp4       15s — vhs terminal + OKLink cutaway
#
# VO input:
#   vo-raw.wav        recorded real-voice per vo-script.md
#
# Output:
#   demo-okx-genesis.mp4         <=90s final, ready for the Google Form
#
# Uses the ffmpeg concat FILTER (not demuxer) because our beat clips
# have mismatched resolutions (PIL slides = 1920x1080 @ 30 fps, vhs
# terminals = 1440x{480,540} @ 25 fps). The demuxer stream-copies and
# silently drops frames on mismatch; the filter normalizes each input
# to 1080p / 30 fps before concatenating.

set -euo pipefail

cd "$(dirname "$0")"

REQ=(beat1_marketplace.mp4 beat2_402_challenge.mp4 beat3_settlement.mp4 beat4_asp_identity.mp4 vo-raw.wav)
for f in "${REQ[@]}"; do
    [[ -f "$f" ]] || { echo "missing: $f"; exit 1; }
done

# Each beat is scaled + padded to 1920x1080 with black bars if the aspect
# doesn't match, then framerate-normalized to 30 fps, before the concat
# filter joins them into one 78.88 s video track. The VO is mapped as
# the sole audio track (beat MP4s are silent by construction).
ffmpeg -y \
    -i beat1_marketplace.mp4 \
    -i beat2_402_challenge.mp4 \
    -i beat3_settlement.mp4 \
    -i beat4_asp_identity.mp4 \
    -i vo-raw.wav \
    -filter_complex "\
        [0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,fps=30,setsar=1[v0]; \
        [1:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,fps=30,setsar=1[v1]; \
        [2:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,fps=30,setsar=1[v2]; \
        [3:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,fps=30,setsar=1[v3]; \
        [v0][v1][v2][v3]concat=n=4:v=1:a=0[v]; \
        [4:a]adelay=0|0[a]" \
    -map "[v]" -map "[a]" \
    -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -profile:v high -level 4.1 -movflags +faststart \
    -c:a aac -b:a 192k -shortest \
    demo-okx-genesis.mp4

duration=$(ffprobe -v error -show_entries format=duration -of csv=p=0 demo-okx-genesis.mp4)
awk -v d="$duration" 'BEGIN { if (d > 90.0) { print "FAIL: duration " d "s exceeds 90s cap"; exit 1 } else print "OK: duration " d "s under 90s cap" }'
