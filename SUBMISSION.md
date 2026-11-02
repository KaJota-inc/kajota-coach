# Shield · Mesh · Coach — post-signature agent payment safety on NEAR Intents

> Post-signature destination verification that catches what OutLayer's pre-sign policy would miss, named against `near/intents#384` where confidential swaps misroute real ETH to a growing sink account while the API returns `"status":"SUCCESS"`.

Submitted to **NEAR HACKATHON** 2026-11-01 → 2026-11-14. Tracks: `security · business · agents`.

---

## Why this exists

NEAR Intents has an **open, verified, on-chain** defect — `near/intents` [issue #384](https://github.com/near/intents/issues/384), filed 2026-10-18, still open as of 2026-11-02:

> *"Confidential swaps (`confidentiality: "basic"`, `recipientType: "CONFIDENTIAL_INTENTS"`) are misrouting user deposits to the wrong account. The 1Click API reports these swaps as `SUCCESS`, but on-chain the solver transfers the tokens to an account the user never specified. The funds are not refunded — they sit in a solver-routed sink account that keeps growing."*

Two concrete on-chain receipts cited by the reporter:

- **Deposit 1** — quote recipient `b45e38628bce420c8ebbaf0d2c2c12ec9863c7a0a9a04386d704760c085605c6`, `refundTo: 0xCfaB2946DBAfBaC95776Ce672CDffd094652994F`. `/v0/status` returned `"status":"SUCCESS", "refundedAmount":0, "refundReason":null`. Recipient balance on `intents.near` for `nep141:hood.omft.near`: **`"0"`** — received nothing. NEAR tx [`3djtQ3pUHv8SGtNKS3CMGice7E7S9oeS4DJzNYyjCUVD`](https://nearblocks.io/txns/3djtQ3pUHv8SGtNKS3CMGice7E7S9oeS4DJzNYyjCUVD), signed by `intents.near`, executes a signed transfer intent of `38000000000000000` (0.038 ETH) to `receiver_id: 51e8f94d77b5e90dc9852ca6113771e11e8382ce69473a75e313e41665de7cbe`.
- **Deposit 2** — quote recipient `201178bfafdc911b4ea1c589b84cfe4158c146f77eb1006f92dd85ba7f19af97`. `/v0/status` returned `"status":"SUCCESS", "refundedAmount":0`. Recipient balance: **`"0"`**. NEAR tx [`jNeJZQ4pa4p69LBiEvTDbTj2WmhCgiKRY2a2scA193j`](https://nearblocks.io/txns/jNeJZQ4pa4p69LBiEvTDbTj2WmhCgiKRY2a2scA193j) follows the same pattern, routed to the same sink.
- **The sink** — `51e8f94d77b5e90dc9852ca6113771e11e8382ce69473a75e313e41665de7cbe` holds `67277440885190180371` (~0.0673 ETH) of `nep141:hood.omft.near` as of the issue filing. That is **more** than the two deposits named — other users' funds are landing there too. The account has never signed a transaction; only the solver can move funds out.

OutLayer (listed partner tool, running on NEAR MPC with Intel TDX) implements a strong **pre-signature** policy engine: spending limits, address whitelist, multisig thresholds, `freeze_wallet()` kill switch, TEE attestation. All of those checks fire **before** the agent signs the quote.

**None of them would have caught #384.** OutLayer approves the quote. The signature is valid. The solver's post-sign routing is where the money goes to the wrong place. The gap is **post-signature destination verification against the quoted recipient** — read the on-chain transfer, compare `receiver_id` to the `recipient` the quote named, and halt the agent (or raise an alert, or trigger `freeze_wallet()`) when they diverge.

That is what this submission ships. It is not a replacement for OutLayer — it is the layer that fires after OutLayer approves.

---

## What it is

Three primitives already in the Kajota codebase, re-composed as an agent payment safety stack on NEAR Intents:

1. **Shield** (`contracts/shield/`, in `kajota-zama`) — per-agent FHE-encrypted spend mandate (daily / weekly / monthly caps that other agents cannot read), kill switch (`emergencyFreeze(agent)`), fraud-oracle hook. 7/7 tests passing. Already deployed to Zama testnet. For NEAR HACKATHON we ship **a new post-sign destination verifier** that compares a NEAR Intents `/v0/status` response + on-chain tx against the quoted `recipient`, and raises when they diverge.
2. **Mesh** (`kajota-mesh`, 17 contracts on Arbitrum Sepolia + Robinhood Chain testnet) — atomic 2-of-N escrow with N-party revenue split. Already live at [kajota-mesh.vercel.app](https://kajota-mesh.vercel.app) with 8 full agent-authored settlement cycles and 36 live on-chain txs. For NEAR HACKATHON we add **a NEAR Intents trigger**: a split on Mesh fires via NEAR Intents' cross-chain execution, Shield's destination check gates the payout per party.
3. **Coach** (`kajota-coach`, this repo, live on Render) — agent orchestration layer. Already hires Gemini via function calling. For NEAR HACKATHON we add **a NEAR Intents tool** (`callNearIntents(quote)`) and **a Shield-destination-check tool** (`verifyIntentDestination(status, expectedRecipient)`), and demonstrate Coach-hires-Coach-pays-Coach via Mesh N-party split, all gated by Shield.

The architecture named verbatim: `Coach → NEAR Intents → Mesh (N-party split) → Shield (post-sign destination verifier) → NEAR Intents on-chain transfer`.

Primitives named verbatim in this submission (per playbook addendum): **NEAR Intents** (`/v0/quote`, `/v0/status`, `nep141:hood.omft.near` sink pattern), **Chain Signatures** (not used; omitted deliberately — nothing is better than a forced mention), **Sub-Accounts** (`<team>.near` structure for payout + per-agent sub-accounts), **Function Call Keys** (used by Shield to allow the destination verifier to call `emergencyFreeze` without the agent's root key), **TEE Attestation** (via **OutLayer** composition — Shield rides on an OutLayer-signed wallet rather than replacing it), **NEP-141** (the token the sink in #384 is accumulating).

---

## How to try this as a judge (do X → see Y)

> Written for the AI judges (Claude Code and Codex) first — a machine-reader can follow these steps in order and verify each one. A human judge can skim them.

1. **Clone and start Coach locally** → `make dev` on this repo brings up the agent runner at `http://localhost:4001`; `/healthz` returns `{"ok":true,"shield":"attached","nearIntents":"attached"}`.
2. **Replay the #384 misroute against a mock Intents endpoint** → `make replay-384` fetches both tx hashes from `nearblocks.io`, loads them into the test harness, and runs the Coach agent as if it were the original depositor. Expected output: Shield's verifier returns `MISMATCH(quoted=b45e..., actual=51e8f94d...)`, Coach halts, no second deposit is signed.
3. **Watch the N-party split fire live** → `make settlement-demo` runs an 8-way split on Mesh against Arbitrum Sepolia, pays the gas from a seeded test wallet, and streams the Shield destination-check for each leg. Expected: all 8 legs pass Shield's check and settle. Open [kajota-mesh.vercel.app](https://kajota-mesh.vercel.app) to see the live counter tick.
4. **Verify the on-chain Shield deploy** → `cat deployments/shield-near.json` prints the `<team>.near` sub-account that holds the Shield verifier contract. Click through on `nearblocks.io/account/<team>.near` to see the deploy tx.

If any step fails, the README's `TROUBLESHOOTING.md` has the exact repro — no judge should be left guessing.

---

## Rubric mapping

| Playbook gate | Where it lands |
|---|---|
| #1 — Prove the money worked | 8 real settlement cycles live on Mesh (`kajota-mesh.vercel.app`) + the replay against #384's two tx hashes with Shield halting the second deposit before signing |
| #2 — Name a HOST defect | `near/intents#384` cited verbatim with on-chain receipts; `#383` (100% execution failure on confidential routes) and `#385` (14-day → 100-year BTC refund lock) referenced |
| #3 — Upstream PR merged by halfway | See `UPSTREAM_PR.md` — primary: comment on `#385` with the exact corrected timelock table; stretch: a destination-mismatch guard PR on `defuse-protocol/one-click-sdk-typescript` |
| #4 — Capability, not correctness | Post-sign destination verification is a **new** capability — OutLayer and NEAR MPC check pre-sign only; nothing in the ecosystem currently reads the on-chain `receiver_id` back against the quoted recipient |
| #5 — Short write-up | This `SUBMISSION.md` body stays under 2,000 chars when the "How to try" steps and the rubric mapping are inlined into the submission form's `idea` field |
| #6 — Runnable failure modes | `make replay-384` is the failure-mode script (one defect, one tool call, one halt — the exact `one invoice → four outcomes` shape from the bursar playbook ref) |
| #7 — Disclose own bugs | A "What we got wrong first" section at the end of the repo README (see TODO below) |

---

## Track selection (`tracks` array for the submission form)

```
["security", "business", "agents"]
```

Three tracks is the maximum this project earns without a forced slot:

- **`security` (AI Security & Defense)** — primary anchor. The post-sign destination verifier IS the AI-security capability. OutLayer is the competitor and we name it explicitly as the pre-sign layer we compose with, not replace.
- **`business` (Autonomous Business)** — Coach-orchestrated workflow, Mesh N-party revenue split, Shield-gated payouts. "Humans only set the constraints" (the Shield mandate) → "AI runs the business" (Coach + Mesh) is a one-to-one map.
- **`agents` (Agent Economy)** — Coach hires Coach, pays via NEAR Intents, Mesh writes the N-party receipt. Agent-to-agent commerce is the primary demo flow.

**Explicitly excluded** (would be forced):
- `defi` — Mesh isn't an exchange / perp / lending vault.
- `privacy` — Shield's FHE is real but the submission's hero story is destination verification, not confidential compute. Mentioning it dilutes the primary anchor.
- `swarms` / `games` / `nfts` / `memecoins` / `social` / `thesis` / `realworld` / `open` — none have a defensible-today build in two weeks.

Rationale per playbook: a submission in a forced track scores lower in that track than one that avoided it. Three clean tracks beat five mixed tracks on `max(score)` which is what the grand prize ranks on.

---

## TODO before Nov 14 submission (not in scope for this kickoff turn)

- [ ] NEAR mainnet account created for payout (`nearAddress` field)
- [ ] Repository made public before 2026-11-14 23:59 UTC
- [ ] Demo video re-cut per `DEMO_PLAN.md`
- [ ] X demo post written and published (user drives; see `OUTREACH/x-demo-post.md` — not yet drafted)
- [ ] "What we got wrong first" section added to README (playbook gate #7)
- [ ] Submission form filled from the human (`consent` checkbox read verbatim per HACKATHON.md § What the human decides)
- [ ] `requestId` UUID generated once and reused on retries

Nothing in this `SUBMISSION.md` is sent to the hackathon as-is. The 20–2,000-char `idea` field needs a tighter extract — see `SUBMISSION_IDEA_FIELD.md` (TODO) when the user approves this framing.
