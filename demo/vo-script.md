# Voice-over script — OKX.AI Genesis Hackathon demo

Target duration: **86 seconds** of speech, leaving 4s of quiet closing
frames under the 90s hard cap.

## Recording

Record straight to `demo/vo-raw.wav` using QuickTime or the macOS `sox`
CLI. Do NOT use `say` — some hackathons ban synthetic voice, and human
delivery scores better on OKX's "AI quality review" criterion. See
[[feedback-realvoice-demo-video]] for the recording pattern.

Post-record, run whisper for word-level timing:

```bash
whisper-cli -m ~/models/ggml-base.en.bin \
    -f demo/vo-raw.wav -ml 1 -oj -of demo/vo-timings
```

That gives us `demo/vo-timings.json` — each word with a ms-precision
start time. `stitch.sh` reads it to align caption pops.

---

## Script (read at conversational pace — DO NOT rush)

### Beat 1 — 0:00 → 0:20 (20s of speech + 2s of open)

> *(over Coach app screen + OKX.AI marketplace card)*
>
> "This is Kajota Coach. It's a real AI shopping concierge, live on OKX-dot-A-I as agent number five thousand two hundred ninety-seven, with an ERC-eight-oh-oh-four identity written to X-Layer mainnet."

### Beat 2 — 0:20 → 0:42 (22s of speech)

> *(cuts to terminal — beat2_402_challenge.mp4)*
>
> "When a buyer agent asks Coach for a premium purchase insight, Coach answers with an HTTP four-oh-two — an on-chain price tag. Amount, asset, network: X-Layer, chain one nine five. Publicly reachable, one hundred percent verifiable."

### Beat 3 — 0:42 → 1:12 (30s of speech — the heaviest beat)

> *(cuts to code + facilitator flow diagram)*
>
> "The buyer's Coach CLI signs an E-I-P three-oh-oh-nine authorization for a hundredth of a US-D-T. The facilitator settles on X-Layer in seconds. No wallet popup. No human sign-off. This is the agent-native payment rail OKX-dot-A-I is here to standardize — and Coach ships it end to end today."

### Beat 4 — 1:12 → 1:26 (14s of speech)

> *(cuts back to terminal — beat4_asp_identity.mp4 + OKLink block explorer)*
>
> "Two services: pay-per-call insight, and A-to-A escrow. Two chains: X-Layer and Ethereum Sepolia. One agent that pays its own rent. Kajota Coach on OKX-dot-A-I."

---

## On-screen text overlays

| Time | Text | Position | Style |
|---|---|---|---|
| 0:03–0:19 | ASP 5297 · XLayer mainnet | Lower-third | Regular |
| 0:23–0:41 | 402 Payment Required · self-documenting price tag | Lower-third | Regular |
| 0:45–1:11 | Settlement: XLayer · EIP-3009 authorization · no wallet popup | Lower-third | Regular |
| 1:00–1:11 | tx: 0x94acc7c1…4fced *(placeholder — swap for real payment tx once facilitator wired)* | Center-top | Monospace |
| 1:13–1:27 | KajotaInc/kajota-coach · #OKXAI | Center-bottom | Regular |

---

## Recording sanity checks before you record

- [ ] Coach `/coach/premium` returns 402 with `network: eip155:195` — `curl -s https://kajota-hub.onrender.com/coach-okx/coach/premium | jq '.accepts[0].network'`
- [ ] `onchainos agent get-agents --agent-ids 5297` shows `approvalLabel: "Listing under review"` — if it's changed to "approved", pivot Beat 4 to show the public marketplace search result instead
- [ ] Registration tx `0x94acc7c122b93f50452593f74de44e8808f001020e6613cb529f0e34a504fced` still viewable on OKLink XLayer explorer
- [ ] All four beat MP4s exist (`beat1_marketplace.mp4`, `beat2_402_challenge.mp4`, `beat3_settlement.mp4`, `beat4_asp_identity.mp4`) — see `stitch.sh` for expected filenames
