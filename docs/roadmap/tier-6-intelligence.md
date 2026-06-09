# Tier 6 — Pricing oracle + demand intelligence

> **Hackathon target:** ETHGlobal NY 2026 (or standalone Q4 2026 launch).
> **Effort budget:** 6 days solo dev.
> **Risk:** Medium — data pipelines have ongoing ops burden but the
> core ML is well-trodden.

## The user-facing change

Today Coach's `anchorPrice` tool uses a simple median over Kajota's
existing catalogue. After Tier 6, the same tool returns market-aware
prices with confidence intervals and explanations:

> *"Suggested price ₦4,200/L for groundnut oil. Lagos median this week
> is ₦4,100 (down 3% week-over-week on softer NGN). Your inventory cost
> is ₦3,800, so this margin is 10% — slim. Want me to recommend a
> bundle pricing strategy instead?"*

And, periodically, Coach pushes notifications about demand surges:

> *"Umbrella sales doubled in Ibadan after yesterday's storm. You have
> 14 in stock at ₦1,500 each. Want me to mark 5 down to ₦1,800 to
> capture the wave?"*

## Why it matters

Informal-market sellers price by gut. Two consistent failure modes:

1. **Undercutting** — newly-imported goods are priced too low because
   the seller hasn't seen what competitors charge. Estimated 15-30%
   margin loss.
2. **Missing demand surges** — sellers miss windows where demand spikes
   (weather, exchange-rate moves, viral TikTok content) because they
   only see their own inventory.

Tier 6 gives sellers institutional-grade price intelligence at the same
cost as a Coach Agent call. That's a real productivity unlock for
informal commerce — the kind of advantage that until now was only
available to formal retailers with paid analytics subscriptions.

## Acceptance criteria

1. `anchorPrice` tool returns the same shape as today, plus three
   new fields:
   - `marketMedianPrice` — competitor-aware median for the same SKU.
   - `priceTrendWoW` — week-over-week direction (e.g., "−3%").
   - `confidence` — `'high' | 'medium' | 'low'` based on sample
     size and source diversity.
2. A new tool `marketIntelligence(productId)` returns:
   - Top 5 competitor prices (anonymised).
   - 30-day price history sparkline data.
   - Demand-indicator score (0-100).
   - Macro signal: any unusual FX movement affecting this SKU.
3. Push notifications fire when:
   - User's inventory of a product has demand-indicator > 80.
   - User's listing price is > 20% off market median (either direction).
   - A major macro event (FX move > 5%, weather, holiday) affects
     priced products.
4. Backend runs daily ETL on:
   - Catalog scraping of major Nigerian retailers (Jumia, Konga,
     PriceCheck, Wholesalers WhatsApp groups via Tier 5).
   - Open exchange rate API.
   - Google Trends API for product-name search interest.
5. All of the above runs without exceeding $30/month in API costs.

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    DATA INGESTION (daily ETL)                    │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────┐ │
│  │ Jumia       │  │ Konga        │  │ FX (Open ER) │  │ Google │ │
│  │ scraper     │  │ scraper      │  │ rates daily  │  │ Trends │ │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘  └────┬───┘ │
│         │                │                  │               │     │
│         └────────────────┼──────────────────┴───────────────┘     │
│                          ▼                                        │
│             ┌──────────────────────────┐                          │
│             │  Kafka topic: market.*   │                          │
│             └─────────────┬────────────┘                          │
└───────────────────────────┼───────────────────────────────────────┘
                            │
┌───────────────────────────┼───────────────────────────────────────┐
│                STORAGE + INFERENCE                                │
│                           ▼                                       │
│            ┌──────────────────────────────┐                       │
│            │  market_price_snapshot Mongo │                       │
│            │  market_signal Mongo         │                       │
│            │  fx_rate Mongo               │                       │
│            └──────────────┬───────────────┘                       │
│                           ▼                                       │
│            ┌──────────────────────────────┐                       │
│            │  MarketIntelligenceService   │                       │
│            │  - composite_score()         │                       │
│            │  - price_trend()             │                       │
│            │  - demand_surge_detector()   │                       │
│            └──────────────┬───────────────┘                       │
└───────────────────────────┼───────────────────────────────────────┘
                            │
┌───────────────────────────┼───────────────────────────────────────┐
│                  CONSUMPTION                                      │
│  ┌─────────────────┐   ┌──┴─────────────────┐  ┌─────────────────┐│
│  │ anchorPrice     │   │ marketIntelligence │  │ NotificationJob ││
│  │ (existing tool) │   │ (new tool)         │  │ (cron-driven)   ││
│  │   enriched      │   │                    │  │                 ││
│  └─────────────────┘   └────────────────────┘  └─────────────────┘│
└───────────────────────────────────────────────────────────────────┘
```

## Files to touch

### `kajota-mobile-backend`

**New microservice:** `ingest/` directory (or separate repo if Render's
free dyno can't handle the cron). Spring Boot scheduler with one job
per data source.

**New:** `service/intelligence/JumiaScraperService.java`

```java
@Service
public class JumiaScraperService {
    @Scheduled(cron = "0 0 4 * * *")  // 04:00 UTC daily
    public void scrape() {
        for (String category : CATEGORIES) {
            try {
                List<JumiaListing> listings = fetchCategory(category);
                for (var l : listings) {
                    publishToKafka(MarketPriceSnapshot.builder()
                        .productSku(normalize(l.getTitle()))
                        .source("jumia")
                        .priceNgn(l.getPrice())
                        .observedAt(Instant.now())
                        .build());
                }
            } catch (Exception e) {
                log.warn("Jumia scrape for {} failed: {}", category, e.getMessage());
            }
        }
    }
}
```

⚠️ **Legal note:** scraping public retailer pages is generally fine for
non-commercial use; for commercial deployment we should hit each
retailer's affiliate program / API where available. For Jumia, request
their affiliate API access first.

**New:** `service/intelligence/FxRateService.java`

Hits `https://openexchangerates.org/api/latest.json` (free tier
1000 reqs/month, ample for daily). Stores NGN/USD, NGN/GHS, NGN/KES,
NGN/CNY (sourcing).

**New:** `service/intelligence/GoogleTrendsService.java`

Use `serpapi` or `pytrends`-style approach. Daily snapshot of search
interest for each SKU in the user's catalog.

**New:** `service/intelligence/MarketIntelligenceService.java`

```java
public CompositeScore compositeScore(String productSku, String currency) {
    List<MarketPriceSnapshot> recent = mpRepo.findRecent(productSku, 7);
    BigDecimal marketMedian = median(recent);
    double trendWoW = computeTrend(recent);
    int demandScore = computeDemandScore(productSku);

    return CompositeScore.builder()
        .marketMedianPrice(marketMedian)
        .priceTrendWoW(trendWoW)
        .demandIndicator(demandScore)
        .confidence(deriveConfidence(recent.size()))
        .build();
}
```

**Modified:** `service/ai/CoachAgentService.java`

`toolAnchorPrice` enriches its existing response with the composite
score. The tool declaration in `buildToolDeclarations()` stays the
same shape — we're adding return-field richness, not new parameters.

**New tool:** `marketIntelligence`

```java
.put("name", "marketIntelligence")
.put("description",
    "Get rich market intelligence on a product: competitor prices, "
    + "week-over-week trend, demand indicator, and macro signals "
    + "that might affect price. Use when the user asks 'what's the "
    + "best price' or 'should I increase / decrease price' or "
    + "before recommending stock changes.")
```

**New:** `service/intelligence/DemandSurgeDetector.java`

Cron job that detects surges (search interest +30% day-over-day) and
fires push notifications to users with relevant inventory.

```java
@Scheduled(cron = "0 0 6 * * *")
public void detectSurges() {
    var surges = trendsRepo.findSurgesLast24h();
    for (var surge : surges) {
        var sellersWithStock = listingRepo.findActiveBySku(surge.getSku());
        for (var s : sellersWithStock) {
            pushService.sendDemandSurgeAlert(s.getSellerId(), surge);
        }
    }
}
```

### `kajota-coach` (mobile)

**Modified:** `src/screens/CoachAgentChatScreen.tsx`

Render the new market intelligence card when the agent calls
`marketIntelligence`. Sparkline of price history, competitor band, etc.

**New:** `src/components/MarketIntelligenceCard.tsx`

Visual representation of the composite score:
- Big number: suggested price.
- Below: small sparkline of 30-day median.
- Below: bullet points of factors ("FX moved −5% this week", "search
  interest +40%").

## Demand surge notification UX

A push notification like:

> 🚨 **Demand surge: Umbrellas**
> Search interest in your area is up 142% (heavy rain forecasted
> tomorrow). You have 14 in stock — market median is ₦2,200 (you're at
> ₦1,500). Open Coach to adjust prices.

Tap → opens Coach with a pre-staged `marketIntelligence` query.

## Data quality

Initial focus: 50 high-volume Nigerian SKUs (rice 50kg, groundnut oil
5L, palm oil, cement, sachet water, etc.). Expand from there based on
which SKUs appear in user listings.

For each SKU, target signals from ≥3 independent sources to get
"medium" confidence. ≥5 sources → "high" confidence.

**Anti-pattern to avoid:** Don't surface "low confidence" insights as
strong recommendations. If sample size is too small, the agent should
say *"I don't have enough data on this SKU to recommend a price with
confidence — here's a wider range."*

## Demo script

The narrative is **"the agent gives me an unfair informational edge."**

1. **0:00-0:15** — Lagos seller asks Coach: *"How much should I sell
   bell peppers for?"* Coach replies with the OLD anchor: *"₦450/kg
   based on Kajota catalog median."*
2. **0:15-0:25** — Cut to "after Tier 6" version. Same question. Coach
   replies: *"₦480/kg. Market median is ₦450, but search interest is
   up 28% this week and Jumia has them at ₦510. You can price ₦480
   confidently."*
3. **0:25-0:35** — Push notification fires: *"Umbrella demand surging
   — adjust prices."*
4. **0:35-1:00** — Seller adjusts, reaps higher margin, voiceover:
   *"This is the kind of insight that until now was only available to
   formal retailers paying for analytics. Tier 6 gives it to every
   market trader for free."*
5. **1:00-1:15** — Background visual: a dashboard of the data pipeline,
   to give judges confidence the system is real.

## Spikes to run BEFORE committing to scope

🚧 **Spike 1: Jumia + Konga scraping legality and reliability.**
4 hours.

Some sites use Cloudflare bot protection. Verify a Spring-Boot-based
scrape works without proxy services (which add cost). If not, evaluate
ScrapingBee or BrightData.

🚧 **Spike 2: Google Trends API quotas.** 1 hour.

Free pytrends has rate limits. If we hit them with 50 SKUs/day, may
need to use SerpAPI ($50/month).

🚧 **Spike 3: Mongo time-series collection performance.** 2 hours.

Mongo 7 has time-series collections optimised for this kind of data.
Verify performance with 50 SKUs × 365 days × 5 sources = ~91k
documents. Should be trivial.

## Timeline (6 days)

| Day | Hours | Deliverable |
| --- | --- | --- |
| Day 1 | 6h | Spikes + data model. MarketPriceSnapshot, MarketSignal, FxRate entities. |
| Day 2 | 8h | JumiaScraperService + KongaScraperService. Daily cron working. |
| Day 3 | 8h | FxRateService + GoogleTrendsService. |
| Day 4 | 8h | MarketIntelligenceService + composite score formula. Tests. |
| Day 5 | 8h | Coach Agent integration. `anchorPrice` enrichment + new `marketIntelligence` tool. Mobile card. |
| Day 6 | 8h | DemandSurgeDetector + push notification flow. Demo recording. |

## Dependencies

- **Upstream:** None.
- **Downstream:** Tier 7 (multi-chain) — when we expand to Kenyan and
  Ghanaian sellers, intelligence pipeline expands to those markets.

## Cost model

Monthly cost estimate (assuming 5,000 active sellers, 50 priced SKUs):

| Item | Cost |
| --- | --- |
| OpenExchangeRates API | $0 (free tier sufficient) |
| Google Trends (pytrends) | $0 (free) |
| Scraping (if proxied) | $0-50 depending on volume |
| Mongo storage (time-series) | ~$0 (well within Render limits) |
| Gemini API for tool enrichment | minimal (cached) |
| Push notification service (FCM) | $0 (free) |

Total: **~$30-80/month** for the full pipeline. Easily covered by
listing fees + commission share.

## Open questions

1. **Data licensing.** If Kajota ever wants to **sell** this intelligence
   externally (a fintech could pay for it), we need clear data licensing
   from each source. Defer to legal once we have product-market fit.
2. **Anti-manipulation.** A wholesaler could try to gaming the system
   by listing fake high prices on Kajota to skew its own confidence
   score. Detect via cross-source agreement (one outlier doesn't move
   the median).
3. **Hyperlocal pricing.** Lagos prices differ from Aba prices. v1 ships
   country-level; v2 should ship state-level.
4. **Predicting vs reflecting.** Tier 6 v1 reflects current state. v2
   could ship demand **forecasts** (next-week probability bands). Holds
   on a simple time-series model (Prophet / NeuralProphet / Chronos).

## Why this matters beyond profit margin

Beyond the immediate seller benefit, the intelligence data is itself a
**public good**. African policymakers, central banks, and researchers
all complain about the absence of granular informal-commerce data. If
Kajota anonymises and publishes aggregated trends, we're providing
research infrastructure for the continent.

Anchor narrative for ETHGlobal: *"Kajota's data is the first
high-frequency public record of informal commerce in Africa. It's
on-chain in aggregate (Tier 1's events) and aggregable via Tier 6's
pipeline. Researchers, journalists, and governments can subscribe."*
