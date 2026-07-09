#!/usr/bin/env bash
# Elaborate 75s captioned + Moira-voiced demo — twelve beats covering hook,
# live cycle, on-chain proof (Etherscan), OpenAPI docs, SKILL.md,
# AgentFacts (NANDA Index), history feed, and outro.
set -euo pipefail
cd "$(dirname "$0")"
FONT="/System/Library/Fonts/Supplemental/Arial Bold.ttf"
export PATH="/opt/homebrew/bin:$PATH"

rm -rf beats vo caps
mkdir -p beats vo caps

# ---------------------------------------------------------------------------
# 1. Normalize each anchor to 1920x1080 pillarbox on the playground dark bg
# ---------------------------------------------------------------------------
for name in landing running complete etherscan_release docs_page skillmd_page agentfacts_page; do
  ffmpeg -y -i ${name}.png \
    -vf "scale=-2:1080,pad=1920:1080:(1920-iw)/2:0:0x0B1220,setsar=1" \
    -frames:v 1 beats/${name}_1080.png -loglevel error
done

# ---------------------------------------------------------------------------
# 2. Zoom crops on the "complete" playground state
# ---------------------------------------------------------------------------
python3 - <<'PY'
from PIL import Image
SRC = Image.open("complete.png").convert("RGB")
def zoom(x1, y1, x2, y2, out):
    crop = SRC.crop((x1, y1, x2, y2))
    cw, ch = crop.size
    scale = min(1600 / cw, 900 / ch)
    nw, nh = int(cw * scale), int(ch * scale)
    resized = crop.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new("RGB", (1920, 1080), (11, 18, 32))
    canvas.paste(resized, ((1920 - nw) // 2, (1080 - nh) // 2))
    canvas.save(out, quality=95)
zoom(300, 460, 690, 600, "beats/beat_register_1080.png")
zoom(300, 600, 690, 770, "beats/beat_lock_1080.png")
zoom(300, 775, 690, 872, "beats/beat_release_1080.png")
zoom(700, 235, 1060, 340, "beats/beat_recent_1080.png")
print("zoom crops ok")
PY

# ---------------------------------------------------------------------------
# 3. Beat sheet — 12 beats, ~75s total
# ---------------------------------------------------------------------------
BEAT_IMG=(  \
  "beats/landing_1080.png"              \
  "beats/running_1080.png"              \
  "beats/complete_1080.png"             \
  "beats/beat_register_1080.png"        \
  "beats/beat_lock_1080.png"            \
  "beats/beat_release_1080.png"         \
  "beats/etherscan_release_1080.png"    \
  "beats/docs_page_1080.png"            \
  "beats/skillmd_page_1080.png"         \
  "beats/agentfacts_page_1080.png"      \
  "beats/beat_recent_1080.png"          \
  "beats/landing_1080.png"              \
)
BEAT_TXT=(  \
  "One click. Full on-chain escrow cycle on real Sepolia. No wallet keys required."   \
  "The service provisions two demo wallets and funds them from its treasury."         \
  "Six steps green in ninety-eight seconds. Four real transactions on Sepolia."       \
  "Step four. A fresh listing registered on the Cosell Registry contract."            \
  "Step five. Approve and deposit — both server-signed from the buyer wallet."        \
  "Step six. The seller is settled — real transaction hash, ready to click."          \
  "Every transaction verifiable on Sepolia Etherscan. Success. Nine cents to the seller. One cent as service fee." \
  "Twelve endpoints. Interactive OpenAPI docs. Wallet, escrow, and even an off-chain dispute channel." \
  "One SKILL dot M D file. Everything an agent needs to use the service, served straight from the deploy." \
  "Registered in the M I T NANDA Index. Discoverable across the internet of agents."  \
  "Every reviewer's run recorded in the shared history feed."                         \
  "KaJota Mesh Escrow. Real on-chain settlement, driven from HTTP alone."             \
)
BEAT_LEN=( 6 4 6 6 6 5 10 8 7 7 5 6 )

# ---------------------------------------------------------------------------
# 4. Voiceover per beat — macOS `say -v Moira`
# ---------------------------------------------------------------------------
for i in "${!BEAT_TXT[@]}"; do
  say -v Moira -r 165 -o vo/line_${i}.aiff "${BEAT_TXT[$i]}"
  ffmpeg -y -i vo/line_${i}.aiff -ar 48000 -ac 2 vo/line_${i}.wav -loglevel error
done

# ---------------------------------------------------------------------------
# 5. Caption PNGs
# ---------------------------------------------------------------------------
python3 <<'PY'
from PIL import Image, ImageDraw, ImageFont
import textwrap

FONT_PATH = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
lines = [
    "One click. Full on-chain escrow cycle on real Sepolia.",
    "Provisions two demo wallets, funded from treasury.",
    "Six steps green in 98 seconds. Four real Sepolia transactions.",
    "Step 4 — fresh listing registered on the Cosell Registry.",
    "Step 5 — approve + deposit, server-signed from the buyer wallet.",
    "Step 6 — seller settled. Real Sepolia transaction.",
    "Sepolia Etherscan proof — Success, 953 confirmations, USDC transferred.",
    "12 endpoints. Interactive OpenAPI. Wallet + escrow + off-chain dispute.",
    "SKILL.md — one file agents read to use everything, served from the deploy.",
    "Registered in the MIT NANDA Index — discoverable across agents.",
    "Every reviewer's run recorded in a shared history feed.",
    "KaJota Mesh Escrow — real on-chain settlement, driven from HTTP alone.",
]

W, H = 1920, 1080
BAR_H = 150
BAR_Y = H - BAR_H - 60
FILL = (10, 14, 24, 224)
TEXT = (240, 245, 255, 255)
BADGE_BG = (125, 211, 252, 255)
BADGE_FG = (11, 18, 32, 255)
FONT_MAIN = ImageFont.truetype(FONT_PATH, 42)
FONT_NUM = ImageFont.truetype(FONT_PATH, 42)

for i, text in enumerate(lines):
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((60, BAR_Y, W - 60, BAR_Y + BAR_H), radius=24, fill=FILL)
    num_text = f"{i+1:02d}"
    nw = 88; nx = 96; ny = BAR_Y + (BAR_H - 74) // 2
    d.rounded_rectangle((nx, ny, nx + nw, ny + 74), radius=16, fill=BADGE_BG)
    tb = d.textbbox((0, 0), num_text, font=FONT_NUM)
    tw, th = tb[2] - tb[0], tb[3] - tb[1]
    d.text((nx + (nw - tw) // 2 - tb[0], ny + (74 - th) // 2 - tb[1]),
           num_text, font=FONT_NUM, fill=BADGE_FG)
    wrapped = "\n".join(textwrap.wrap(text, width=80))
    d.multiline_text((nx + nw + 30, BAR_Y + 30), wrapped,
                     font=FONT_MAIN, fill=TEXT, spacing=6)
    im.save(f"caps/cap_{i}.png")
print("captions ok")
PY

# ---------------------------------------------------------------------------
# 6. Beat clips
# ---------------------------------------------------------------------------
for i in "${!BEAT_IMG[@]}"; do
  ffmpeg -y -loop 1 -i "${BEAT_IMG[$i]}" -t "${BEAT_LEN[$i]}" -r 30 \
    -c:v libx264 -pix_fmt yuv420p -crf 20 -tune stillimage \
    beats/beat_${i}.mp4 -loglevel error
done

# ---------------------------------------------------------------------------
# 7. Concat + captions + VO
# ---------------------------------------------------------------------------
: > beats/concat.txt
for i in "${!BEAT_IMG[@]}"; do echo "file 'beat_${i}.mp4'" >> beats/concat.txt; done
ffmpeg -y -f concat -safe 0 -i beats/concat.txt -c copy base.mp4 -loglevel error

# per-beat start times
starts=(0); sum=0
for i in "${!BEAT_LEN[@]}"; do starts[$i]=$sum; sum=$(( sum + BEAT_LEN[$i] )); done
TOTAL=$sum

# Chain caption overlays
CAP_INPUTS=""; IDX=1; FG=""; in_label="0:v"
for i in "${!BEAT_IMG[@]}"; do
  CAP_INPUTS+=" -loop 1 -t ${BEAT_LEN[$i]} -i caps/cap_${i}.png"
  start=${starts[$i]}; end=$(( start + BEAT_LEN[$i] ))
  next_label="v${i}"
  if [[ $i -eq $((${#BEAT_IMG[@]} - 1)) ]]; then next_label="voutput"; fi
  FG+="[${in_label}][${IDX}:v]overlay=0:0:enable='between(t,${start},${end})'[${next_label}];"
  in_label="${next_label}"; IDX=$((IDX + 1))
done
FG="${FG%;}"
ffmpeg -y -i base.mp4 $CAP_INPUTS -filter_complex "$FG" -map "[voutput]" \
  -c:v libx264 -pix_fmt yuv420p -crf 20 captioned.mp4 -loglevel error

# VO track
VO_INPUTS=""; VO_FG=""
for i in "${!BEAT_LEN[@]}"; do
  VO_INPUTS+=" -i vo/line_${i}.wav"
  ms=$(( starts[$i] * 1000 + 250 ))
  VO_FG+="[${i}:a]adelay=${ms}|${ms}[a${i}];"
done
MIX=""
for i in "${!BEAT_LEN[@]}"; do MIX+="[a${i}]"; done
VO_FG+="${MIX}amix=inputs=${#BEAT_LEN[@]}:normalize=0:dropout_transition=0,volume=1.7[aout]"
ffmpeg -y $VO_INPUTS -filter_complex "$VO_FG" -map "[aout]" vo_track.wav -loglevel error

# Final mux
ffmpeg -y -i captioned.mp4 -i vo_track.wav \
  -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest \
  kajota-mesh-skill-demo-v2.mp4 -loglevel error

echo ""
echo "=== output ==="
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height,sample_rate \
  -of default=noprint_wrappers=1 kajota-mesh-skill-demo-v2.mp4
ls -la kajota-mesh-skill-demo-v2.mp4
