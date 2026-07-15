# Kajota Coach

> An AI co-pilot that turns a single product photo into a complete co-sell listing — title, description, suggested price, suggested co-sell markup, and ready-to-share WhatsApp + Instagram captions — in about 8 seconds.

**Hackathon submissions:** AI Agent Olympics 2026 (Milan AI Week, lablab.ai) · TechHub Africa Hackathon 2026 · AWS Prompt the Planet Challenge.

**Runs on the production [Kajota](https://kajota.io) backend** — the same Spring Boot service powering the Kajota mobile app, Atlas Search index, and product catalogue. Kajota Coach is an extension that addresses the dominant onboarding friction for African micro-sellers: typing out long product listings.

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
## KaJota infrastructure — these services are on the hub

This branch's services are deployed on the consolidated **[kajota-hub](https://kajota-hub.onrender.com)** instance.

- **Coach ASP (live):** https://kajota-hub.onrender.com/coach-okx — x402 `/coach-okx/coach/premium` verified settling through the hub
- **Mesh SKILL (live):** https://kajota-hub.onrender.com/mesh-okx
- Previously standalone at `kajota-coach-okx` / `kajota-mesh-okx`

See [HUB_MIGRATION.md](HUB_MIGRATION.md) for the full mapping.
