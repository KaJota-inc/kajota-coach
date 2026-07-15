# OKX Google Form + X thread — paste-ready copy

Once `demo-okx-genesis.mp4` is stitched and uploaded (YouTube unlisted /
Vimeo / Twitter native — pick what OKX judges can play), fill in the two
placeholder URLs at the top of this file, then copy each section verbatim
into its destination. Deadline: **Thu Jul 17 2026 22:59 UTC**.

## Fill these in first

- **VIDEO_URL**: `<paste unlisted YouTube link here>`
- **X_POST_URL**: `<paste after posting Tweet 1 — the thread root URL>`

---

## Google Form — https://forms.gle/mddEUagmDbyV37ws8

Standard OKX submission form fields based on the HackQuest page. If a
field the form actually asks for isn't listed below, use the
"Long-form writeup" section at the bottom as source material.

### ASP name

```
Kajota Coach
```

### ASP identity (agent id + chain)

```
Agent ID 5297 on X Layer mainnet (chainIndex 196). Registered via
onchainos agent create, tx 0x94acc7c122b93f50452593f74de44e8808f001020e6613cb529f0e34a504fced.
```

### ASP category / track

```
Revenue Rocket (primary) · Finance Copilot (secondary) · Best Product · Software Utility
```

### Live ASP endpoint

```
https://kajota-hub.onrender.com/coach-okx/coach/premium
```

### Repo link (GitHub)

```
https://github.com/KaJota-inc/kajota-coach/tree/hackathon/okx-asp
```

### X post link

```
{X_POST_URL}
```

### Demo video link

```
{VIDEO_URL}
```

### One-sentence description

```
An AI shopping concierge listed on OKX.AI as ASP 5297 that pays for its
own premium work with HTTP-native micropayments settled on X Layer —
and escrows real trades on-chain for A2A deals larger than a coffee.
```

### Team

```
Solo builder — Oluwabori Ola (github.com/KajotaInc · x.com/Oluwabori6 · t.me/BoriAdura)
```

### Long-form writeup (paste if the form has a "tell us more" field)

Same content as [agent/SUBMISSION_OKX.md](../agent/SUBMISSION_OKX.md).
Judge-friendly runbook: verifiable-claims table, 3-chain proof, 73-test
count, deploy runbook, honesty section on which chains are actually
backed by on-disk deployment JSON.

---

## X thread — post from @Oluwabori6 with #OKXAI

Post Tweet 1 first, get the URL, then reply-chain the other three.
Attach the video to Tweet 3 (native upload gives the best autoplay).

### Tweet 1 — Intro (260 chars)

```
Kajota Coach is live on OKX.AI as ASP 5297 — an Agent Service Provider that answers your shopping questions and pays for its own premium work.

Every call settles a $0.01 USDC micropayment on X Layer. No wallet popup. No human sign-off.

#OKXAI
```

### Tweet 2 — Use case (250 chars)

```
The problem: agents want to hire other agents but nobody wants a wallet popup every 3 seconds.

Kajota Coach answers HTTP 402 with an on-chain price tag. Buyer's agent signs one EIP-3009 authorization → facilitator settles on X Layer → answer delivered.

#OKXAI
```

### Tweet 3 — Demo video (attach the MP4)

```
Watch it: OKX.AI marketplace → Coach ASP → 402 → EIP-3009 signed → X Layer tx → deep-dive insight. All in under 6 seconds end-to-end.

Two services live under one ASP identity: A2MCP pay-per-call + A2A escrow. Two chains: X Layer + Ethereum Sepolia.

#OKXAI
```

### Tweet 4 — CTA (240 chars)

```
Try it: https://kajota-hub.onrender.com/coach-okx/coach/premium returns a live 402 challenge right now.

Judges — every on-chain claim resolves on OKLink X Layer. Full runbook at github.com/KaJota-inc/kajota-coach/tree/hackathon/okx-asp.

#OKXAI @okx
```

---

## Sanity checklist before submit

- [ ] `demo-okx-genesis.mp4` under 90.000 seconds (stitch.sh gate)
- [ ] Video plays without login (unlisted YouTube fine; private is not)
- [ ] `curl -s https://kajota-hub.onrender.com/coach-okx/coach/premium | jq '.accepts[0].network'` still returns `"eip155:195"`
- [ ] `onchainos agent get-agents --agent-ids 5297` shows the ASP present and not deactivated
- [ ] X thread posted, all four tweets showing, Tweet 3 has video
- [ ] Google Form filled with real URLs (not `{VIDEO_URL}` placeholders)
- [ ] Form submitted before Jul 17 22:59 UTC
- [ ] OKX internal review has responded on ASP 5297 (or if pending, submission still counts as long as the ASP endpoint is publicly reachable)
