# Voice-over script — OKX.AI Genesis Hackathon demo (v2)

Target duration: **~65 seconds** of speech. Video runtime is 73.28 s, so
this leaves ~8 s of built-in slack after silence-trim. Last recording
delivered 108 s → 78 s trimmed (25% overshoot); this v2 is shorter and
paced so an honest read lands within slack even at a natural cadence.

## Recording

Record straight to `demo/vo-raw.wav` (or `~/Downloads/OKX.AI.m4a` — the
stitch pipeline converts m4a→wav automatically). Human voice only — no
`say`.

QuickTime → File → New Audio Recording → save. Or macOS Voice Memos +
export as m4a.

Post-record we run `ffmpeg silenceremove` to trim gaps >0.5 s — so
don't stress about pauses, just read at your natural rhythm.

---

## Script (read at conversational pace)

### Beat 1 — 0:00 → 0:20 (18 s of speech, 2 s tail)

> *(over the Beat 1 slide — ASP identity card, X Layer tx hash)*
>
> "This is Kajota Coach. It's a real AI shopping concierge, listed on
> OKX-dot-A-I as agent number five-eight-five-five, with an
> E-R-C-eight-oh-oh-four identity written to X Layer mainnet."

### Beat 2 — 0:20 → 0:34 (12 s of speech)

> *(cuts to terminal — beat2_402_challenge — curl / jq of the live 402)*
>
> "When a buyer agent asks Coach for a paid insight, Coach answers with
> an H-T-T-P four-oh-two — a live, on-chain price tag. Chain, asset,
> pay-to. All publicly verifiable."

### Beat 3 — 0:34 → 0:58 (22 s of speech)

> *(cuts to terminal — beat3_settlement — the real onchainos payment pay run)*
>
> "The buyer's OKX Agentic Wallet signs an E-I-P three-oh-oh-nine
> authorization for one cent of U-S-D-T on X Layer mainnet. This is a
> real signature from a real wallet, ready to broadcast. No pop-up. No
> human sign-off. That's the agent-native payment rail OKX-dot-A-I is
> here to standardize — and Coach speaks it today."

### Beat 4 — 0:58 → 1:13 (13 s of speech)

> *(cuts to terminal — beat4_asp_identity — agent get-agents 5855 output)*
>
> "Two services: pay-per-call insight, and A-to-A escrow. Multi-chain
> escrow live on X Layer, Ethereum Sepolia, and Arbitrum Sepolia. One
> agent that pays its own rent — Kajota Coach on OKX-dot-A-I."

---

## On-screen text overlays (already burned in by stitch.sh)

| Time | Text | Source |
|---|---|---|
| 0:03–0:19 | ASP #5855 · XLayer mainnet | `caption1.png` |
| 0:23–0:32 | 402 Payment Required · self-documenting price tag | `caption2.png` |
| 0:36–0:56 | Real EIP-3009 authorization signed · ready to broadcast on XLayer mainnet | `caption3.png` |
| 0:59–1:12 | github.com/KaJota-inc/kajota-coach · #OKXAI | `caption4.png` |

---

## Recording sanity checks before you record

- [ ] Coach `/coach/premium` returns 402 with `network: eip155:196` and `asset: 0x1e4a5963…d41d` —
      `curl -s https://kajota-hub.onrender.com/coach-okx/coach/premium | jq '{network: .accepts[0].network, asset: .accepts[0].asset}'`
- [ ] `onchainos agent get-agents --agent-ids 5855` still shows the ASP is registered
      (any of "Listing under review" / "approved" is fine)
- [ ] Registration tx `0x53c74e2700ccc3ab3661f34fa7858a1f600bd2c2fe8dc29d7307989be96c0074` viewable on OKLink X Layer
- [ ] All four beat MP4s exist in `demo/` (`beat1_marketplace.mp4`, `beat2_402_challenge.mp4`, `beat3_settlement.mp4`, `beat4_asp_identity.mp4`)

---

## Delivery notes

- **Say the numbers slowly.** "Five-eight-five-five" (not fifty-eight
  fifty-five). "Four-oh-two" (not four-hundred-two).
- **Breathe between beats.** stitch.sh silence-trims anything > 0.5 s so
  natural pauses cost you nothing on the timeline.
- **One take is enough.** Slight um's read as authentic, not sloppy.
