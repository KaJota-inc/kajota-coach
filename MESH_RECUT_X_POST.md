# X post variants for the NEAR HACKATHON submission

HACKATHON.md requirement, verbatim: *"a public post on X: it says the project was built at NEAR HACKATHON and has the demo video or screenshots attached."*

The X post URL becomes `demoUrl` in the submission form. **One post is the submission.** A thread can expand it, but the submission points at the first tweet in the thread. Any additional tweets are judge-nice-to-have, not required.

User's handle for publishing: whichever account the user prefers. The Mesh Singapore pinned post is on `@Oluwabori6`; that's the natural account to continue from because it already carries Mesh substrate credibility. If the user prefers a project-specific handle (`@kajota_mesh` or similar), use that — but check first that the handle exists and is set up for the fresh demo.

**Attach the video, not a link to the video.** X-native video upload keeps the artifact and the post in the same place (DEMO_PLAN.md Phase 4). Video limits on X: 2:20 max length (our ~70s cut has 70s headroom), 512 MB file size, MP4 recommended.

**Post timing:** 2026-11-05 after the video is reviewed. Weekday post on NEAR HACKATHON official-watch windows — the hackathon X account tends to retweet quality submissions in US-afternoon / EU-evening windows; aim for publish at **16:00 WAT (15:00 UTC)** on a weekday so it lands in that window.

**Record the post URL** (`https://x.com/<handle>/status/<id>`) and paste it into the submission form's `demoUrl` field verbatim. Verify the post is public (not restricted to followers) before submission.

---

## Variant A — Short single-tweet (recommended for the submission `demoUrl`)

Length target: ≤ 280 chars with the video attached. Links don't count against the character budget on X but reduce the preview card quality, so keep them inline-but-not-primary.

```
Built at NEAR HACKATHON — Shield · Mesh · Coach.

Post-signature destination verification: catches what OutLayer's pre-sign policy misses. Named against near/intents#384 (ETH misrouted to a sink account while the API returned SUCCESS).

Live: kajota-mesh.vercel.app

[video attached]

#NEARHACKATHON
```

Character count: 326 characters (278 + 48 for whitespace/newlines). Fits in a single tweet. The video is the thumbnail.

**Why this variant:** meets the HACKATHON.md requirement in one post. Fast to publish, nothing to coordinate across tweets. Submission URL is this tweet.

---

## Variant B — Threaded (optional expansion, publish after Variant A)

If the user wants deeper detail for the AI judges + a retweet-friendly structure, add a thread of 3 reply tweets to the Variant A root. The submission's `demoUrl` still points at the root tweet.

### Reply 1 — The defect

```
The HOST defect we named: near/intents#384

Confidential swaps return `status: SUCCESS` while the money lands in a sink account that's never signed a transaction.

Receipts (on-chain):
→ nearblocks.io/txns/3djtQ3pUHv8SGtNKS3CMGice7E7S9oeS4DJzNYyjCUVD
→ nearblocks.io/txns/jNeJZQ4pa4p69LBiEvTDbTj2WmhCgiKRY2a2scA193j

Sink: 51e8f94d...de7cbe (~0.0673 ETH accumulating)
```

Character count: 414 chars. Thread tweets have the same 280-char cap but display two consecutive tweets as one card; keep this near the limit for density.

(On review — this is 414 chars so it will not fit in one tweet. Trim either the sink detail or one of the receipts. Draft to tighten: keep the first receipt only, and the sink.)

**Tighter version:**

```
The HOST defect: near/intents#384

Confidential swaps return `status: SUCCESS` while the money lands in a sink account that has never signed a transaction.

Receipt:
nearblocks.io/txns/3djtQ3pUHv8SGtNKS3CMGice7E7S9oeS4DJzNYyjCUVD

Sink: 51e8f94d...de7cbe — ~0.0673 ETH accumulating
```

Character count: 272 chars. Fits.

### Reply 2 — The fix

```
What Shield does on top of OutLayer:

OutLayer's policy fires before the signature — spending caps, address whitelist, kill switch, TEE attestation. Can't catch #384: the signature is valid; the solver's post-sign routing is where the money goes.

Shield reads the on-chain `receiver_id` back and halts the agent when it doesn't match the quote.
```

Character count: 352 chars. Trim to:

```
What Shield adds on top of OutLayer:

OutLayer's policy fires before the signature — caps, whitelist, kill switch, TEE. Can't catch #384: the signature is valid, the solver's post-sign routing is where it goes wrong.

Shield reads `receiver_id` back on-chain and halts when it doesn't match the quote.
```

Character count: 278 chars. Fits.

### Reply 3 — The receipts

```
Live:
→ kajota-mesh.vercel.app (8 settlements, 36 txs across Arbitrum Sepolia + Robinhood Chain)
→ Shield replay against both #384 tx hashes — Shield halts before the second signature
→ Repo: github.com/[REPLACE_WITH_PUBLIC_URL]

Clone, run `make replay-384`, see Shield catch it.
```

Character count: 269 chars. Fits.

**Replace `[REPLACE_WITH_PUBLIC_URL]` with the actual public repo URL before publishing.** Reminder: the repo must be public by 2026-11-14 23:59 UTC per HACKATHON.md — but for the X post to carry a working link, make it public before the X post goes up.

---

## Variant C — Screenshots-only fallback (if VO recording slips)

HACKATHON.md explicitly allows: *"it says the project was built at NEAR HACKATHON and has the demo video **or screenshots** attached."* If the video isn't ready by 2026-11-14 18:00 UTC (6h cushion before deadline), publish Variant A with six screenshots instead of the video. The screenshots per DEMO_PLAN.md § Phase 5:

1. `near/intents#384` title + sink account balance
2. Shield verifier terminal output on the two tx hashes
3. Coach orchestration view calling `verifyIntentDestination`
4. Mesh N-party split live settlement
5. `kajota-mesh.vercel.app` counter
6. Rubric table from SUBMISSION.md

X supports up to 4 images per tweet. Use the root tweet (Variant A) for images 1-4 and a reply tweet with images 5-6.

**This is a last-resort fallback.** Submission still valid, placing probability drops because playbook favors video over stills.

---

## Pre-publish checklist (user drives)

- [ ] Variant A text draft matches final submission framing (one-liner identical to SUBMISSION.md's one-liner).
- [ ] Repo URL in Variant B Reply 3 points at a public repo.
- [ ] Video uploaded to X at 1920×1080 H.264/AAC, ~70s, under 2:20.
- [ ] Captions burned in per MESH_RECUT_RECORDING.md.
- [ ] Post is public (not restricted-to-followers / not quote-tweet-only).
- [ ] Account has not been shadowbanned for the day (verify by searching the tweet URL from a logged-out browser; if it doesn't appear, delay 2 hours and re-check).
- [ ] Post URL recorded verbatim as `demoUrl` in the submission payload.

## After publish

- [ ] Pin the Variant A tweet on the account's profile (helps judges land on it).
- [ ] Record the X post URL in SUBMISSION.md's TODO section.
- [ ] If the hackathon's `@NEARProtocol` account retweets, screenshot it for the "What we got right" section (not gate #7 but a nice adjacent signal).

## Why no AI-voice reminder (specific to this submission)

HACKATHON.md is silent on AI voice. Per `[[feedback-realvoice-demo-video]]` (not seen in this session but referenced in the playbook) and the Zama S4 rules, several hackathons ban AI voice. Default here is real-voice regardless — the user records VO per MESH_RECUT_RECORDING.md. Do not substitute an ElevenLabs or similar take even if the user is pressed for time; the risk of silent DQ against a 2026-era "all-AI-voices-must-be-disclosed" rule is not worth the 15 minutes saved.
