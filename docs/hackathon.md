# Hackathon submission notes

A copy of the talking points for the two submissions: TechHub Africa Hackathon 2026 and AWS Prompt the Planet Challenge.

## What we built

Kajota Coach — an AI co-pilot inside a production-scale African marketplace that lets a co-seller add a complete product listing by snapping one photo. Title, description, category, suggested price (anchored to real catalog data), suggested co-sell markup with reasoning, and ready-to-share WhatsApp + Instagram captions, all returned in ~8 seconds.

## Why this is hackathon-worthy

1. **Real impact, real catchment.** Kajota is a live marketplace on the App Store + Google Play with paying micro-sellers in Nigeria. Coach removes the dominant onboarding friction — long-form text input — for a population where comfort with marketing copywriting is low.
2. **Composition over a toy.** Coach reuses existing production AI capabilities (Google Vision, Gemini 2.5 Flash, OpenAI fallback, MongoDB Atlas Search). The hackathon contribution is the prompt-chaining workflow that turns ten possible API calls into one tap. That's measurable engineering, not GPT pixie dust.
3. **Graceful degradation.** The orchestrator runs OpenAI → Gemini → template fallback at every LLM step. Production has a depleted OpenAI quota right now; Coach still works, demonstrably.
4. **Cultural relevance.** Optional Yoruba / Igbo / Hausa translation; price anchored to local currency; product descriptions tuned for Nigerian marketplace tone.

## Pitch for **TechHub Africa Hackathon 2026**

> Africa's informal economy runs on micro-distributors. Co-selling — buy stock, resell to your network — is how most retail trade happens. Listing a product in a digital marketplace is a written-text task in a population where the friction is text, not the trade. We built Coach as the AI co-pilot for that listing step. Snap a photo of stock, get a complete listing with title, description, category, price anchored to what others in your market charge for the same thing, and even the WhatsApp post ready to share — in your language. Coach ships inside the live Kajota app (App Store, Google Play) so the demo is "tap and feel," not a slideshow.

Categories we'll claim under the rubric:
- AI & Machine Learning (primary)
- Smart City — informal market digitisation
- Public Health-adjacent — broader inclusion of non-text-literate sellers in formal commerce

## Pitch for **AWS Prompt the Planet Challenge**

> Kajota Coach is a chained-prompt pipeline that composes Vision + LLM + database lookups into a single workflow optimised for the lowest-friction onboarding of micro-sellers in an emerging market. The "Prompt the Planet" angle: every listing Coach drafts shortens the digital-economy path for a small seller who otherwise wouldn't have one — and the prompts are tuned to local language, local currency, and local marketplace tone. The pipeline runs on AWS-deployable Spring Boot, uses Bedrock-compatible AI providers under the hood, and gracefully degrades through a three-tier fallback chain so the workflow holds in real network + quota conditions.

Categories we'll claim:
- Cloud Architecture (Render today, AWS-deployable Docker image)
- Generative AI
- Prompt Engineering (the chained-prompt orchestration is the headline)

## Demo script

**60-second demo**:

1. (0:00) Open the app, sign in with an existing Kajota account.
2. (0:05) Tap **Try Kajota Coach**.
3. (0:08) Tap **Take photo**. Snap a bag of rice, a pair of shoes, anything with a clear silhouette.
4. (0:15) Tap **Draft my listing with AI**. The 5-stage overlay starts:
   - "Looking at your photo…"
   - "Matching to a Kajota category…"
   - "Checking nearby market prices…"
   - "Drafting title + description…"
   - "Finishing your social captions…"
5. (0:23) Review screen opens. Show the title, the description, the suggested NGN price, the "Why we suggested this" panel listing the three reference products from the same category that anchored the price.
6. (0:30) Expand the WhatsApp caption block. The caption is ready to copy-paste.
7. (0:38) Tap the chevron on "How the AI got here ({n} steps)" — the pipeline trace shows the eight ordered events. (Judge eye-candy: this is the chained prompt audit log.)
8. (0:50) Tap **Publish to my store** — demo-mode confirmation.

## Architecture deep-dive

See [`architecture.md`](architecture.md) for the file map and pipeline diagram.

The one-page mental model:

```
[image] → [vision labels] → [fuzzy category match] → [anchor price] →
   {[title], [description], [cosell-pct], [social-whatsapp], [social-ig]}  ← all parallel
       → [optional translation] → return CoachDraftPayload
```

## What we'd build next (in priority order)

1. **Kajota Agent (v2)** — multi-turn agentic loop: agent asks clarifying questions ("Is this new or used?"), uses tools (search trending, check inventory, fetch competitor prices), and can actually take actions (publish, schedule a WhatsApp post). Targets AlgoBharat (agentic commerce + x402) and AI-agent tracks elsewhere.
2. **Listing performance feedback loop** — when a Coach-drafted listing sells, feed the success signal back into the prompts so the system learns what actually converts in each category.
3. **Sub-Saharan currencies** — extend the anchor-price corpus + translation set to KES, GHS, ZAR (Coach's currency-aware logic already supports this; just needs data).

## Team / credits

Solo build by [@bori7](https://github.com/bori7), founder of Kajota. The production Kajota app, on which Coach is built, has been in development since early 2026.

## Links

- **Production app**: [kajota.io](https://kajota.io) · [App Store](https://apps.apple.com/us/app/kajota/id6670166381)
- **Standalone Coach repo (this)**: https://github.com/KaJota-inc/kajota-coach
- **Production backend with the orchestrator**: https://github.com/KaJota-inc/mobile-backend (branch `hackathon/coach`)
- **Production mobile with Coach integration**: https://github.com/KaJota-inc/kajota (branch `hackathon/coach`)
