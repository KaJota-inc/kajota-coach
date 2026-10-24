# NEAR HACKATHON — Scout memo

**Scouted:** 2026-10-24 (Lagos founder, kajota-coach session). Read-only, pre-commit. Sources: [sources.md](sources.md).

> **Name correction up front.** The parent brief calls this hackathon "Agents Without Masters" with a $250K pool. That is wrong. "Agents Without Masters" is a 24-hour NEAR Foundation × Hackbox event in Berlin with $25K bounties; it is already closed. The $250K / Nov 1–14 event is the **NEAR HACKATHON** ("Build what's next"), its own site at nearhackathon.com, no Devpost or DoraHacks involved. Every reference below is to that event. Flagging per `[[feedback_verify_deadline_vs_today]]`: canonical sponsor page beats parent prompt.

## Verdict — GO WITH CAVEATS

**One-liner:** `NEAR Intents + Shield/Mesh fraud-oracle layer` — a submission that names a *verified* HOST defect in `near/intents` (issue #384: confidential swaps misroute real ETH to a growing sink account while the API returns `SUCCESS`; 100% repro on 5 attempts across 3 routes in issue #383) and ships the agent-side guard that would have caught it. GO because (a) the defect is nameable, concrete and newly filed, (b) the submission form explicitly allows cross-chain adapter builds via NEAR Intents, (c) multiple-tracks-per-submission is permitted, (d) no newly-recorded-demo rule, (e) HACKATHON.md is silent on Nigeria / OSS licence / reuse. CAVEATS because **OutLayer (a listed partner tool) already ships Shield's whole feature list** — spending limits, address whitelist, kill switch, TEE attestation — on NEAR MPC. Shield has to earn its slot against OutLayer in the AI Security track, not be the same thing in different packaging. Playbook gates #1/#2 are achievable; gate #3 (upstream PR merged by day 7) is the single scariest commitment given three other live fires.

## 1 · HOST defect worth naming? **Yes, and it is excellent.**

Confirmed by direct read of `github.com/near/intents` open issues.

- **near/intents#384** (2026-10-18, open): *"Confidential swaps misroute deposits to wrong account — 0.039 ETH stuck, API reports SUCCESS, no refund"*. Two on-chain tx hashes cited (`3djtQ3pUHv8SGtNKS3CMGice7E7S9oeS4DJzNYyjCUVD`, `jNeJZQ4pa4p69LBiEvTDbTj2WmhCgiKRY2a2scA193j`). The sink account `51e8f94d...de7cbe` holds `~0.0673 ETH` of `nep141:hood.omft.near` — more than the two reported deposits, so *other users' funds are accumulating there too*. API returns `"status":"SUCCESS", "refundedAmount":0, "refundReason":null` while the recipient balance stays `"0"`. [URL](https://github.com/near/intents/issues/384).
- **near/intents#383** (2026-10-17, open): confidential swaps with `confidentiality: "basic"` fail at execution on **every route**, 5-of-5 repro. `/v0/deposit/submit` returns `Empty AMQP response`; status → `REFUNDED / INTENT_SUBMIT_FAILED`; each failed attempt costs a refund fee. [URL](https://github.com/near/intents/issues/383).
- **near/intents#385** (2026-10-19, open): `docs.near-intents.org` says a stuck BTC deposit with no refund address waits 14 days before `execute_refund`; on-chain, `unsafe_refund_timelock_sec` was set to `3153600000` (**100 years**) on 16 Oct 2026 by DAO proposal 322. Docs are wrong by three orders of magnitude; users pay a 2 NEAR non-refundable fee for a refund path that in practice only the DAO can trigger. [URL](https://github.com/near/intents/issues/385).

Any one of these satisfies playbook gate #2 ("name a defect in the host project"). The strongest is **#384** — a public, verifiable, on-chain discrepancy between what the sponsor's API tells agents and what actually happened. A Shield/Mesh-flavoured submission reframed as *"post-signature destination verification for agents using NEAR Intents"* has the sponsor's own live incident as its elevator pitch.

**One trap**: these are open issues filed by someone else. If `near/intents` merges a fix in the next ~10 days (plausible — #384 is a real customer-fund issue), the submission loses its anchor. Gate #3 (upstream PR merged by day 7) is actually a hedge against this: ship the agent-side guard *and* file a tiny upstream PR on the docs side (a one-line fix to #385 is cheapest, and `near/intents` is MIT-licensed with has_pull_requests:all).

## 2 · Does the submission form permit a non-NEAR substrate with a NEAR adapter? **Yes, with one hard requirement.**

Walked the submission contract directly (HACKATHON.md § Submission API, nearhackathon.com/HACKATHON.md). The form POSTs to `https://nearhackathon.com/api/applications`. Required fields:

- `tracks`: an array (not a single pick) of ids from `defi, thesis, privacy, business, swarms, security, agents, realworld, games, nfts, memecoins, social, open`. *"Put the id of every track the project fits in the tracks array. A team still submits once."* **Multiple tracks per submission permitted** — a Shield/Mesh/Coach recomposition can enter `security`, `business` and `agents` simultaneously.
- `nearAddress`: *"2-64 characters, lowercase … a named account such as `team.near` or a 64-character implicit account."* **Hard requirement — a mainnet NEAR account is needed for prize payout.** HACKATHON.md: *"The team creates it in any NEAR wallet; see https://docs.near.org/. Never create or invent one on their behalf."* Not a submission blocker (free to create) but you cannot submit without one.
- `projectUrl`: public repo. Must be public by `2026-11-14T23:59:00Z`. Private repos cannot be judged.
- `demoUrl`: *"public demo post"* on X that says *"the project was built at NEAR HACKATHON"* and attaches a demo video or screenshots. Not a hosted-video URL — a tweet URL.
- `idea`: `20-2000 characters`. **This is the write-up field.** Matches playbook gate #5 almost exactly (winners ~2k chars).
- `projectName` must be *unique across the hackathon*, not unique globally. Reusing a product name from another event is fine.

Rules verified **absent** (HACKATHON.md silent, nearhackathon.com silent):

- No "must be NEAR-native" clause. Track hints repeatedly say *"settle across chains through NEAR Intents"* and the Open Innovation track hint is *"CHAIN ABSTRACTION"*. Chain-signatures hints on 4 tracks. A Mesh-on-Arbitrum-Sepolia adapter that triggers via NEAR Intents is in-template, not off-template.
- No country restriction. Nigeria eligibility: not addressed either way — open question for Discord.
- No KYC clause for payout.
- No OSS licence requirement, though the repo must be public. (I'd still default to MIT to match `near/intents`.)
- No reuse-of-prior-hackathon-code rule. Nothing says *"must be newly created"*. Nothing says *"must disclose reuse"* either.

**One spam trap worth citing** (HACKATHON.md § Submission API): *"`website` is a spam trap: any non-empty value rejects the submission."* Submit the exact 10-field contract, nothing extra.

## 3 · Can the Mesh Singapore demo video be reused? **Yes, with a re-cut, not a re-shoot.**

HACKATHON.md is **silent** on:

- demo video length limit
- speed / atempo restrictions
- newly-recorded requirement
- hosting (demoUrl is the X post, not the video — the video can live anywhere X embeds)

The only on-screen requirement is derivative, not video-prescriptive: *"a public post on X: it says the project was built at NEAR HACKATHON and has the demo video or screenshots attached"*. So the X post needs new words — the video does not need to be re-shot.

**Practical cut:** the Mesh Singapore demo (`kajota-mesh.vercel.app`) can be re-opened, a new 10-second NEAR HACKATHON overlay prepended, and the final frame extended with a NEAR Intents call-out. Per `[[feedback_submission_form_rules_first]]` and the Zama S4 incident, I'm **not** proposing to atempo-speed to fit any length cap — there is no length cap stated. Keep the demo at 1.0× speed.

**One live caveat not in the HACKATHON.md** that applies: the AI judges listed are Claude Code and Codex (verified on judges list). Both will read the README as structured text; a video that opens with a jarring "built for Mesh Singapore" segment will degrade their first-pass score. The re-cut needs the title card.

## Canonical facts

| Fact | Value | Source |
|---|---|---|
| Event name | **NEAR HACKATHON** (tagline: "Build what's next"; theme: "Autonomous payments. Intelligent agents.") | [nearhackathon.com](https://nearhackathon.com/) |
| Build starts | 2026-11-01 00:00 UTC | [HACKATHON.md § Facts](https://nearhackathon.com/HACKATHON.md) |
| Submissions close | 2026-11-14 23:59 UTC | [HACKATHON.md § Facts](https://nearhackathon.com/HACKATHON.md) |
| Judging | 2026-11-16 00:00 → 2026-11-18 UTC | [HACKATHON.md § Facts](https://nearhackathon.com/HACKATHON.md) |
| Results announced by | 2026-11-18 23:59 UTC | [HACKATHON.md § Facts](https://nearhackathon.com/HACKATHON.md) |
| Prize pool | **$250K in NEAR** — $55K grand + 13 tracks × ($10K + $3K + $2K) | nearhackathon.com |
| Tracks | **13 confirmed** (ids: `defi, thesis, privacy, business, swarms, security, agents, realworld, games, nfts, memecoins, social, open`); multiple per submission allowed | HACKATHON.md § Tracks |
| Judges | Illia Polosukhin (NEAR), Eddy Lazzarin (a16z), Mert Mumtaz (Helius), Avichal Garg (Electric Capital), Kain Warwick (Synthetix/Infinex), Haseeb Qureshi (Dragonfly), Stepan Gershuni (cyber•Fund), **Claude Code (Anthropic)** and **Codex (OpenAI)** as AI judges | nearhackathon.com |
| Submission platform | Own form at nearhackathon.com/#apply + API `POST /api/applications`. No Devpost, no DoraHacks | HACKATHON.md § Submission API |
| Nigeria eligibility | **Silent** in HACKATHON.md. No OFAC / country clause stated. Open question for Discord. | HACKATHON.md re-read; no match |
| KYC for payout | **Silent.** Only a mainnet NEAR account named / implicit required. | HACKATHON.md § What the human decides |
| OSS licence required | **Silent.** Repo must be public; licence terms not set. Default MIT to match `near/intents`. | HACKATHON.md re-read |
| Reuse of prior work | **Silent.** No "must be newly created" clause. No "must disclose reuse" clause either. | HACKATHON.md re-read |
| Demo video rules | **Silent on length, speed, hosting, newly-recorded.** Only requirement: a public post on X saying "built at NEAR HACKATHON" with video or screenshots. | HACKATHON.md § The demo post |

Three NEAR-native primitives / NEPs named in the Tracks table — worth taking literally per playbook (name sponsor primitives verbatim): **NEAR Intents** (6 tracks), **Chain Signatures** (4 tracks), **Sub-Accounts** (3 tracks), **Function Call Keys** (`security`), **TEE Attestation** (`privacy`, `security`), **NEAR AI Cloud** (`privacy`), **NEP-141 / 171 / 245** (`memecoins`, `nfts`, `games`), **Sputnik DAO + Trezu** (`social`), **Meta Transactions** (`realworld`).

## Substrate overlap

| Track | Substrate | Fit | Notes |
|---|---|---|---|
| `security` (AI Security & Defense) | **Shield** (per-agent spend mandate + FHE limits + kill switch + fraud oracle) | **Clean**, but *contested*: OutLayer (a listed partner) ships policy engine + per-tx/hourly/daily/monthly caps + whitelist + `freeze_wallet()` kill switch + TEE attestation on NEAR MPC. Shield's one differentiator is **FHE-encrypted limits** (OutLayer's are plaintext on-chain) + post-signature destination verification (OutLayer is pre-sign only). | Pitch as *"what catches NEAR Intents #384 after OutLayer approves the quote"* — the post-sign fraud oracle Shield already has. OutLayer's policy would have accepted the quote in #384; Shield's post-sign check would have caught the misroute. |
| `business` (Autonomous Business) | **Coach + Mesh** (orchestration + N-party atomic split) | **Clean.** Coach is literally agent orchestration for a business workflow; Mesh N-party split IS "revenue sharing" from the track hint. | Pitch: Coach orchestrates a seller workflow; Mesh atomically splits revenue across agent operators + seller + platform via NEAR Intents trigger. |
| `agents` (Agent Economy) | **Coach + Mesh** (hiring, paying for APIs/compute) | **Clean.** Coach already pays Gemini; Mesh is the N-party receipts layer. | Pitch: an agent that hires another agent and pays via NEAR Intents, Mesh writes the receipt. |
| `privacy` (Privacy & Private AI) | **Shield** (FHE spend limits via Zama + TEE-attested inference via NEAR AI Cloud) | **Viable.** The FHE angle is genuine; pairing it with NEAR AI Cloud (TEE-verified LLM) is in-template. | Risk: trends toward research, not product. Only pair if also hitting `security`. |
| `realworld` (Real-World Money) | **Mesh** (invoice settlement) | **Viable, needs adapter work.** Track hint is stablecoin rails; Mesh is native-token today. | Lagos-remittance framing is strong first-person (per `[[hackathon_winning_playbook]]` H0 lesson #3) but a stablecoin wrapper is ~3 days we don't have. |
| `defi` (Unstoppable DeFi) | **Mesh** | **Forced.** Mesh is escrow, not an exchange/perp/lending. | Do not enter this track. |
| `swarms` (AI Swarms) | **Coach** (multi-instance) | **Forced** unless we actually ship Coach-hires-Coach, which doesn't exist today. | Skip. |

**Recommended tracks (if GO):** `security` + `business` + `agents` — one submission, three track slots, prize surface ~$45K (3 × $15K track-level). Shield-with-FHE-post-sign-verification *gating* Coach-orchestrated Mesh N-party splits over NEAR Intents.

**Explicitly reject:** `defi`, `swarms`, `games`, `nfts`, `memecoins`, `social`, `thesis` — forced for every current Kajota substrate.

## Risk register

1. **OutLayer eclipses Shield in `security`.** OutLayer is a *listed partner tool* and ships everything Shield does on NEAR MPC (TDX enclave + policy engine + whitelist + `freeze_wallet` kill switch + per-tx/hourly/daily/monthly caps + Hyperliquid/Polymarket/Mercury connectors). A `security`-track submission that reads as "another spend-mandate layer" places behind OutLayer-wrapper submissions. **The ONLY defensible positioning** is *post-signature destination verification* against NEAR Intents' live misrouting (#384), which OutLayer does not do — their checks are pre-signature only. Shield has to be the thing that catches API-SUCCESS-but-wrong-account, not the thing that caps the agent's spend.
2. **The field cannot be scouted before judging.** `GET https://nearhackathon.com/api/applications?limit=5` returns `{"count":0}` as of 2026-10-24. Submissions are hidden until after Nov 14. Per `[[feedback_scout_the_field_before_positioning]]`, this means positioning must be argued in the README, not grounded in a scouted field. Expect ~10× the submissions of KeeperHub (139) because of the $250K scale and non-registration format — meaning any "we're differentiated because X" claim will have at least a dozen collisions.
3. **Three live fires + two-week window = recomposition-only, upstream-PR-only.** BLI Mandate Beacon (Nov 1 ship), PayPal AI (Nov 12 ship), Arbitrum Dubai (Nov 16–Dec 6 submission window) all overlap. The ONLY shape that fits is: (a) Shield-with-NEAR-adapter as a thin crate on top of existing Shield contracts; (b) Coach exposes a NEAR Intents call tool (3-tool day); (c) Mesh N-party split exposed via NEAR Intents trigger. **Playbook gate #3 (upstream PR merged by day 7, 2026-11-07) is non-negotiable AND the scariest commitment** — the only upstream PR I can confidently commit to in that window is a one-line docs fix to `near/intents#385` (correct the 14-day → 100-year lock on BTC refund docs). Anything bigger is a planning risk.

## Open questions (user decides)

1. **Nigeria eligibility.** HACKATHON.md is silent. Ask in NEAR Discord (`https://discord.gg/nearprotocol`) *before* committing build time. If payouts to Nigerian NEAR wallets are blocked by any OFAC-style sanctions clause the hackathon has off-page, the whole thing dies at the payout step. Low-probability, high-impact — one Discord DM resolves it.
2. **Mesh video re-cut vs re-shoot.** Mesh Singapore judging is still open (per `[[hackathon_arbitrum_singapore]]`); re-cutting the Mesh demo video with a NEAR HACKATHON overlay before Singapore has judged *may* create a "duplicate submission" perception at Singapore. Needs user call on whether to wait for Singapore results (~Nov 7?) before cutting the NEAR version, or to proceed in parallel.
3. **Shield in `security` vs `privacy`.** `security` is directly contested by OutLayer; `privacy` is less crowded but trends research-y. The right call is *both* in a multi-track submission, but the README's one-liner has to pick one anchor track. My recommendation is `security` with the post-sign-verification framing — `privacy` as the 2nd track for the FHE depth signal. User's call on whether that lands or inverts.
4. **Upstream PR scope.** The safe play is a doc fix to `near/intents#385`. The ambitious play is a validator-side guard in `near/intents` that would catch #384 (API-SUCCESS-but-destination-mismatch). The ambitious play is ~1 week of unfamiliar Rust in a repo we have never touched — gate #3 compliant on paper, risk of merging in time is high. User's call.
5. **The AI-judge angle.** Two of nine judges are Claude Code and Codex. The README should be *written for a machine reader* (HACKATHON.md explicitly says this). Open question: do we commit to a `/HACKATHON.md`-style structured spec file in our repo that both AI judges can parse deterministically? Low-cost, high-value if yes.

## Recommended next move (not a decision — a shape to react to)

If the user says GO: a 90-minute session on Monday Oct 26 to:
- open NEAR Discord thread on Nigeria eligibility,
- draft the one-liner (template: *"Shield + NEAR Intents + Mesh N-party split"* with a specific HOST-defect anchor),
- scope the upstream PR (default: docs fix to `near/intents#385`),
- confirm Mesh Singapore judging timing before committing to re-cut.

If the user says NO-GO: the single reason to decline is **playbook gate #3**. Shipping an upstream PR in `near/intents` or `nearai/cloud-api` in the 7-day window required, while BLI, PayPal and Arbitrum are also live, is the risk that eats the whole month. The HOST defect is excellent; the window is cruel.
