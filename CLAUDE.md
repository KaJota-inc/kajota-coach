# Kajota Coach — OKX.AI ASP branch rules

Branch: `hackathon/okx-asp`. Scope: everything under this tree ships to the
OKX.AI Agent Marketplace listing. Follow these rules in every session.

## 🚨 NEVER re-authenticate the OKX Agentic Wallet while an ASP is live

**OKX's Agentic Wallet is TEE-bound. Every login + every `wallet add` mints
a FRESH wallet.** The old wallet is not recoverable through any login flow
(not email OTP, not Google OAuth, not Apple, not `wallet add`). Lost twice:

- 2026-07-14 — ASP #5297 orphaned when the wallet rotated.
- 2026-10-23 — ASP #5855 orphaned when a Google OAuth login replaced the
  email-OTP session (previous wallet `0x7876c479…0007` lost permanently).

### Hard rules

1. **Never run** `onchainos wallet logout`, `onchainos wallet login`,
   `onchainos wallet add`, or anything that triggers a browser social
   login while an ASP is in review or live.
2. **Never run** `okx-a2a doctor --fix` without first reading its output —
   it can trigger daemon restarts that cause the a2a daemon to re-handshake
   and surface session-expired errors that tempt a re-login.
3. **If the CLI returns** `"session expired, please login again"` on a
   write op (`agent update`, `agent activate`, `agent create`), STOP.
   - A write op is irreversible; re-login replaces the wallet; the current
     ASP owner is lost.
   - Options: wait and retry (sometimes the session resumes on its own
     after a daemon tick), or register a new ASP under a fresh wallet
     (previous ASP ID stays on-chain but you can never write to it again).
4. **Read ops (`get-agents`, `service-list`, `search`) that return
   session-expired are fine** — they don't commit anything, and the local
   address cache survives a session expiry (see `~/.okx-agent-task/`).

### Context for future sessions

- Current live ASP owner: whatever `onchainos wallet addresses` prints for
  XLayer (chain 196) RIGHT NOW. Don't trust memory — the wallet address
  may have rotated between sessions. Verify before every write op.
- Hub `COKX_X402_PAY_TO` env on Render must match the current wallet, or
  self-facilitator verification fails and OKX's `/coach/premium` review
  times out.
- The XMTP state tarball at `/etc/secrets/a2a-state.tar.gz.b64` on the hub
  is bound to a specific agent identity, which is bound to the wallet that
  registered the agent. If the wallet rotates, the hub's a2a daemon shows
  the OLD agent as online — OKX looks for the NEW one and fails.

## Self-facilitator deployment

The in-process x402 facilitator lives at
`agent/kajota_concierge/x402_xlayer.py::LocalXLayerFacilitator`. Verify
the EIP-712 signature + (optional) broadcast `transferWithAuthorization`
on XLayer. Deploy via Render env on the `kajota-hub` service:

```
COKX_X402_MODE=local
COKX_X402_PAY_TO=<current XLayer wallet address>
COKX_X402_ASSET=0x1e4a5963abfd975d8c9021ce480b42188849d41d  # USDT on XLayer
COKX_X402_NETWORK=eip155:196
COKX_X402_ASSET_NAME=Tether USD
COKX_X402_ASSET_VERSION=1
COKX_X402_ASSET_DECIMALS=6
COKX_X402_MAX_AMOUNT=10000
COKX_X402_CHAIN_ID=196
COKX_X402_RPC_URL=https://rpc.xlayer.tech
# Optional for on-chain settlement; verify-only without it:
COKX_X402_FACILITATOR_PK=<0x-prefixed PK of a funded XLayer wallet>
```

Pattern + gotchas in `~/.claude/.../memory/feedback_x402_self_facilitator.md`.

## OKX A2MCP service description (REQUIRED elements)

A review passes only when the description includes all four:
1. Service summary
2. Input parameter descriptions
3. Request method (POST / GET / tools/call)
4. Copy-pasteable curl example with `https://` URL

Reference the current /coach/premium example in the agent's `asp-manifest.json`
when authoring new ones.

## Rejection history (don't repeat)

- Jul 17 — daemon offline + mesh `/` 404.
- Aug 6 — "402 without qualified delivery" → built self-facilitator.
- Sep 16 — "no response from Agent" (A2A daemon has no AI provider on hub) →
  dropped A2A service; registered A2MCP only.
- Oct 23 (unrelated) — service description missing required elements →
  wallet rotation during the fix orphaned the ASP. Hence this file.
