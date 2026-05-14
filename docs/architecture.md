# Architecture

A 30-second mental model: **Coach is a server-side orchestrator with a thin mobile entry point.** Every AI capability already lives in Kajota's production backend. Coach composes them into one round-trip.

## High-level

```
┌──────────────────────────────┐          ┌────────────────────────────────────────────────┐
│   Mobile (this repo)         │          │   kajota-mobile-backend (Spring Boot, prod)    │
│                              │          │                                                │
│  CoachCaptureScreen          │  HTTPS   │   AIController                                 │
│  └─ POST /ai/coach/draft ────┼─────────►│   └─ CoachOrchestrator                         │
│         {imageBase64,        │          │      ├─ GoogleCloudVisionService               │
│          currency,           │          │      ├─ CategoryRepository (fuzzy match)       │
│          locale,             │          │      ├─ ProductRepository (price anchor)       │
│          includeSocial}      │          │      ├─ TextGenerationProvider (OpenAI)        │
│                              │          │      │  └─ GeminiService (fallback)            │
│  CoachReviewScreen           │          │      │     └─ FallbackContentGenerator         │
│  ◄─ CoachDraftPayload ───────┼──────────┤      └─ MongoDB Atlas Search                   │
│         {draft,              │          │                                                │
│          providersUsed,      │          │   Auth: existing OAuth2 JWT,                   │
│          pipelineTrace}      │          │         users sign in with their Kajota acct   │
└──────────────────────────────┘          └────────────────────────────────────────────────┘
```

## CoachOrchestrator — the pipeline

```text
draftListing(image) {
  1. vision         = GoogleCloudVisionService.fetchImageInfo(image)
                      → labels (score > 0.7), text blocks, dominant colors
  2. category       = best fuzzy match of vision labels against
                      CategoryRepository.findAll() (Jaccard + substring)
  3. anchor         = median(price for products in [category] AND ccy=$currency)
                      taken from ProductRepository.findByIdInAndCcy(...)
  4. title          = top-2 Vision labels (deterministic — fast)
  5-7. parallel ── join:
       description  = TextGenerationProvider.generateProductDescription(
                        title, category, []) → fallback to Gemini → template
       cosell-pct   = TextGenerationProvider.suggestCosellPercentage(
                        title, category, anchor, maxPct) → JSON
       social       = TextGenerationProvider.generateSocialContent(
                        title, anchor, category, platform, tone) → JSON
                      [WhatsApp + Instagram, in parallel]
  8. (locale != en) translation = GeminiService.generateTextSync(
                                     "translate to Yoruba/Igbo/Hausa…",
                                     description)
  return CoachDraftPayload{draft, providersUsed, pipelineTrace}
}
```

## Why parallel?

Sequential, the five LLM calls each take 2–5s → 10–25s total round-trip. With `CompletableFuture.allOf`, they run concurrently and the user-visible latency drops to roughly the slowest single call (~5–8s). The mobile-side progress overlay surfaces five stages over ~6s so the wait feels intentional, not stuck.

## Why composition is the hackathon angle

Each of the eight pipeline steps existed in Kajota's production backend before Coach. The build for this submission was:

| Step | Pre-existing | New for Coach |
|------|-------------|--------------|
| Vision (label / text / colour extraction) | ✅ `GoogleCloudVisionService` | — |
| Category match | ✅ `CategoryRepository` | Fuzzy-match algorithm in orchestrator |
| Anchor price | ✅ `ProductRepository.findByIdInAndCcy` | Median calc in orchestrator |
| Title | — | Deterministic top-2 label join |
| Description | ✅ `TextGenerationProvider.generateProductDescription` | — |
| Cosell-pct | ✅ `TextGenerationProvider.suggestCosellPercentage` | — |
| Social captions | ✅ `TextGenerationProvider.generateSocialContent` | — |
| Translation | ✅ `GeminiService.generateTextSync` | New prompt template (yo/ig/ha) |

So **Coach v1 added ~600 LOC of orchestration and zero new AI integrations**. The contribution is the workflow that turns "ten possible API calls" into "one tap → fully-drafted listing."

## File map (server side)

In `KaJota-inc/mobile-backend` on the `hackathon/coach` branch:

- `controller/AIController.java` — new `POST /ai/coach/draft` method (49 lines added)
- `service/ai/CoachOrchestrator.java` — 395 lines, the actual pipeline
- `service/ai/JsonExtract.java` — 96 lines, regex helpers promoted out of `AIController` so both the controller's existing endpoints and Coach reuse the same JSON extractors
- `model/dto/request/CoachDto.java` — 129 lines, request/response DTOs

## File map (mobile, this repo)

- `App.tsx` — auth gate + navigation (76 lines)
- `src/screens/SignInScreen.tsx` — log into existing Kajota account
- `src/screens/HomeScreen.tsx` — pitch + entry point
- `src/screens/CoachCaptureScreen.tsx` — camera/gallery + 5-stage progress UI
- `src/screens/CoachReviewScreen.tsx` — editable drafts + "Why we suggested this" + collapsible pipeline trace
- `src/services/api.ts` — axios + base URL from app.json `extra`
- `src/services/auth.ts` — sign-in against `/user/sign-in` + secure-store token
- `src/services/coach.ts` — single function `draftListing()` → `POST /ai/coach/draft`
- `src/types/index.ts` — TypeScript shapes mirroring `CoachDto.java` 1:1

## What's intentionally not in this repo

- **Publishing** — `CoachReviewScreen` ends in a demo confirmation rather than wiring the user-confirmed fields into `/product/{id}/add-to-cosell-store`. That step already works in the production Kajota app and would distract from the AI flow being judged. The production wiring lives in `KaJota-inc/kajota` on `hackathon/coach`.
- **Account creation** — Coach piggybacks on existing Kajota accounts. Judges either use a demo account or sign up via the production app.
- **The agent layer** — multi-turn, tool-use, x402 — is the planned v2 (`kajota-agent`).
