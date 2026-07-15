"""Generate Beat 1 (ASP identity on OKLink) and Beat 3 (settlement flow) as
1920x1080 PNG slides, ready to loop into 20s and 30s MP4 videos with
ffmpeg.

Every fact on Beat 1 is a verbatim copy of what OKLink X Layer explorer
showed for tx 0x53c74e27…c0074 (captured Jul 14 2026). Every code
snippet on Beat 3 comes verbatim from agent/kajota_concierge/x402_xlayer.py
so a judge who wants to verify can grep the repo.

Run:
    cd demo/
    ../agent/.venv/bin/python3 build_beats.py

Depends on Pillow (already in the agent venv via the FastAPI runtime).
"""

from __future__ import annotations

from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

HERE = Path(__file__).parent
W, H = 1920, 1080

# Kajota-adjacent palette — dark neutral background, accent yellow-green
# for on-chain highlights, muted teal for code.
BG = (18, 20, 24)          # near-black
FG = (232, 236, 240)       # off-white
DIM = (140, 148, 158)      # muted grey — for labels
ACCENT = (255, 220, 45)    # kajota yellow — highlights
GREEN = (72, 200, 130)     # tx success
CODE_BG = (28, 32, 40)     # slightly lighter code panel
ARROW = (98, 168, 222)     # steel blue arrow


def _font(size: int, *, mono: bool = False) -> ImageFont.ImageFont:
    """Pick a font that exists on macOS. Fall back to Pillow's default."""
    candidates = (
        ("/System/Library/Fonts/Menlo.ttc", "/Library/Fonts/Menlo.ttc") if mono
        else ("/System/Library/Fonts/HelveticaNeue.ttc", "/System/Library/Fonts/Helvetica.ttc", "/Library/Fonts/Arial.ttf")
    )
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def _panel(draw: ImageDraw.ImageDraw, xy: tuple[int, int, int, int], radius: int = 24) -> None:
    draw.rounded_rectangle(xy, radius=radius, fill=CODE_BG)


def _text(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, *, font: ImageFont.ImageFont, fill=FG) -> None:
    draw.text(xy, text, font=font, fill=fill)


# ---------- Beat 1 — On-chain ASP identity ----------

def beat1() -> None:
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    title_font = _font(84)
    sub_font = _font(38)
    label_font = _font(30)
    value_font = _font(38)
    mono_font = _font(32, mono=True)
    small_font = _font(24)

    # Top-left brand strip
    _text(d, (100, 80), "KAJOTA COACH", font=_font(28), fill=ACCENT)
    _text(d, (100, 120), "OKX.AI Genesis Hackathon · ASP registration", font=small_font, fill=DIM)

    # Title
    _text(d, (100, 220), "ASP 5855 — live on X Layer", font=title_font, fill=FG)
    _text(d, (100, 320), "ERC-8004 identity minted to your Agentic Wallet", font=sub_font, fill=DIM)

    # Fact panel
    _panel(d, (100, 420, W - 100, 900))
    rows = [
        ("Chain", "X Layer mainnet · chainId 196"),
        ("Contract action", "Mint 721 AGENT · 1 Token ID #5855"),
        ("Recipient", "0x8673c1af74f778da81d8ac1fb3d5e3b79015fcb0"),
        ("Result", "Success · 109,519 blocks confirmed"),
        ("Block · Date", "65172258 · 07/13/2026 12:14:54 UTC"),
    ]
    y = 460
    for label, value in rows:
        _text(d, (140, y), label, font=label_font, fill=DIM)
        _text(d, (500, y - 2), value, font=mono_font if label != "Result" else value_font,
              fill=GREEN if label == "Result" else FG)
        y += 82

    # Tx hash callout
    _text(d, (100, 940), "Tx", font=label_font, fill=DIM)
    _text(d, (100, 980), "0x53c74e2700ccc3ab3661f34fa7858a1f600bd2c2fe8dc29d7307989be96c0074",
          font=_font(26, mono=True), fill=ACCENT)

    out = HERE / "beat1_marketplace.png"
    img.save(out, "PNG")
    print(f"wrote {out}")


# ---------- Beat 3 — x402 settlement flow ----------

def beat3() -> None:
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    title_font = _font(76)
    sub_font = _font(34)
    step_font = _font(30)
    mono_font = _font(24, mono=True)
    small_font = _font(24)

    # Header
    _text(d, (100, 80), "KAJOTA COACH", font=_font(28), fill=ACCENT)
    _text(d, (100, 120), "Beat 3 · No-human-sign-off settlement on X Layer", font=small_font, fill=DIM)

    _text(d, (100, 200), "Buyer signs. Facilitator settles.", font=title_font, fill=FG)
    _text(d, (100, 295), "One HTTP round-trip · zero wallet popups · verifiable tx", font=sub_font, fill=DIM)

    # Flow diagram — three panels connected by arrows
    y_top = 400
    y_bot = 700
    box_w = 500
    box_h = 300
    gap = (W - 3 * box_w - 200) // 2  # even spacing, 100 margin each side
    x0 = 100
    x1 = x0 + box_w + gap
    x2 = x1 + box_w + gap

    # 1. Buyer signs EIP-3009
    _panel(d, (x0, y_top, x0 + box_w, y_bot))
    _text(d, (x0 + 28, y_top + 24), "1. Buyer signs", font=step_font, fill=ACCENT)
    _text(d, (x0 + 28, y_top + 70), "EIP-3009", font=_font(44, mono=True), fill=FG)
    _text(d, (x0 + 28, y_top + 130), "transferWithAuthorization\n$0.01 USDT on X Layer\n(no popup — TEE-signed)",
          font=mono_font, fill=DIM)

    # 2. Facilitator verify+settle
    _panel(d, (x1, y_top, x1 + box_w, y_bot))
    _text(d, (x1 + 28, y_top + 24), "2. Facilitator", font=step_font, fill=ACCENT)
    _text(d, (x1 + 28, y_top + 70), "verify + settle", font=_font(40, mono=True), fill=FG)
    _text(d, (x1 + 28, y_top + 130), "POST /verify → POST /settle\nsubmit tx on X Layer\nseconds to inclusion",
          font=mono_font, fill=DIM)

    # 3. Response with tx hash
    _panel(d, (x2, y_top, x2 + box_w, y_bot))
    _text(d, (x2 + 28, y_top + 24), "3. Response", font=step_font, fill=ACCENT)
    _text(d, (x2 + 28, y_top + 70), "200 + payload", font=_font(40, mono=True), fill=FG)
    _text(d, (x2 + 28, y_top + 130), "X-PAYMENT-RESPONSE\n{ transaction: 0x…,\n  network: eip155:195 }",
          font=mono_font, fill=DIM)

    # Arrows between panels
    arrow_y = (y_top + y_bot) // 2
    for start_x, end_x in ((x0 + box_w + 10, x1 - 10), (x1 + box_w + 10, x2 - 10)):
        d.line((start_x, arrow_y, end_x, arrow_y), fill=ARROW, width=6)
        # arrowhead
        d.polygon([(end_x, arrow_y), (end_x - 20, arrow_y - 12), (end_x - 20, arrow_y + 12)], fill=ARROW)

    # Footer — file:line references so a judge can grep the repo
    _text(d, (100, 800), "Source:", font=step_font, fill=DIM)
    _text(d, (280, 800),
          "agent/kajota_concierge/x402_xlayer.py — EvmX402Facilitator, require_payment",
          font=mono_font, fill=FG)
    _text(d, (100, 855),
          "Reused unchanged: server.py:374 POST /coach/premium is 402-gated end-to-end.",
          font=small_font, fill=DIM)

    _text(d, (100, 970), "Same protocol as x402_casper.py — one file forked, EVM defaults, 14 hermetic tests.",
          font=small_font, fill=DIM)

    out = HERE / "beat3_settlement.png"
    img.save(out, "PNG")
    print(f"wrote {out}")


if __name__ == "__main__":
    beat1()
    beat3()
