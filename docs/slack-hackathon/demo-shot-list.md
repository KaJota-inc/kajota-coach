# Demo video shot list — Kajota Coach in Slack

Target length: **≤ 3 minutes**. Devpost-standard. Screen recording of Slack + one browser tab (Mantle Sepolia explorer) is enough — no talking-head cutaway needed.

Recording tip: run at 1080p, disable Slack notification sounds, close other channels/DMs before recording so the sidebar isn't distracting.

---

## Setup (do NOT record)

1. Deploy `kajota-coach-slack` on Render (branch `hackathon/slack`). Confirm `/healthz` returns 200.
2. Register the Slack app from `slack-app-manifest.yaml` (replacing `<YOUR_RENDER_URL>` in both `request_url` fields).
3. Install to a fresh test workspace (**not** your main). Recommended name: **Kajota Studio**.
4. Add the bot to `#coach`. Fund the demo relayer wallet on Mantle Sepolia (faucet: https://faucet.sepolia.mantle.xyz). Set `MESH_RELAYER_PRIVATE_KEY` on Render.
5. Warm the agent (call `/healthz` twice + one `/kajota help`) so the Render free-tier cold-start doesn't eat 40s of your video.

## Scene 1 · 0:00–0:15 — establish

- Slack window on `#coach`. Empty channel. `@kajota` visible in the sidebar as an app.
- Type `/kajota help` — hit enter — help card appears. **This proves the bot is installed and responds inside the ack window.**

## Scene 2 · 0:15–0:40 — watchlist write via the MongoDB MCP

- Type `/kajota watch Yeezy 350 v2 size 11`
- Ephemeral "on it" appears.
- 3–6s later the in-channel card appears: `Watching: Yeezy 350 v2 size 11` header + `[CARDS]` block with the new wishlist item.
- Note in the caption bar: *"Live MongoDB Atlas write via the official MongoDB MCP server."*

## Scene 3 · 0:40–1:10 — proactive agent turn

- Type `/kajota status`.
- Card appears with 3 MongoDB MCP tool calls surfaced in the context footer + a card carousel: last purchase, wishlist deltas, one recommendation.
- Note: *"One command → 3 forced MongoDB reads → personalised Block Kit reply. No RAG indexer."*

## Scene 4 · 1:10–2:10 — team-approval + on-chain settlement (headline moment)

This is the differentiator. Slower pacing than the other scenes — let each Slack UI change land visually.

- Type `/kajota pay yeezy-hoodie 25`.
- Ephemeral confirms: *"Waiting for a teammate to approve."*
- 2–3s later, in-channel card appears:
  ```
  Escrow deposit — awaiting approval
  @you proposes to lock 25.00 USDC in the CosellEscrow for yeezy-hoodie.
  A workspace teammate should approve before we broadcast.
  Listing: 0x5c40ff15…  ·  Chain: Mantle Sepolia (5003)
  [Approve + broadcast] [Deny]
  ```
- Caption: *"On-chain USDC settlement — but a teammate has to sign off first. Slack's native buttons are the approval gate."*
- Click **Approve + broadcast**.
- Card updates in place: *"Escrow deposit — approved, settling on-chain — ✅ Approved by @you."* Buttons gone.
- Thread opens under the card. Show the 4 progress messages arriving in real time (this is why we cut the pacing wide):
  - 🔄 `USDC.approve` — broadcasting…
  - ✅ `USDC.approve` confirmed `0x…` (~10–15s later)
  - 🔄 `CosellEscrow.deposit` — broadcasting…
  - ✅ `CosellEscrow.deposit` confirmed `0x…` (~10–15s later)
- Final in-thread summary: *"🔏 Escrow settled — 25.00 USDC locked for yeezy-hoodie"* with both explorer links.
- Click the deposit link. Cut to Mantle Sepolia explorer tab. Point out (mouse hover) the `Deposited` event in the tx logs.

## Scene 5 · 2:10–2:40 — free-form @mention

- Back to Slack. Type `@kajota what are we watching right now?`
- Threaded reply with the wishlist Yeezy card. **This proves the same agent handles slash commands AND conversational mentions on one runner.**

## Scene 6 · 2:40–3:00 — close

- Split-screen: Slack channel on left, Render logs on right showing the tool trace (`mongodb.find`, `mongodb.insert-one`, `usdc.approve`, `cosellescrow.deposit`).
- Caption: *"One agent. Slack + mobile + on-chain. Built on Slack Bolt, Google ADK, MongoDB MCP, and web3.py — deployed on Render, settled on Mantle Sepolia."*

## Voiceover cue card (optional)

Cut to a static Kajota logo for 2s while the following plays:

> Kajota Coach turns your Slack workspace into a co-seller's control room.
> Slash-commands read your live merchant catalogue, watch for price drops,
> and settle escrow on-chain — from Slack, in three seconds of typing.
> One agent, three surfaces. Built on Slack Agent Builder.

---

## Devpost upload checklist

- [ ] YouTube upload (unlisted OK)
- [ ] Under 3 min
- [ ] Slack app visible for at least 30 total seconds
- [ ] At least one on-chain explorer link visible
- [ ] Public repo URL linked in description
