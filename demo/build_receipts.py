"""Build the Option-C receipt-mode assets for the app-focused demo cut.

Emits:
  receipt_bottom.png   — persistent lower-third with endpoint + repo (2 lines)
  receipt_top_1.png    — Home
  receipt_top_2.png    — Live 402
  receipt_top_3.png    — EIP-3009 signed
  receipt_top_4.png    — Insight + on-chain receipt
  receipt_top_5.png    — End card

Companion to `app-caption.py` (single-strip version) and `build_captions.py`
(the story-beat PNGs for the CLI-focused submission video).
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
WIDTH = 1170  # matches raw clip iPhone-native width

FONT_PATH = "/System/Library/Fonts/HelveticaNeue.ttc"

WHITE = (255, 255, 255, 255)
BRAND = (247, 129, 102, 255)  # Kajota orange
DIM = (200, 200, 200, 255)
BG = (0, 0, 0, 215)


def strip(text_lines, height, sizes, colors, out_name, y_offsets=None):
    """Render a semi-opaque strip PNG with N centered text lines.

    text_lines / sizes / colors are parallel lists; y_offsets is optional
    per-line vertical offset from the top of the strip.
    """
    img = Image.new("RGBA", (WIDTH, height), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, WIDTH, height], fill=BG)

    if y_offsets is None:
        # even vertical distribution
        n = len(text_lines)
        pad = height // (n + 1)
        y_offsets = [pad * (i + 1) - sizes[i] // 2 for i in range(n)]

    for text, size, color, y in zip(text_lines, sizes, colors, y_offsets):
        f = ImageFont.truetype(FONT_PATH, size)
        w = d.textlength(text, font=f)
        d.text(((WIDTH - w) / 2, y), text, font=f, fill=color)

    out = HERE / out_name
    img.save(out, "PNG")
    print(f"wrote {out}")


def main():
    # Persistent bottom strip — endpoint + repo.
    strip(
        text_lines=[
            "kajota-hub.onrender.com/coach-okx · A2MCP",
            "github.com/KaJota-inc/kajota-coach · OKX.AI ASP 5855",
        ],
        sizes=[34, 30],
        colors=[WHITE, DIM],
        height=140,
        y_offsets=[26, 76],
        out_name="receipt_bottom.png",
    )

    # Top-of-frame beat chips. All are 130 tall so overlay math is simple.
    beats = [
        ("Home · tap Premium Insight", "receipt_top_1.png"),
        ("Live 402 · eip155:196 · Tether USD", "receipt_top_2.png"),
        ("EIP-3009 signed in embedded wallet", "receipt_top_3.png"),
        ("Insight + on-chain receipt · 0xa1b2…a1b3", "receipt_top_4.png"),
        ("ASP 5855 · A2MCP+A2A · OKX.AI", "receipt_top_5.png"),
    ]
    for text, out_name in beats:
        strip(
            text_lines=[text],
            sizes=[42],
            colors=[BRAND if "ASP 5855" in text else WHITE],
            height=130,
            y_offsets=[45],
            out_name=out_name,
        )


if __name__ == "__main__":
    main()
