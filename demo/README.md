# OKX.AI Genesis demo — build kit

Everything to assemble a ≤90-second submission video for the OKX.AI
Genesis Hackathon (Jul 8–17, 2026).

## Files

| File | What it does |
|---|---|
| `vo-script.md` | 86-second voice-over script, 4 beats, with on-screen text overlay cues and recording sanity checks |
| `beat2_402_challenge.tape` | `vhs` script for Beat 2 — terminal shows `curl` of `/coach/premium` returning the 402 challenge with `eip155:195` |
| `beat4_asp_identity.tape` | `vhs` script for Beat 4 — terminal shows `onchainos agent get-agents --agent-ids 5855` output |
| `stitch.sh` | Concatenates the four beat clips + VO, normalizes to 1080p / 30fps / H.264, verifies duration ≤ 90s |
| `beat*.mp4` | Rendered beat clips (dropped in here after you record or render them) |
| `vo-raw.wav` | Voice-over recording (produced by you per vo-script.md) |
| `demo-okx-genesis.mp4` | Final video output |

## Runbook

1. **Render the terminal beats** (already done if `beat2_402_challenge.mp4` and `beat4_asp_identity.mp4` exist):

   ```bash
   cd demo/
   vhs beat2_402_challenge.tape
   vhs beat4_asp_identity.tape
   ```

2. **Screen-capture the two visual beats** yourself (macOS: `⌘⇧5` or `simctl io booted recordVideo`):
   - `beat1_marketplace.mp4` — OKX.AI marketplace / OKLink XLayer explorer showing ASP 5855
   - `beat3_settlement.mp4` — code + signing flow (fallback: read the vo-script section 3 verbatim over a static "flow diagram" slide)

3. **Record the voice-over** (`vo-raw.wav`) reading `vo-script.md` at conversational pace. QuickTime → Audio Only → export as WAV.

4. **Stitch:**

   ```bash
   ./stitch.sh
   ```

   Produces `demo-okx-genesis.mp4`. Script exits non-zero if the result exceeds 90.000 seconds — retune beat cuts if that fires.

## Guardrails

- **No AI voice.** OKX's "AI quality review" heuristics likely penalize synthesized narration, and multiple sibling hackathons already ban it outright ([[feedback-realvoice-demo-video]]).
- **On-chain claims must be verifiable.** Every tx hash shown on screen must resolve on OKLink at capture time. Re-check before final export.
- **90-second cap is hard.** Google Form rejects longer files. `stitch.sh` self-checks; do not disable that gate.
