#!/usr/bin/env bash
# Produce: title card + terminal recording + outro card + Moira VO → 1080p MP4
set -euo pipefail

cd "$(dirname "$0")"
FF="/opt/homebrew/bin/ffmpeg"
FP="/opt/homebrew/bin/ffprobe"
PY="python3"
FONT="/System/Library/Fonts/Supplemental/Arial Bold.ttf"

W=1920
H=1080
FPS=30
TERM_W=1600
TERM_H=950

TERM=two_agent_demo.mp4
[ -f "$TERM" ] || { echo "missing $TERM"; exit 1; }
TERM_DUR=$($FP -v error -show_entries format=duration -of default=nw=1:nk=1 "$TERM")
echo "terminal duration: ${TERM_DUR}s"

TITLE_DUR=5
OUTRO_DUR=5
TOTAL=$(awk -v t=$TERM_DUR -v h=$TITLE_DUR -v o=$OUTRO_DUR 'BEGIN{printf "%.2f", t+h+o}')
echo "total duration: ${TOTAL}s"

# ---- 1. Render title + outro cards via PIL --------------------------------
mkdir -p work vo caps
$PY - <<PY
from PIL import Image, ImageDraw, ImageFont
import os

W,H=$W,$H
FONT="$FONT"
BG=(14,14,17)
FG=(240,240,244)
ACCENT=(126,203,255)
DIM=(160,168,180)

def card(path, title, subtitle, tag=None):
    im=Image.new("RGB",(W,H),BG)
    d=ImageDraw.Draw(im)
    tf=ImageFont.truetype(FONT,72)
    sf=ImageFont.truetype(FONT,32)
    smf=ImageFont.truetype(FONT,22)
    # tag chip
    if tag:
        tw,th=d.textbbox((0,0),tag,font=smf)[2:]
        d.rounded_rectangle((W//2-tw//2-16,H//2-180,W//2+tw//2+16,H//2-180+th+16),radius=12,fill=(30,60,90))
        d.text((W//2-tw//2,H//2-180+6),tag,font=smf,fill=ACCENT)
    tw,th=d.textbbox((0,0),title,font=tf)[2:]
    d.text(((W-tw)//2,H//2-70),title,font=tf,fill=FG)
    for i,line in enumerate(subtitle.split("\n")):
        sw,sh=d.textbbox((0,0),line,font=sf)[2:]
        d.text(((W-sw)//2,H//2+40+i*46),line,font=sf,fill=DIM)
    im.save(path)

card("work/title.png","Two Agents. One Skill.","Buyer + seller settling a trade through NANDA-discoverable\nKaJota Mesh Escrow — no wallet keys on either side.","KAJOTA MESH ESCROW")
card("work/outro.png","Real settlement, HTTP alone.","Registered in the MIT NANDA Index.\nOne SKILL.md. Twelve endpoints. Any agent can call it.","kajota-mesh-skill.onrender.com")
print("cards ok")
PY

# ---- 2. Title clip (5s) + Outro clip (5s), 1920x1080 30fps ---------------
$FF -y -loop 1 -t $TITLE_DUR -i work/title.png -vf "scale=$W:$H,fps=$FPS,format=yuv420p" \
  -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p work/title.mp4 -loglevel error

$FF -y -loop 1 -t $OUTRO_DUR -i work/outro.png -vf "scale=$W:$H,fps=$FPS,format=yuv420p" \
  -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p work/outro.mp4 -loglevel error

# ---- 3. Normalize terminal to 1920x1080 with dark padding -----------------
# Terminal is 1600x950. Scale to fit within 1920x1000, then pad top+bottom.
$FF -y -i "$TERM" -vf "scale=1760:-2:flags=lanczos,pad=$W:$H:(ow-iw)/2:(oh-ih)/2:color=0x0E0E11,fps=$FPS,format=yuv420p" \
  -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p work/term_1080.mp4 -loglevel error

# ---- 4. Concat title + terminal + outro to a base track ------------------
cat > work/concat.txt <<CONCAT
file 'title.mp4'
file 'term_1080.mp4'
file 'outro.mp4'
CONCAT
$FF -y -f concat -safe 0 -i work/concat.txt -c copy work/base.mp4 -loglevel error
echo "base concat ok: $($FP -v error -show_entries format=duration -of default=nw=1:nk=1 work/base.mp4)s"

# ---- 5. Generate Moira VO per beat --------------------------------------
# Beats mapped to timeline (approx):
#   title:      0-5s     intro
#   scene 1 Discovery:   5-13s     ("Two AI agents...")
#   scene 2 Wallets:     13-25s
#   scene 3 Quote:       25-32s
#   scene 4 Lock:        32-42s
#   scene 5 Off-chain:   42-50s
#   scene 6 Release:     50-58s
#   outro:               58-65s

declare -a VO=(
 "Two AI agents settling a trade. Neither one holds a wallet key."
 "Buyer and seller each ask the KaJota Mesh Escrow skill for a managed wallet."
 "The skill funds them from treasury with USDC and ETH for gas."
 "The buyer converts ten cents into USDC base units."
 "Then locks the funds in escrow. The skill signs the approve and deposit transactions on Sepolia."
 "Off chain the seller ships the widget. The buyer verifies delivery."
 "On confirmation, the buyer authorises release. Real USDC lands in the seller's wallet on Ethereum Sepolia."
 "One SKILL dot MD. Two agents. Real on-chain settlement, driven from HTTP alone."
)
# corresponding start times in the timeline (seconds from t=0)
declare -a START=(2 8 15 22 30 38 47 58)

for i in "${!VO[@]}"; do
  /usr/bin/say -v Moira -r 165 -o "vo/line_${i}.aiff" "${VO[$i]}"
  $FF -y -i "vo/line_${i}.aiff" -ar 48000 -ac 2 -sample_fmt s16 "vo/line_${i}.wav" -loglevel error 2>/dev/null
  d=$($FP -v error -show_entries format=duration -of default=nw=1:nk=1 vo/line_${i}.wav)
  printf "  vo %d: %.2fs  starts at %ss\n" $i $d ${START[$i]}
done

# ---- 6. Mix VO with adelay + amix ---------------------------------------
MIX_INPUTS=""
FILTER=""
COUNT=${#VO[@]}
for i in "${!VO[@]}"; do
  MIX_INPUTS+=" -i vo/line_${i}.wav"
  MS=$((${START[$i]}*1000))
  FILTER+="[$((i+1)):a]adelay=${MS}|${MS},apad[a${i}];"
done
STREAMS=$(seq 0 $((COUNT-1)) | awk '{printf "[a%s]",$1}')
FILTER+="${STREAMS}amix=inputs=$COUNT:normalize=0:dropout_transition=0,volume=1.7[aout]"

$FF -y -i work/base.mp4 $MIX_INPUTS -filter_complex "$FILTER" \
  -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k -shortest \
  kajota-two-agent-demo.mp4 -loglevel error

echo ""
echo "=== output ==="
$FP -v error -show_entries stream=codec_name,width,height,sample_rate,duration -show_entries format=size -of default=nw=1 kajota-two-agent-demo.mp4
ls -la kajota-two-agent-demo.mp4

# ---- 7. Clean intermediates ---------------------------------------------
rm -rf work vo caps
