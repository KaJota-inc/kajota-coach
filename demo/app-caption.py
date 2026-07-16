"""Render a persistent lower-third caption PNG for the app-focused demo clip.

Companion to `build_captions.py` — that script renders 4 story-beat PNGs for
the main submission video; this one renders a single always-on strip for
`app-xlayer-demo.mp4` so the clip stands on its own without a voiceover.
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent

# app-xlayer-demo.mp4 is 1170x2532 — the sim recorded the full iPhone screen.
WIDTH = 1170
STRIP_H = 200  # bottom band height — slim so it doesn't cover UI content
BG = (0, 0, 0, 205)
TITLE_COLOR = (255, 255, 255, 255)
SUB_COLOR = (247, 129, 102, 255)
FONT_TITLE = "/System/Library/Fonts/HelveticaNeue.ttc"
FONT_SUB = "/System/Library/Fonts/HelveticaNeue.ttc"


def main():
    img = Image.new("RGBA", (WIDTH, STRIP_H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, WIDTH, STRIP_H], fill=BG)

    title = "Kajota Coach — Premium on XLayer"
    sub = "OKX.AI ASP 5855 · x402 · EIP-3009 · pay-per-call"

    tf = ImageFont.truetype(FONT_TITLE, 46)
    sf = ImageFont.truetype(FONT_SUB, 34)

    tw = d.textlength(title, font=tf)
    sw = d.textlength(sub, font=sf)

    d.text(((WIDTH - tw) / 2, 40), title, font=tf, fill=TITLE_COLOR)
    d.text(((WIDTH - sw) / 2, 115), sub, font=sf, fill=SUB_COLOR)

    out = HERE / "app-caption.png"
    img.save(out, "PNG")
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
