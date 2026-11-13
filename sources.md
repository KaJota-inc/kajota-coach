# NEAR HACKATHON scout — sources

Walked 2026-10-24 by the kajota-coach near-agents-scout session. Read-only.

## Canonical

- Event site — [nearhackathon.com](https://nearhackathon.com/) — track list, judges, timeline, submission form (`#apply` anchor).
- **Rulebook** — [nearhackathon.com/HACKATHON.md](https://nearhackathon.com/HACKATHON.md) — authoritative. Downloaded to this session's scratchpad on 2026-10-24. Documents the submission API contract (`POST /api/applications`), the 10-field body, the status-code map (201/400/403/409/413/503), the 13 track ids, the spam-trap `website` field. Silent on: country eligibility, KYC, OSS licence, demo-video length/speed/hosting, newly-recorded requirement, reuse-of-prior-hackathon-code.
- **Submissions count endpoint** — `GET https://nearhackathon.com/api/applications?limit=5` → `{"count":0}` as of 2026-10-24. Confirms no public submission listing before Nov 1.
- **Submissions page (negative result)** — `GET https://nearhackathon.com/submissions` → HTTP 404. No public gallery.

## HOST defect candidates (near/intents open issues)

- [near/intents#384 — Confidential swaps misroute deposits to wrong account, API reports SUCCESS, no refund](https://github.com/near/intents/issues/384) — the strongest anchor. On-chain-verifiable (two tx hashes cited), ongoing (sink balance growing), still open on 2026-10-24.
- [near/intents#383 — Confidential swaps fail at execution on every route](https://github.com/near/intents/issues/383) — 5-of-5 repro across 3 routes, 100% failure rate, each failed attempt costs a refund fee.
- [near/intents#385 — "Refund a stuck BTC deposit" docs say 14 days, on-chain lock is 100 years since 16 Oct 2026](https://github.com/near/intents/issues/385) — one-line docs fix candidate for playbook gate #3 (upstream PR merged by day 7).
- [near/intents repo metadata](https://api.github.com/repos/near/intents) — MIT licence (confirmed), `has_pull_requests: all`, 17 open issues, Rust, 54 forks, 61 stars.

## HOST tool metadata

- [nearai/cloud-api repo](https://github.com/nearai/cloud-api) — 196 open issues on 2026-10-24, licence NOASSERTION, OpenAI-compatible private-AI inference. Rich backlog but noisier (billing, RUSTSEC advisories, feature flags) — less legible as a HOST-defect anchor than `near/intents`.
- [outlayer.ai](https://outlayer.ai/) — the main positioning threat for Shield in the `security` track. OutLayer is a listed partner (HACKATHON.md § Ecosystem) and ships policy engine + per-tx/hourly/daily/monthly caps + address whitelist + multisig + `freeze_wallet()` kill switch + TEE attestation on NEAR MPC. Shield's only defensible differentiator against this is FHE-encrypted limits + post-signature destination verification.
- [github.com/out-layer/outlayer](https://github.com/out-layer/outlayer) — OutLayer's open-source enclave code.

## Secondary / dated coverage (used only to triangulate dates and prize pool before finding the canonical site)

- [NEAR Protocol Launches Hackathon with $250K Prize Pool and Top VC Judges — coinalertnews.com (2026-10-19)](https://coinalertnews.com/news/2026/10/19/near-hackathon-prize-vc-judges)
- [NEAR Protocol kicks off hackathon with $250K prize pool — coinfomania.com](https://coinfomania.com/near-protocol-kicks-off-hackathon-with-250k-prize-pool/)
- [NEAR Protocol Advances Its Ecosystem — tronweekly.com](https://www.tronweekly.com/near-protocol-advances-its-ecosystem-as-near-price-outlook-improves/) — only secondary source that lists 8 of the 13 tracks before HACKATHON.md was pulled.

## Name-conflict evidence

The parent brief's "Agents Without Masters" refers to a **different** NEAR event:

- [vercel.lu.ma/3fjkv8r4 → luma.com/3fjkv8r4 — Agents Without Masters Hackathon with NEAR AI](https://luma.com/3fjkv8r4) — 24-hour, in-person at w3.hub Berlin, June 15–16 (year not stated on page), $25K bounties, organizer NEAR Foundation × Hackbox. Registration closed, referral-only. Dates and prize pool do not match the $250K / Nov 1–14 event.

Verified by cross-reading three sources that cover the $250K event: none refer to it as "Agents Without Masters." It is called **NEAR HACKATHON** on its own site, in HACKATHON.md, and in all three secondary stories.

## Related session memories consulted (not sources, but context)

- `[[hackathon_winning_playbook]]` — seven gates, read in full at session start.
- `[[feedback_submission_form_rules_first]]` — informed the direct read of the submission API contract rather than inferring from the announcement.
- `[[feedback_verify_deadline_vs_today]]` — informed the name-correction decision at the top of the memo.
- `[[feedback_scout_the_field_before_positioning]]` — resulted in the explicit risk #2 (field cannot be scouted pre-judging because submissions are hidden).
