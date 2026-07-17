# Deploy the live judge demo (Render)

Standalone always-on service — isolated from kajota-hub so it can't affect the
other live services. Delete after the Buildathon (Jul 26).

## Create the service (Render dashboard)

New → **Web Service** → connect `KaJota-inc/kajota-coach`:

| Setting | Value |
|---|---|
| Branch | `hackathon/casper` |
| Root Directory | `agent/judge` |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `node server.mjs` |
| Instance Type | Free (keep warm with UptimeRobot) or Starter (always-on) |
| Health Check Path | `/healthz` |

## Environment variables

Public config:

```
X402_FACILITATOR_URL=https://x402-facilitator.cspr.cloud
X402_NETWORK=casper:casper-test
X402_PAY_TO=000de60d3acb6caba35e66e90a62ebf2707a0e04286de203fb316179c1f2c9ed84
X402_ASSET=354ca0ad7ef8c97a02b195a1f39e96908fd3bf20d6ec4255850d05f1784fb404
X402_MAX_AMOUNT=1000000
X402_ASSET_NAME=KaJota USD
X402_ASSET_VERSION=1
X402_ASSET_DECIMALS=9
X402_FEE_PAYER=81d557c9dcaadea97c34d79bf7b6af07aa9d760e5dd1aabf78a45fb39e072c3a
X402_VERSION=2
CLIENT_KEY_ALGO=secp256k1
```

Two **secret** values (mark as secret in Render):

- `X402_FACILITATOR_API_KEY` — the sponsored CSPR.cloud key.
- `CLIENT_PRIVATE_KEY_PEM` — paste the full contents of `agent/scripts/payer.pem`
  (multi-line PEM; Render accepts multi-line env values). The server writes it to a
  0600 temp file at boot.

Optional: `X402_RESOURCE` (defaults to the hub premium URL — only affects the
signature's bound resource string, not correctness).

## Verify after deploy

```
curl -s https://<your-judge-url>/healthz        # {"ok":true,"payer":"000de60d…"}
curl -s https://<your-judge-url>/challenge | jq # HTTP 402 live challenge
```

Then open the URL and click **Pay & settle on Casper** — a real tx appears in ~10s.

## Keep it working through judging

Settlements use the facilitator's shared sponsored gas account (`81d557c9…`),
which periodically drains to 0 (then all settlements fail "insufficient balance").
If that happens, top it up:

```
cd agent/scripts
export CLIENT_PRIVATE_KEY_PATH=./payer.pem CLIENT_KEY_ALGO=secp256k1
set -a; source ../.env.casper; set +a
node fund_feepayer.mjs --submit     # sends 2000 testnet CSPR to the sponsor
```
