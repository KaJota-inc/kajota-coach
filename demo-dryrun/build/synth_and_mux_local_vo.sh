#!/usr/bin/env bash
# Local-voicing path: synthesize the 6 VO beats with macOS `say`,
# re-stitch the video to match the synthesized beat durations,
# and mux into mesh-near-recut.FINAL.mp4.
#
# This produces a quickly-reviewable AI-voiced cut. It is NOT a
# substitute for the user's own recorded VO on submission day —
# see the AI-voice caveat in MESH_RECUT_X_POST.md and the playbook
# ref to `[[feedback-realvoice-demo-video]]`. Use this to:
#   (a) sanity-check pacing before the user records,
#   (b) stand in as a last-resort fallback if real-voice recording
#       slips past the recording lock,
#   (c) demo the pipeline end-to-end on this machine.
#
# Usage:
#   ./build/synth_and_mux_local_vo.sh          # Samantha, 170wpm
#   VOICE=Daniel RATE=160 ./build/synth_and_mux_local_vo.sh
#
# Output:
#   mesh-near-recut.FINAL.mp4   — the muxed video
#   build/tmp/vo_local.wav       — the concatenated VO
#   build/tmp/beat_*.wav          — per-beat audio clips (kept for inspection)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCENES="$ROOT/scenes"
TMP="$ROOT/build/tmp"
VOICE="${VOICE:-Samantha}"
RATE="${RATE:-170}"

mkdir -p "$TMP"

# Six beat texts, verbatim from MESH_RECUT_RECORDING.md.
# Numbers written out to help TTS pronunciation; same text the user would read.
BEAT_1="On NEAR Intents, a confidential swap can return status SUCCESS while the money lands in the wrong account. Issue three-eighty-four, open as of today, has the receipts: zero point zero three nine ETH stuck in a solver sink account that keeps growing."

BEAT_2="We're Shield, Mesh, Coach — a post-signature destination verifier that reads the on-chain receiver ID back from each NEAR transaction, and halts the agent when it doesn't match the quote. Not a replacement for OutLayer's pre-sign policy — the layer that fires after."

BEAT_3="Here, Coach is orchestrating an eight-way revenue split across two chains. Each leg goes through Mesh's atomic escrow and gets its destination verified before signing."

BEAT_4="The replay against the two transaction hashes from issue three-eighty-four: Shield pulls the receiver ID, compares to the quoted recipient, flags mismatch, halts. Thirty-eight thousandths of an ETH that would have been lost — caught before the second signature."

BEAT_5="Kajota mesh dot vercel dot app — the counter ticks every real settlement. Eight cycles live, thirty-six transactions across Arbitrum Sepolia and Robinhood Chain. Clone the repo, run the replay script, see Shield halt on your own machine."

BEAT_6="Built at NEAR HACKATHON. Shield, Mesh, Coach. The thing that catches what pre-sign policy misses."

BEATS=("$BEAT_1" "$BEAT_2" "$BEAT_3" "$BEAT_4" "$BEAT_5" "$BEAT_6")

# Scene PNGs in beat order (scene N → beat N; scenes 1 and 3 aren't numbered
# but match beats 2 and 4 by naming)
SCENE_PNGS=(
  "scene_0_hostdefect.png"
  "scene_2_pitch.png"
  "scene_3_mesh_split.png"
  "scene_4_shield_verify.png"
  "scene_5_live_counter.png"
  "scene_6_closing.png"
)

# Clean previous run
rm -f "$TMP"/beat_*.aiff "$TMP"/beat_*.wav "$TMP"/silence_*.wav "$TMP"/vo_local.wav "$TMP"/concat_audio.txt "$TMP"/*.mp4 "$TMP"/concat_video.txt

echo "[synth] voice=$VOICE rate=$RATE"
echo ""

# Silences we need: 0.9s between beats (5 of them) + 1.0s tail after beat 6 + 1.0s head
HEAD_SIL=1.0
BETWEEN_SIL=0.9
TAIL_SIL=1.0

# Generate silence clips once
ffmpeg -y -f lavfi -i "anullsrc=channel_layout=mono:sample_rate=48000" \
  -t "$HEAD_SIL" -c:a pcm_s16le "$TMP/silence_head.wav" >/dev/null 2>&1
ffmpeg -y -f lavfi -i "anullsrc=channel_layout=mono:sample_rate=48000" \
  -t "$BETWEEN_SIL" -c:a pcm_s16le "$TMP/silence_between.wav" >/dev/null 2>&1
ffmpeg -y -f lavfi -i "anullsrc=channel_layout=mono:sample_rate=48000" \
  -t "$TAIL_SIL" -c:a pcm_s16le "$TMP/silence_tail.wav" >/dev/null 2>&1

# Synthesize each beat, convert to 48kHz mono WAV, measure duration
declare -a BEAT_WAVS
declare -a BEAT_DURS

for i in 0 1 2 3 4 5; do
  n=$((i + 1))
  aiff="$TMP/beat_$n.aiff"
  wav="$TMP/beat_$n.wav"
  echo "[synth] beat $n"
  say -v "$VOICE" -r "$RATE" -o "$aiff" "${BEATS[$i]}"
  ffmpeg -y -i "$aiff" -ar 48000 -ac 1 -c:a pcm_s16le "$wav" >/dev/null 2>&1
  rm -f "$aiff"
  dur="$(ffprobe -v error -show_entries format=duration -of default=nk=1:nw=1 "$wav")"
  printf "        %.2fs\n" "$dur"
  BEAT_WAVS+=("$wav")
  BEAT_DURS+=("$dur")
done

# Build concat list: head_silence, beat_1, between, beat_2, between, ..., beat_6, tail
CONCAT="$TMP/concat_audio.txt"
{
  echo "file '$TMP/silence_head.wav'"
  for i in 0 1 2 3 4 5; do
    echo "file '${BEAT_WAVS[$i]}'"
    if [ "$i" -lt 5 ]; then
      echo "file '$TMP/silence_between.wav'"
    fi
  done
  echo "file '$TMP/silence_tail.wav'"
} > "$CONCAT"

echo ""
echo "[synth] concatenating audio"
ffmpeg -y -f concat -safe 0 -i "$CONCAT" -c:a pcm_s16le "$TMP/vo_local.wav" >/dev/null 2>&1

vo_dur="$(ffprobe -v error -show_entries format=duration -of default=nk=1:nw=1 "$TMP/vo_local.wav")"
printf "[synth] VO duration: %.2fs\n" "$vo_dur"
echo ""

# Re-stitch the video so each scene matches its beat's duration + between-silence tail.
# Scene 1 also carries the head silence.
echo "[stitch] rebuilding video to match VO beat durations"
VIDEO_CONCAT="$TMP/concat_video.txt"
rm -f "$TMP"/scene_*.mp4 "$VIDEO_CONCAT"

for i in 0 1 2 3 4 5; do
  n=$((i + 1))
  png="$SCENES/${SCENE_PNGS[$i]}"
  beat="${BEAT_DURS[$i]}"
  # Scene duration = beat + trailing silence (between-silence for beats 1-5, tail for beat 6)
  # Beat 1 also gets the head silence preceding it, so add it here
  if [ "$i" -eq 0 ]; then
    extra=$(awk -v a="$HEAD_SIL" -v b="$BETWEEN_SIL" 'BEGIN{printf "%.3f", a+b}')
  elif [ "$i" -eq 5 ]; then
    extra="$TAIL_SIL"
  else
    extra="$BETWEEN_SIL"
  fi
  scene_dur=$(awk -v a="$beat" -v b="$extra" 'BEGIN{printf "%.3f", a+b}')
  printf "[stitch] scene %d  dur=%ss (beat=%ss + extra=%ss)\n" "$n" "$scene_dur" "$beat" "$extra"
  ffmpeg -y -loop 1 -framerate 30 -i "$png" \
    -t "$scene_dur" \
    -c:v libx264 -pix_fmt yuv420p -preset veryfast \
    -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x0a0f1e" \
    "$TMP/scene_$n.mp4" >/dev/null 2>&1
  echo "file '$TMP/scene_$n.mp4'" >> "$VIDEO_CONCAT"
done

TMP_VIDEO="$TMP/video_silent.mp4"
ffmpeg -y -f concat -safe 0 -i "$VIDEO_CONCAT" -c copy "$TMP_VIDEO" >/dev/null 2>&1

vid_dur="$(ffprobe -v error -show_entries format=duration -of default=nk=1:nw=1 "$TMP_VIDEO")"
printf "[stitch] video duration: %.2fs\n" "$vid_dur"
echo ""

# Normalize VO loudness and encode to AAC
echo "[mux] normalizing VO + encoding to AAC"
ffmpeg -y -i "$TMP/vo_local.wav" \
  -af "loudnorm=I=-16:LRA=11:TP=-1.5" \
  -c:a aac -b:a 192k -ar 48000 -ac 2 \
  "$TMP/vo_local_normalized.aac" >/dev/null 2>&1

# Mux
OUT="$ROOT/mesh-near-recut.FINAL.mp4"
echo "[mux] muxing → $OUT"
ffmpeg -y -i "$TMP_VIDEO" -i "$TMP/vo_local_normalized.aac" \
  -map 0:v -map 1:a \
  -c:v copy -c:a copy \
  -shortest \
  -movflags +faststart \
  "$OUT" >/dev/null 2>&1

final_dur="$(ffprobe -v error -show_entries format=duration -of default=nk=1:nw=1 "$OUT")"
final_size="$(stat -f%z "$OUT" 2>/dev/null || stat -c%s "$OUT")"

echo ""
echo "[done] $OUT"
printf "       duration: %.2fs\n" "$final_dur"
printf "       size:     %s bytes\n" "$final_size"
printf "       voice:    %s @ %swpm\n" "$VOICE" "$RATE"
echo ""
echo "NOTE: this is an AI-voiced local cut. Per MESH_RECUT_X_POST.md, the"
echo "submission's canonical demo should use real voice (user-recorded)."
echo "Use this cut for pacing review + screenshots-only fallback only."
