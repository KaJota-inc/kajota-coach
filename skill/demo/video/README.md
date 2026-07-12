# Demo video — how it's built

All CLI. Produces `../kajota-trade-demo.mp4` (1920x1080, ~30s, silent + captioned).

1. **Terminal beat** — `vhs demo.tape` → `kajota-trade-terminal.mp4`
   (runs `pnpm demo:trade-finance` in kajota-mesh @ hackathon/ignyte-polygon).
2. **Cards + caption** — `python3 gen_cards.py` → `card_title/proof/outro.png` + `cap_terminal.png`.
3. **Composite** — one ffmpeg pass: title (4s) → terminal+caption (16.6s) →
   proof (5s) → outro (4s), each scaled/padded to 1920x1080 over `0x0E0E11`,
   caption overlaid with `format=rgba` + `enable='between(t,1,15.5)'`, concat.

Silent by design (captions carry the story) — narrate in your own voice or
submit as-is. Upload unlisted to YouTube for the Ignyte submission.
