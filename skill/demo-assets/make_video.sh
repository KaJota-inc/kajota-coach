#!/usr/bin/env bash
# Produce a captioned + voiced 1080p demo video from three real playground
# screenshots + the actual /demo/run transcript.  Pattern per memory:
#   normalize each still → PIL caption PNGs → macOS `say` per beat →
#   ffmpeg concat + overlays + adelay+amix VO.  Single-line filter_complex.
set -euo pipefail

cd "$(dirname "$0")"
FONT="/System/Library/Fonts/Supplemental/Arial Bold.ttf"
export PATH="/opt/homebrew/bin:$PATH"

# ---------------------------------------------------------------------------
# 0. Sanity + font
# ---------------------------------------------------------------------------
[[ -f "$FONT" ]] || { echo "missing font $FONT"; exit 1; }
command -v ffmpeg >/dev/null || { echo "no ffmpeg"; exit 1; }

rm -rf beats vo caps
mkdir -p beats vo caps

# ---------------------------------------------------------------------------
# 1. Normalize the three real playground frames to 1920x1080 pillarbox
# ---------------------------------------------------------------------------
for name in landing running complete; do
  ffmpeg -y -i ${name}.png \
    -vf "scale=-2:1080,pad=1920:1080:(1920-iw)/2:0:0x0B1220,setsar=1" \
    -frames:v 1 beats/${name}_1080.png -loglevel error
done

# ---------------------------------------------------------------------------
# 2. Zoom crops on the "complete" state for beats 4-7 (evidence of on-chain
# transactions).  Coords chosen from an inspection of complete.png rows.
# ---------------------------------------------------------------------------
python3 - <<'PY'
from PIL import Image, ImageDraw, ImageFont

SRC = Image.open("complete.png").convert("RGB")
W, H = SRC.size  # 1372 x 874

def zoom(x1, y1, x2, y2, out):
    # Crop, then scale to fit 1600x900 and pad to 1920x1080 with the same
    # dark bg the playground uses so the crop looks native rather than pasted.
    crop = SRC.crop((x1, y1, x2, y2))
    # Fit into 1600x900 keeping aspect
    cw, ch = crop.size
    scale = min(1600 / cw, 900 / ch)
    nw, nh = int(cw * scale), int(ch * scale)
    resized = crop.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new("RGB", (1920, 1080), (11, 18, 32))
    canvas.paste(resized, ((1920 - nw) // 2, (1080 - nh) // 2))
    canvas.save(out, quality=95)

# The rows in complete.png (measured):
#   registry.register  y ≈ 465 .. 595
#   escrow.lock        y ≈ 605 .. 765
#   escrow.release     y ≈ 775 .. 870
# The left panel spans roughly x ≈ 310 .. 680.
zoom(300, 460, 690, 600, "beats/beat4_register_1080.png")
zoom(300, 600, 690, 770, "beats/beat5_lock_1080.png")
zoom(300, 775, 690, 872, "beats/beat6_release_1080.png")
# Recent runs feed on the right side
zoom(700, 235, 1060, 340, "beats/beat7_recent_1080.png")
print("zoom crops ok")
PY

# ---------------------------------------------------------------------------
# 3. Beat sheet — text + duration + which image
# ---------------------------------------------------------------------------
BEAT_IMG=(  \
  "beats/landing_1080.png"          \
  "beats/running_1080.png"          \
  "beats/complete_1080.png"         \
  "beats/beat4_register_1080.png"   \
  "beats/beat5_lock_1080.png"       \
  "beats/beat6_release_1080.png"    \
  "beats/beat7_recent_1080.png"     \
)
BEAT_TXT=(  \
  "One click. Full on-chain escrow cycle on real Sepolia."          \
  "The service provisions two demo wallets and funds them from its treasury."  \
  "Six steps green in ninety-eight seconds. Four real Sepolia transactions."   \
  "Step four. A fresh listing registered on chain."                            \
  "Step five. Approve and deposit — both server-signed from the buyer wallet." \
  "Step six. Seller settled. The transaction lands on Sepolia."                \
  "Every reviewer's run recorded in the shared history feed."                  \
)
BEAT_LEN=( 5 4 6 5 5 5 4 )     # seconds per beat  (total = 34s)

# ---------------------------------------------------------------------------
# 4. Voiceover per beat — macOS `say`, one AIFF per beat, then bake WAV
# ---------------------------------------------------------------------------
for i in "${!BEAT_TXT[@]}"; do
  say -v Samantha -r 170 -o vo/line_${i}.aiff "${BEAT_TXT[$i]}"
  # Convert to 48kHz stereo WAV for reliable ffmpeg concat
  ffmpeg -y -i vo/line_${i}.aiff -ar 48000 -ac 2 vo/line_${i}.wav -loglevel error
done

# ---------------------------------------------------------------------------
# 5. PIL caption overlays — transparent 1920x1080 PNG w/ rounded bar bottom
# ---------------------------------------------------------------------------
python3 <<'PY'
from PIL import Image, ImageDraw, ImageFont
import json, os, textwrap

FONT_PATH = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
lines = [
    "One click. Full on-chain escrow cycle on real Sepolia.",
    "The service provisions two demo wallets and funds them from its treasury.",
    "Six steps green in 98 seconds. Four real Sepolia transactions.",
    "Step 4 — a fresh listing registered on chain.",
    "Step 5 — approve and deposit, both server-signed from the buyer wallet.",
    "Step 6 — seller settled. The transaction lands on Sepolia.",
    "Every reviewer's run recorded in the shared history feed.",
]

W, H = 1920, 1080
BAR_H = 150
BAR_Y = H - BAR_H - 60  # 60px bottom margin
FILL = (10, 14, 24, 220)          # translucent dark
TEXT = (240, 245, 255, 255)
NUM_BADGE_BG = (125, 211, 252, 255)  # accent (matches --accent)
NUM_BADGE_FG = (11, 18, 32, 255)
FONT_MAIN = ImageFont.truetype(FONT_PATH, 44)
FONT_NUM  = ImageFont.truetype(FONT_PATH, 44)

for i, text in enumerate(lines):
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # translucent bar
    d.rounded_rectangle((60, BAR_Y, W - 60, BAR_Y + BAR_H), radius=24, fill=FILL)
    # step number badge
    num_text = f"{i+1:02d}"
    nw = 88
    nx = 96
    ny = BAR_Y + (BAR_H - 74) // 2
    d.rounded_rectangle((nx, ny, nx + nw, ny + 74), radius=16, fill=NUM_BADGE_BG)
    # center the number text
    tb = d.textbbox((0, 0), num_text, font=FONT_NUM)
    tw, th = tb[2] - tb[0], tb[3] - tb[1]
    d.text((nx + (nw - tw) // 2 - tb[0], ny + (74 - th) // 2 - tb[1]),
           num_text, font=FONT_NUM, fill=NUM_BADGE_FG)
    # main line — wrap to a max width so it fits inside the bar
    max_line_chars = 78
    wrapped = "\n".join(textwrap.wrap(text, width=max_line_chars))
    tx = nx + nw + 30
    ty = BAR_Y + 30
    d.multiline_text((tx, ty), wrapped, font=FONT_MAIN, fill=TEXT, spacing=6)
    im.save(f"caps/cap_{i}.png")
print("captions ok")
PY

# ---------------------------------------------------------------------------
# 6. Build each beat: 1080p H.264, N-second still, letterbox already done
# ---------------------------------------------------------------------------
for i in "${!BEAT_IMG[@]}"; do
  ffmpeg -y -loop 1 -i "${BEAT_IMG[$i]}" \
    -t "${BEAT_LEN[$i]}" -r 30 \
    -c:v libx264 -pix_fmt yuv420p -crf 20 -tune stillimage \
    beats/beat_${i}.mp4 -loglevel error
done

# ---------------------------------------------------------------------------
# 7. Concat beats → base video
# ---------------------------------------------------------------------------
: > beats/concat.txt
for i in "${!BEAT_IMG[@]}"; do
  echo "file 'beat_${i}.mp4'" >> beats/concat.txt
done
ffmpeg -y -f concat -safe 0 -i beats/concat.txt -c copy base.mp4 -loglevel error

# ---------------------------------------------------------------------------
# 8. Overlay captions per beat.  Single-line filter_complex, looped inputs.
# ---------------------------------------------------------------------------
# Compute per-caption start time = sum of prior beat lengths.
CAP_INPUTS=""
CAP_FILTER="[0:v]"
prev="[0:v]"
starts=(0)
sum=0
for i in "${!BEAT_LEN[@]}"; do
  starts[$i]=$sum
  sum=$(( sum + BEAT_LEN[$i] ))
done

# Build -loop 1 caption inputs
IDX=1
for i in "${!BEAT_IMG[@]}"; do
  CAP_INPUTS+=" -loop 1 -t ${BEAT_LEN[$i]} -i caps/cap_${i}.png"
done

# Build filtergraph: chain overlays
FG=""
in_label="0:v"
for i in "${!BEAT_IMG[@]}"; do
  start=${starts[$i]}
  end=$(( start + BEAT_LEN[$i] ))
  next_label="v${i}"
  if [[ $i -eq $((${#BEAT_IMG[@]} - 1)) ]]; then next_label="voutput"; fi
  FG+="[${in_label}][${IDX}:v]overlay=0:0:enable='between(t,${start},${end})'[${next_label}];"
  in_label="${next_label}"
  IDX=$((IDX + 1))
done
FG="${FG%;}"

ffmpeg -y -i base.mp4 $CAP_INPUTS -filter_complex "$FG" -map "[voutput]" \
  -c:v libx264 -pix_fmt yuv420p -crf 20 captioned.mp4 -loglevel error

# ---------------------------------------------------------------------------
# 9. Build the VO track: adelay each line to its beat start, amix, boost
# ---------------------------------------------------------------------------
VO_INPUTS=""
VO_FG=""
for i in "${!BEAT_LEN[@]}"; do
  VO_INPUTS+=" -i vo/line_${i}.wav"
  ms=$(( starts[$i] * 1000 + 300 ))
  VO_FG+="[${i}:a]adelay=${ms}|${ms}[a${i}];"
done
# Mix
MIX=""
for i in "${!BEAT_LEN[@]}"; do MIX+="[a${i}]"; done
VO_FG+="${MIX}amix=inputs=${#BEAT_LEN[@]}:normalize=0:dropout_transition=0,volume=1.6[aout]"

ffmpeg -y $VO_INPUTS -filter_complex "$VO_FG" -map "[aout]" \
  vo_track.wav -loglevel error

# ---------------------------------------------------------------------------
# 10. Mux the VO onto the captioned base
# ---------------------------------------------------------------------------
ffmpeg -y -i captioned.mp4 -i vo_track.wav \
  -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest \
  kajota-mesh-skill-demo.mp4 -loglevel error

echo ""
echo "=== output ==="
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height,sample_rate -of default=noprint_wrappers=1 kajota-mesh-skill-demo.mp4
ls -la kajota-mesh-skill-demo.mp4
