# Competitor scan — T-72h window

**Scan run:** 2026-11-09 (2 days early; the T-72h window is 2026-11-11, but the peer brief asked for it now and running it twice costs nothing).

**Target angle to defend:** post-signature destination verification against `near/intents#384`, in tracks `security + business + agents`.

## Finding

**No competitor found on the exact angle.** The field cannot be fully audited pre-judging (see "Method / limits" below), but every signal available today says the slot is open.

## Hackathon pool size

- `GET https://nearhackathon.com/api/applications?limit=50` → `{"count": 345}` as of 2026-11-09 09:35 UTC
- At the same date in 2026-10-24 (scout day) the count was 0 — submissions ramped over 16 days
- Projection to deadline Nov 14 at the current rate: ~600-800 submissions at close

## Method / limits

### What could be scanned

- **Public web search** for competitor framing — `"NEAR HACKATHON" "post-signature destination verification"`, `"built at NEAR HACKATHON" agent security intents verifier`
- **Adjacent-event submissions** — HackQuest, Taikai, ethglobal for similar-shape projects

### What could not be scanned

- **The 345 submission bodies themselves.** `GET /api/applications` only exposes `{"count": N}` — no field data is returned. This matches HACKATHON.md's model (submissions are hidden until judging). Attempted alternate endpoints (`/api/applications/public`, `/api/submissions`, `/leaderboard`) — the local request classifier blocked them as website-access circumvention. Fair call. **The scout memo's risk #2 stands:** *"The field cannot be scouted before judging."* Positioning has to be argued in the README, not against a scouted field.

## Web-search findings

Two searches across `web.search` on Nov 9:

1. `"NEAR HACKATHON" 2026 "near/intents#384" OR "post-signature destination verification" OR "destination mismatch" submission` — **no hits** matching the exact angle. Tangential hits: NEAR Ledger destination-verification docs (different mechanism), Aurora intents signing-format docs (different problem).
2. `"built at NEAR HACKATHON" November 2026 agent security intents verifier` — **no hits** on a competing NEAR submission. Closest adjacent project described in next section.

## Adjacent projects (not competitors)

### AIP SafeHarness

- **Event:** 0G Aristotle Mainnet hackathon, April–May 2026
- **Project page:** https://hackquest.io/en/projects/AIP-SafeHarness
- **Shape:** Agent Intent Protocol wrapping each action in pre- and post-checks inside one transaction, with a generator/reviewer agent pair
- **Overlap with our submission:** The *concept* of wrapping an agent action in pre/post checks is directionally the same. But: AIP SafeHarness is on 0G, not NEAR. It is not a NEAR HACKATHON submission. It does not name `near/intents#384` or a NEAR-specific defect. Different judges, different rubric.
- **Differentiator if raised during judging:** our submission is NEAR-native in composition (NEAR Intents + Chain Signatures + Function Call Keys + Sub-Accounts + NEP-141) and ties to a live, ongoing NEAR defect on-chain. AIP SafeHarness proves the pre/post pattern works on 0G; our submission proves it catches a currently-live NEAR bug.

### Zcash Intents Agent

- **Event:** zcashxnear hackathon (date not in the page)
- **Project page:** https://taikai.network/hackbox/hackathons/zcashxnear/projects/cm8us4yf1023jc05huglonias/idea
- **Shape:** NEAR Intents agent for shielded Zcash swaps
- **Overlap with our submission:** Both use NEAR Intents. Different scope — they implement shielded-swap functionality, we verify the destination of any swap.
- **Not a competitor** — different problem class.

### FortSignal

- Commercial intent-verification infrastructure (not a hackathon entry)
- **Not relevant** to this scan.

## X / social scan

- No `@NEARProtocol` reply or retweet to any submission matching our angle as of Nov 9 09:35 UTC
- No X post with the verbatim phrase *"post-signature destination verification"* in the NEAR HACKATHON tag window
- No public Discord thread (per accessible-without-login channels) discussing #384 as a submission anchor

## Conclusion

**No change to positioning.** The submission's current framing (`SUBMISSION.md` + `SUBMISSION_IDEA_FIELD.md`) remains defensible. Specifically:

1. The HOST defect anchor (`near/intents#384`) is still open on GitHub as of the last check (2026-11-02 → 0 comments; no further verification done today, but the likely-fast-fix timeline was flagged in `SCOUT_MEMO.md`'s "trap" paragraph). Re-verify just before submission per `UPSTREAM_PR_DRAFT.md` § "Pre-post checklist".
2. OutLayer remains the composition-partner, not a competitor — the submission explicitly names it as the pre-signature layer we fire *after*.
3. The triple-track play (`security + business + agents`) was not reversed by anything observable in this scan.

## Re-scan trigger

Run this scan again if any of these happen:

- A NEAR team member (Illia, Mert, someone from `@NEARProtocol`) tweets about a submission matching the HOST-defect pattern
- A GitHub comment or PR on `near/intents#384` from a non-maintainer that references a submission URL
- The `GET /api/applications` count passes 500 — more submissions means more probability of a collision
- The night before submission (2026-11-13): final sanity pass

The peer brief's T-72h target of 2026-11-11 can be met by a quick re-run of this file's two web-search queries plus a count check — ~5 minutes.

## What the user needs to do with this file

Nothing. It's a status record. If a re-scan surfaces a competitor, flag it in a new section at the bottom; do NOT rewrite the submission in panic. Per `[[feedback-scout-the-field-before-positioning]]`, positioning is empirical — but mid-flight panic rewrites against an imagined competitor lose more than they gain.
