# Demo VO script — Kajota Coach in Slack

Target: **≤ 2:45** total. Conversational, one-take is fine. Silences are OK — let each Slack UI change land visually before you talk over it.

Pacing tip: the script totals ~340 words. Aim for ~135 WPM (unhurried), which lands at ~2:30. Add ~15s of natural silence around each Slack UI change.

---

## Scene 1 · 0:00 – 0:20 · establish

*[Slack `#test` on screen, empty compose box, sidebar visible]*

> Kajota Coach is a Google ADK agent that lives inside your Slack workspace. It reads a merchant's live catalogue from MongoDB via the official MongoDB MCP server, and settles USDC escrow on-chain — from a slash command, with a teammate's approval.

*[type `/kajota help` — hit enter]*

*[help card appears]*

## Scene 2 · 0:20 – 0:35 · slash commands surface

> Four slash commands. Watch. Status. Pay. Help. And I can `@mention` the bot from any channel it's in.

*[type `/kajota status` — hit enter]*

## Scene 3 · 0:35 – 1:15 · proactive turn, MCP tool trace

*[silent 3-4 seconds while "Running the agent…" appears]*

*[status card lands with wishlist items + "Used 3 MCP tool calls: find, find, find" footer]*

> Slash status fires a proactive agent turn. Look at the footer — three MongoDB MCP find calls. Recent purchase, wishlist deltas, catalog recommendations. All from live Atlas data. No RAG indexer, no cache. Every reply is grounded in what's in the database right now.

*[type `/kajota pay yeezy-hoodie 150` — hit enter]*

## Scene 4 · 1:15 – 1:40 · pending card, buttons

*[pending card appears with Approve + broadcast / Deny buttons]*

> Slash pay is where Kajota Coach earns its keep. It doesn't broadcast anything yet. First it resolves the on-chain listing id from our Mesh CosellRegistry — you can see it right there. Then it posts a Block Kit card in-channel with Approve and Deny buttons. A teammate has to sign off before we spend real money.

## Scene 5 · 1:40 – 2:35 · the flagship moment

*[click Approve + broadcast]*

*[card updates in-place: "Approved by @you — settling on-chain"; buttons gone; thread opens]*

> Watch what happens. The buttons vanish — that's `chat_update`. The card is stamped with the approver's name. And a new thread opens with live on-chain progress.

*[thread fills: approve broadcasting → confirmed → deposit broadcasting → confirmed → settled summary. Say each line as it appears — don't rush.]*

> USDC dot approve, broadcasting. Confirmed. CosellEscrow dot deposit, broadcasting. Confirmed. Escrow settled — a hundred and fifty USDC locked for yeezy-hoodie, both explorer links right there in the thread.

## Scene 6 · 2:35 – 2:50 · closer

*[hover over one explorer link or scroll to show whole thread]*

> Block Kit actions, `chat_update`, threaded receipts — Slack's own primitives doing the work. And Kajota Coach uses MCP twice — consuming MongoDB and Fetch through Google ADK, and exposing its own tools as an MCP server other agents can call. One agent, three transports: mobile, Slack, and MCP. Deployed on Render, settled on Mantle Sepolia.

---

## Not-said takes (if you re-record)

**Shorter (1:30) — headline-only cut:**

> Kajota Coach is a Slack agent that watches a merchant's live catalogue and settles USDC escrow on-chain. `/kajota status` fires three MongoDB MCP reads and posts a Block Kit carousel. `/kajota pay` doesn't broadcast — it posts an Approve/Deny card. A teammate clicks Approve, the buttons vanish, and a thread fills with live on-chain progress: `USDC.approve` confirmed, `CosellEscrow.deposit` confirmed, receipt on Mantle Sepolia. Block Kit, `chat_update`, threaded posts — Slack primitives, not a chatbot in a channel.

**Words to swap if they trip you up:**

- "USDC dot approve" instead of "USDC-approve" — reads more naturally
- "CosellEscrow dot deposit" same reason
- "twelve MCP tools" is wrong — it's five outbound (kajota MCP server) + two inbound (MongoDB, Fetch)

## Delivery notes

- **Don't rush the Approve moment.** Let the card update visually before speaking again. Silence sells the animation.
- **Don't apologise for the Slack app icon being generic** — nobody cares.
- **If Vertex quota trips mid-recording** and `/kajota status` errors, don't try to explain — cut, re-warm the service (`curl /healthz`), and re-record from Scene 2.
- **One-take beats polished.** Real voice, one flub if it happens, keep going. Slack ban on AI voice is just a norm — real-human enthusiasm is what wins the room.
