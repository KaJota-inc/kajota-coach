# NEAR HACKATHON — submission packet

The full paste-ready contents for `POST https://nearhackathon.com/api/applications`.

Target deadline: **2026-11-14T23:59:00Z** (5 days from today, 2026-11-09).

Contract reference: [HACKATHON.md § Submission API](https://nearhackathon.com/HACKATHON.md).

---

## Field-by-field

Fill every placeholder marked `<...>` before the POST. Fields are listed in the exact order the API expects.

### `requestId`

Generate once and reuse on retries (same UUID = same submission).

```bash
uuidgen | tr A-Z a-z
# example output: 7f3a1b22-4e5c-4d9a-b1a7-9c0f2e5d6a11
```

**Record the value chosen here:** `<paste UUID after generation>`

### `projectName`

- 2–80 characters
- Must be unique across the hackathon (case-insensitive). 345 submissions as of 2026-11-09, so expect collisions on single-word names.

**Primary:** `Shield · Mesh · Coach`
**Fallback (ASCII-only, if the form rejects middle-dot):** `Shield Mesh Coach`

### `leadName`

- 2–80 characters
- Display, not legal payout identity

**Value:** `<user's preferred display name — "Oluwabori Ife" or "bori7">`

### `email`

- Valid email, max 160 chars, unique across submissions

**Value:** `oluwaboriife@gmail.com` (from session context; confirm before posting)

### `size`

- One of: `1`, `2 - 4`, `4 - 6`, `6 - 8`, `8+`
- Exactly as written (spaces included)

**Value:** `1` (solo build per SCOUT_MEMO.md)

### `tracks`

- Array of ids; each listed once; multi-track submission permitted

**Value:** `["security", "business", "agents"]`

Rationale in `SUBMISSION.md` § Track selection: `security` is the primary anchor (post-sign destination verification against #384), `business` and `agents` are the natural extensions through Coach + Mesh.

### `nearAddress`

- 2–64 chars
- Lowercase
- Matches regex `^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$`
- Must be a real mainnet account the user creates in a NEAR wallet

**Value:** `<paste after creating at my.near.org or wallet.near.org>`

Suggested name pattern: `shield-mesh-coach.near` (if available) or implicit (64-char hex) from a fresh keypair.

**User action:** create the account before Nov 12 23:59 UTC (recording-lock deadline). This is the only hackathon-side blocker that cannot be drafted here.

### `projectUrl`

- Valid http(s) URL
- Max 300 chars
- Points to a **public** repository by 2026-11-14T23:59:00Z

**Value:** `<paste URL after the submission repo is made public>`

Candidates per SCOUT_MEMO.md:
- `https://github.com/KaJota-inc/kajota-coach` (the Coach repo, with scripts/replay-384.ts dropped in)
- `https://github.com/<user>/shield-mesh-coach-near` (fresh repo that re-packages the three substrates specifically for this submission)

Cold-clone verification required: `make replay-384-fixture` runs and exits 0 on a fresh machine with Node >= 18.

### `demoUrl`

- Valid http(s) URL
- Max 300 chars
- Public X post that says *"built at NEAR HACKATHON"* and attaches the demo video or screenshots

**Value:** `<paste X post URL after publishing>`

X post text (Variant A from `MESH_RECUT_X_POST.md`):

```
Built at NEAR HACKATHON — Shield · Mesh · Coach.

Post-signature destination verification: catches what OutLayer's pre-sign policy misses. Named against near/intents#384 (ETH misrouted to a sink account while the API returned SUCCESS).

Live: kajota-mesh.vercel.app

[video attached]

#NEARHACKATHON
```

The verbatim phrase *"built at NEAR HACKATHON"* is the first-line requirement per HACKATHON.md § The demo post.

### `idea`

- 20–2000 characters
- Confirmed 1973 chars via `python3 -c "import sys; t=open('SUBMISSION_IDEA_FIELD.md').read(); print(len(t.split('\n---\n')[2].strip()))"`

Paste verbatim from `SUBMISSION_IDEA_FIELD.md`. Copied inline here as a safeguard against last-minute edits to the source file:

**[idea field body, verbatim]**

```
**Shield · Mesh · Coach** — post-signature destination verification that catches what pre-sign policy misses. Named against **near/intents#384** (open, filed 2026-10-18): confidential swaps return `status: SUCCESS` while real ETH lands in a solver-routed sink account.

On-chain receipts cited in the issue: NEAR txs `3djtQ3pU...jCUVD` and `jNeJZQ4...A193j`. Quoted recipients `b45e...605c6` and `201178...9af97`; actual `51e8f94d...de7cbe`. The sink holds ~0.0673 ETH of `nep141:hood.omft.near` and growing. API said success. Money went to the wrong account.

OutLayer (listed partner) runs the pre-signature policy — caps, whitelist, kill switch, TEE attestation on NEAR MPC. All fire before the signature. None would catch #384: the signature is valid; the solver's post-sign routing is where it goes wrong.

Shield reads the on-chain `receiver_id` back from `status.swapDetails.nearTxHashes`, compares to `status.quoteResponse.quoteRequest.recipient`, halts the agent on divergence. Fires after OutLayer approves, not instead of it.

Three primitives, composed:
- **Shield**: FHE spend mandate + kill switch + new post-sign verifier
- **Mesh**: N-party atomic escrow (17 contracts live on Arbitrum Sepolia + Robinhood Chain testnet; 8 settlement cycles; 36 on-chain txs)
- **Coach**: agent orchestration + two new NEAR tools (`callNearIntents`, `verifyIntentDestination`)

Flow: Coach → NEAR Intents (cross-chain execution) → Mesh N-party split → Shield verifies each leg → NEAR Intents on-chain transfer. Chain Signatures sign cross-chain; Function Call Keys scope Shield's `emergencyFreeze` without root key; Sub-Accounts partition per-agent spend; NEP-141 is the asset class we gate.

Try it: clone the repo, run `make replay-384`. The two #384 tx hashes replay against Shield; the verifier returns `MISMATCH(quoted=b45e..., actual=51e8f94d...)`; the agent halts before the second signature.

Built at NEAR HACKATHON. Live Mesh settlements at kajota-mesh.vercel.app.
```

### `consent`

- Boolean `true`
- Only after the user has agreed to the HACKATHON.md contact notice, read verbatim:

> *"I agree that the organizers may use these details to review our submission and contact us about this hackathon."*

**Value:** `true` (only after reading the notice to the user and receiving a yes)

---

## Full payload (ready to POST)

Replace every `<...>` with the real value before running. `requestId` must be the SAME UUID used on retries.

```bash
curl -sS -X POST https://nearhackathon.com/api/applications \
  -H 'Content-Type: application/json' \
  -d '{
    "requestId": "<paste-uuid>",
    "projectName": "Shield · Mesh · Coach",
    "leadName": "<display-name>",
    "email": "oluwaboriife@gmail.com",
    "size": "1",
    "tracks": ["security", "business", "agents"],
    "nearAddress": "<paste-near-account>",
    "projectUrl": "<paste-github-url>",
    "demoUrl": "<paste-x-post-url>",
    "idea": "<paste-idea-body-from-above>",
    "consent": true
  }'
```

**Note on the `idea` field inside the JSON payload:** the body has backticks, asterisks, non-ASCII bullets (`·`), and `→` arrows. Escape the `\n` newlines and keep the special characters as-is — the API accepts UTF-8. If the shell complains, use a heredoc or write the JSON to a file and `curl ... -d @payload.json`.

Example with heredoc to avoid shell-escaping pain:

```bash
cat > /tmp/near-payload.json <<'EOF'
{
  "requestId": "<paste-uuid>",
  "projectName": "Shield · Mesh · Coach",
  "leadName": "<display-name>",
  "email": "oluwaboriife@gmail.com",
  "size": "1",
  "tracks": ["security", "business", "agents"],
  "nearAddress": "<paste-near-account>",
  "projectUrl": "<paste-github-url>",
  "demoUrl": "<paste-x-post-url>",
  "idea": "<paste-idea-body-from-above-with-\\n-escaped-newlines>",
  "consent": true
}
EOF
curl -sS -X POST https://nearhackathon.com/api/applications \
  -H 'Content-Type: application/json' \
  -d @/tmp/near-payload.json
# After submission, delete the file — it contains personal data per HACKATHON.md §3.
rm /tmp/near-payload.json
```

## Expected response

```
HTTP/2 201
{"id": "<some-id>", "requestId": "<same-uuid>", "status": "saved"}
```

Map other codes per HACKATHON.md § Submission API:

| Status | Meaning | What to do |
|---|---|---|
| 201 | Saved | Done — tell the user the submission is in |
| 400 | Field failed validation | Read `fields` in response, fix, resend with **same** requestId |
| 403 | Submissions not open or cross-site | Stop — do not retry |
| 409 | Duplicate project name or email | Already submitted — do not change name to bypass |
| 413 | Body too large | Shorten the `idea` field |
| 503 | Storage temporarily unavailable | Wait 1 min, resend with same requestId |

## Pointer: the gate-#6 failure-mode script

`make replay-384` (fixture mode) exits 0 and prints the Shield MISMATCH + halt output. See `replay-384/README.md`. This is what the `idea` field's *"Try it: clone the repo, run `make replay-384`"* claim hangs on — must still work from a cold clone of the submission repo on Nov 14.

## Verification before POST

The gates from `SUBMISSION_IDEA_FIELD.md` § "When to send":

- [ ] Repo is public (`curl -I <projectUrl>` returns 200)
- [ ] X post is up (`curl -I <demoUrl>` returns 200 after any HTTPS redirect)
- [ ] `make replay-384` (or `make replay-384-fixture`) runs end-to-end from a cold clone
- [ ] NEAR mainnet account is live (`near view <nearAddress> get_account_balance '{}'` returns a result)
- [ ] `idea` field is 1973 chars when pasted into the JSON (check after any copy-paste that may have altered whitespace)
- [ ] User has read the consent notice verbatim and said yes
- [ ] `requestId` is a fresh UUID, not a leftover from a prior attempt

If any check fails, fix and re-run — do NOT POST with a known-broken field.
