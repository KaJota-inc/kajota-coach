# Kajota Coach

> An AI co-pilot that turns a single product photo into a complete co-sell listing — title, description, suggested price, suggested co-sell markup, and ready-to-share WhatsApp + Instagram captions — in about 8 seconds.

**Hackathon submissions:** AI Agent Olympics 2026 (Milan AI Week, lablab.ai) · TechHub Africa Hackathon 2026 · AWS Prompt the Planet Challenge.

**Runs on the production [Kajota](https://kajota.io) backend** — the same Spring Boot service powering the Kajota mobile app, Atlas Search index, and product catalogue. Kajota Coach is an extension that addresses the dominant onboarding friction for African micro-sellers: typing out long product listings.

---

## 🟠 Casper Agentic Buildathon 2026 — `hackathon/casper`

> **An AI agent that pays for its own premium work.** For the [Casper Agentic Buildathon](https://dorahacks.io/hackathon/casper-agentic-buildathon/), KaJota Coach became a Casper-native economic actor: a premium insight endpoint sits behind an **x402 paywall**, and the agent settles a **CEP-18 micropayment on Casper** to unlock it — no account, no card, no human in the loop.

**▶ Try it live (10 seconds, no install):** **https://kajota-hub.onrender.com/judge** — click "Pay & settle on Casper" and watch a real CEP-18 micropayment settle on-chain in front of you.

**Everything Casper is new on the `hackathon/casper` branch.** Base agent (Gemini + Google ADK + MongoDB/Fetch over MCP) pre-exists; the x402 layer, our deployed CEP-18 token, the client signer, the Casper MCP integration, and the mobile Premium screen are all original for this Buildathon.

### On-chain proof (Casper Testnet — all live & verifiable on cspr.live)

| What | Value |
|---|---|
| **Our CEP-18 contract** — "KaJota USD", implements `transfer_with_authorization` | package `354ca0ad7ef8c97a02b195a1f39e96908fd3bf20d6ec4255850d05f1784fb404` |
| **Contract deploy tx** | [`df084784…`](https://testnet.cspr.live/transaction/df0847848800502b1b6919c1ad9a2dc0845c309006382b21ef8ad759d7c4171a) |
| **x402 settlement tx** — a real agent `transfer_with_authorization`, gas paid by the sponsored feePayer | [`88c4153e…`](https://testnet.cspr.live/transaction/88c4153e211011915b7b7bc2af718ada2b506266512701a7488a80f77a58b4a3) |

### Try it (60 seconds, no install)

The live premium endpoint is x402-gated. A plain request returns the Casper price tag:

```bash
curl -s https://kajota-hub.onrender.com/concierge/coach/premium | jq
# → HTTP 402 with the x402 challenge: price (0.001 KaJota USD), asset, payTo, network, feePayer
```

Full step-by-step judge walkthrough (live API, local run, on-chain settlement, mobile app): **[TESTING.md](TESTING.md)**.

### Casper docs

- **[TESTING.md](TESTING.md)** — step-by-step testing playbook (start here)
- **[agent/CASPER.md](agent/CASPER.md)** — architecture, x402 wire-format findings, flow
- **[agent/RUNBOOK.md](agent/RUNBOOK.md)** — land a real on-chain settlement yourself
- **[agent/SUBMISSION.md](agent/SUBMISSION.md)** — full Buildathon write-up
- **Live API:** `https://kajota-hub.onrender.com/concierge` · **Demo video:** https://youtu.be/fFbvIZV52RA

---

## What problem this solves

Across emerging markets, micro-retailers ("co-sellers") buy stock from a wholesaler and resell to their personal network for a markup. Onboarding a single product into a digital marketplace requires:

1. taking and uploading a photo
2. writing a clear name + description
3. picking a category
4. pricing competitively
5. writing posts to share to WhatsApp, Instagram, etc.

Steps 2–5 are the bottleneck — they presume comfort with text, marketing copy, and pricing research. Coach collapses all four into "snap a photo, tap publish."

## How it works

```text
            ┌──────────────────────────────────────────────────────────┐
            │                     Mobile (Expo)                        │
            │   Capture → base64 → POST /ai/coach/draft                │
            └─────────────────────┬────────────────────────────────────┘
                                  │
                                  ▼
            ┌──────────────────────────────────────────────────────────┐
            │            Spring Boot CoachOrchestrator                  │
            │                                                           │
            │  1. Google Cloud Vision  → labels + text + colours        │
            │  2. Fuzzy category match → existing Kajota /category      │
            │  3. Anchor price          → median of products in cat+ccy │
            │  4. Title (deterministic) → top Vision labels             │
            │  ────────────────── parallel ────────────────────────     │
            │  5. Description           ┐                                │
            │  6. Cosell-pct + reason   │  OpenAI → Gemini → template   │
            │  7. WhatsApp + Instagram  ┘                                │
            │  ───────────────────────────────────────────────────       │
            │  8. (optional) Translate to Yoruba / Igbo / Hausa          │
            └──────────────────────────────────────────────────────────┘
```

Everything under "Spring Boot" already lives in the production Kajota backend (`GeminiService`, `TextGenerationProvider`, `GoogleCloudVisionService`, etc.). Coach is **composition, not new AI integration** — the hackathon angle is the chained-prompt workflow that makes the parts cohere.

See [`docs/architecture.md`](docs/architecture.md) for the file-level map.

## Running locally

```bash
git clone https://github.com/KaJota-inc/kajota-coach.git
cd kajota-coach
npm install
npm start
```

Then scan the Expo Go QR code with your phone, or press `i` (iOS Simulator) / `a` (Android emulator).

The app talks to the **production Kajota backend** at `https://kajota-mobile-backend-2.onrender.com/kajota-mobile-backend` out of the box. To point at a local backend, edit `app.json` → `expo.extra.kajotaApiBaseUrl`.

### Sign-in for the demo

The Coach API endpoint is **auth-required** server-side, so the app starts with a sign-in screen. Use any existing Kajota account, or request a demo account via the hackathon submission contact.

### One-shot demo flow

1. Sign in.
2. Tap **Try Kajota Coach** on the home screen.
3. **Take photo** of any product (a shoe, a bag of rice, a phone — anything physical).
4. Tap **Draft my listing with AI**.
5. Watch the 5-stage progress overlay (Vision → category → price → drafting → social).
6. On the review screen: every field is pre-filled. Edit any of them. Read the "Why we suggested this" explainer.
7. Tap **Publish to my store** to complete the loop (demo-mode confirmation).

## Tech stack

- **Mobile**: React Native + Expo SDK 51 + TypeScript
- **Backend orchestrator** (in [`KaJota-inc/mobile-backend`](https://github.com/KaJota-inc/mobile-backend) on the `hackathon/coach` branch): Spring Boot 2.7, Java 21, MongoDB
- **AI**: Google Cloud Vision · Gemini 2.5 Flash · OpenAI gpt-4o-mini (fallback chain)
- **Storage**: MongoDB Atlas (Atlas Search index `kajota_mobile_search01`)

## Why this is hackathon-grade

- **Real backend, not a toy demo.** Coach talks to the live Kajota production backend — the same Spring Boot service, Atlas Search index, and product catalogue powering the Kajota mobile app.
- **Composition over reinvention.** Coach reuses the existing `GeminiService` / `TextGenerationProvider` / `GoogleCloudVisionService` / `CategoryRepository` / `ProductRepository`. The hackathon contribution is the workflow that chains them, not new AI integration.
- **Graceful degradation.** OpenAI → Gemini → template fallback. Coach works even when one provider is quota-locked.
- **Cultural relevance.** Optional Yoruba / Igbo / Hausa translation; price anchored to local currency; tested in a Nigerian-first marketplace.

## Repo map

- `App.tsx` — root, auth gate, navigation
- `src/screens/SignInScreen.tsx` — log into existing Kajota account
- `src/screens/HomeScreen.tsx` — pitch + entry point
- `src/screens/CoachCaptureScreen.tsx` — camera/gallery + 5-stage progress
- `src/screens/CoachReviewScreen.tsx` — editable drafts + explainer + trace
- `src/services/api.ts` — axios + base URL from app.json `extra`
- `src/services/auth.ts` — sign-in + secure-store token
- `src/services/coach.ts` — POST /ai/coach/draft client
- `docs/` — architecture, pipeline, demo notes

## Roadmap

- **Kajota Agent (v2)** — multi-turn agentic version with tool-use, memory, and x402 micropayments for autonomous decisioning. Targets **Google Cloud Rapid Agent Hackathon** ($60K cash, Jun 11) + **Mantle Turing Test Phase 2** ($100K, Jun 15) + **AlgoBharat Regional**.
- **Kajota Mesh** — a Web3 sibling: on-chain co-sell commission split via Chainlink + Base. Combined Mantle Turing Test entry covers it (AI agents + on-chain financial decisions), plus AWS Activate Web3.

## License

MIT — see [`LICENSE`](LICENSE).
<!-- kajota-hub-note -->
## KaJota infrastructure

Part of the [KaJota](https://github.com/KaJota-inc) project. KaJota's Render web
services are consolidated onto a single always-on instance —
**[kajota-hub](https://kajota-hub.onrender.com)** — to stop free-tier
instance-hour exhaustion. If a service from this repo moved there, its live URL
is now a path on the hub (e.g. `/coach-okx`, `/mesh-okx`, `/concierge`,
`/slack`, `/mesh-skill`, `/witness`); see `HUB_MIGRATION.md` where present.
