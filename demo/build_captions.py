"""Render lower-third caption PNGs for the OKX demo video.

Homebrew's ffmpeg 8.1.1 for macOS ships without libass, so the
`subtitles`/`ass` filter isn't available. Instead we render one
transparent PNG per caption and overlay them with ffmpeg's `overlay`
filter, gated by `enable='between(t,X,Y)'`. Same pattern documented in
[[feedback-demo-video-production]].

Each caption is a 1920px-wide PNG with white text on a semi-transparent
dark pill, meant to sit in the bottom third of the 1080p canvas. The
`stitch_captions.sh` wrapper composites all four onto
`demo-okx-genesis.mp4` in a single ffmpeg pass.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


HERE = Path(__file__).resolve().parent

WIDTH = 1920           # match the video canvas so overlay math is trivial
HEIGHT = 90            # single-line lower-third strip
PADDING_X = 40         # inner horizontal padding around the text
PADDING_Y = 22
BG_COLOR = (0, 0, 0, 180)          # semi-transparent black pill
TEXT_COLOR = (255, 255, 255, 255)  # pure white


def _load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    """Prefer Helvetica → SF Compact → Menlo → PIL default."""
    for candidate in (
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/SFCompact.ttf",
        "/System/Library/Fonts/Menlo.ttc",
    ):
        try:
            return ImageFont.truetype(candidate, size)
        except (OSError, ValueError):
            continue
    return ImageFont.load_default()


def render_caption(text: str, out_path: Path) -> None:
    """Draw one caption strip and save as a transparent PNG."""
    font = _load_font(38)

    # Measure the text so we can center + size the pill snugly.
    scratch = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(scratch)
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]

    pill_w = text_w + PADDING_X * 2
    pill_h = text_h + PADDING_Y * 2
    pill_x = (WIDTH - pill_w) // 2
    pill_y = (HEIGHT - pill_h) // 2

    img = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle(
        (pill_x, pill_y, pill_x + pill_w, pill_y + pill_h),
        radius=pill_h // 2,
        fill=BG_COLOR,
    )
    # Center the glyphs inside the pill; use anchor="lt" to compensate
    # for the bbox origin offset PIL gives us for descenders.
    text_x = pill_x + PADDING_X - bbox[0]
    text_y = pill_y + PADDING_Y - bbox[1]
    d.text((text_x, text_y), text, font=font, fill=TEXT_COLOR)

    img.save(out_path)
    print(f"wrote {out_path}")


CAPTIONS = [
    ("caption1.png", "ASP #5855  ·  XLayer mainnet"),
    ("caption2.png", "402 Payment Required  ·  self-documenting price tag"),
    ("caption3.png", "Settlement on XLayer  ·  EIP-3009 authorization  ·  no wallet popup"),
    ("caption4.png", "github.com/KaJota-inc/kajota-coach  ·  #OKXAI"),
]


def main() -> None:
    for name, text in CAPTIONS:
        render_caption(text, HERE / name)


if __name__ == "__main__":
    main()
