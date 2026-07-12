"""Generate the title / on-chain-proof / outro cards + lower-third caption
for the Kajota Trade demo video (PIL, 1920x1080). Outputs PNGs next to
this script. Composite with ffmpeg (see README.md)."""
from PIL import Image, ImageDraw, ImageFont
import os
W,H = 1920,1080
BG=(14,14,17); PANEL=(22,22,27); ORANGE=(242,107,33); WHITE=(245,245,247)
MUTED=(154,160,166); GREEN=(52,199,89); LINE=(40,40,48)
SC=os.path.dirname(os.path.abspath(__file__))
FB="/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FR="/System/Library/Fonts/Supplemental/Arial.ttf"
def f(sz,bold=True): return ImageFont.truetype(FB if bold else FR, sz)
def ctr(d,y,txt,fnt,fill,W=W):
    w=d.textlength(txt,font=fnt); d.text(((W-w)/2,y),txt,font=fnt,fill=fill); return w
def base(): im=Image.new("RGB",(W,H),BG); return im, ImageDraw.Draw(im)

im,d=base(); d.rectangle([0,0,W,10],fill=ORANGE)
ctr(d,300,"Kajota Trade",f(120),WHITE)
ctr(d,470,"Invoice financing for African micro-SMEs - on Polygon",f(44,False),MUTED)
pill="SME TRADE FINANCE  ·  IGNYTE x POLYGON"
pw=d.textlength(pill,font=f(30)); x0=(W-pw)/2-30
d.rounded_rectangle([x0,600,x0+pw+60,670],35,fill=(30,22,16),outline=ORANGE,width=2)
ctr(d,617,pill,f(30),ORANGE); im.save(f"{SC}/card_title.png")

im,d=base(); d.rectangle([0,0,W,10],fill=ORANGE)
ctr(d,120,"Live on Polygon Amoy",f(84),WHITE)
ctr(d,235,"a real trade-credit score, anchored on-chain",f(40,False),MUTED)
px0,py0,px1,py1=360,330,1560,860
d.rounded_rectangle([px0,py0,px1,py1],28,fill=PANEL)
rows=[("ScoreAttestation","0x2eC77B54...04F1cd"),("attest tx","0x77a07d9e...c2984"),
      ("block","41860842"),("score","910 / 1000   ·   Band A"),("verifyPayload","true")]
y=py0+55
for k,v in rows:
    d.text((px0+55,y),k,font=f(38,False),fill=MUTED)
    vcol=GREEN if v=="true" else WHITE
    vw=d.textlength(v,font=f(40)); d.text((px1-55-vw,y),v,font=f(40),fill=vcol); y+=95
    if k!="verifyPayload": d.line([px0+40,y-20,px1-40,y-20],fill=LINE,width=1)
ctr(d,910,"amoy.polygonscan.com/tx/0x77a07d9e...c2984",f(30,False),MUTED)
im.save(f"{SC}/card_proof.png")

im,d=base(); d.rectangle([0,0,W,10],fill=ORANGE)
ctr(d,150,"Three deliverables. One flow.",f(76),WHITE)
items=[("Tokenized receivables","ReceivableRegistry - invoices as on-chain assets"),
       ("Smart-contract letter of credit","CosellEscrow - debtor pays, funds auto-split"),
       ("On-chain trade-credit scoring","ScoreAttestation - verifiable, privacy-preserving")]
y=340
for t,s in items:
    d.ellipse([430,y+12,470,y+52],fill=ORANGE)
    d.text((510,y),t,font=f(46),fill=WHITE)
    d.text((510,y+58),s,font=f(30,False),fill=MUTED); y+=150
ctr(d,860,"Turn an unpaid invoice into working capital - today.",f(38,False),ORANGE)
im.save(f"{SC}/card_outro.png")

im=Image.new("RGBA",(W,H),(0,0,0,0)); d=ImageDraw.Draw(im)
by=930; txt="One command:  score -> tokenize -> finance -> escrow LoC -> settle  ·  invariants asserted"
tw=d.textlength(txt,font=f(34)); bx=(W-tw)/2-40
d.rounded_rectangle([bx,by,bx+tw+80,by+72],20,fill=(10,10,13,220),outline=(242,107,33,255),width=2)
d.text((bx+40,by+18),txt,font=f(34),fill=WHITE); im.save(f"{SC}/cap_terminal.png")
print("cards written to", SC)
