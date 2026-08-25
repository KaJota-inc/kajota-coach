#!/usr/bin/env bash
# Sponsor-gas watchdog for the Casper x402 judge demo.
#
# The facilitator settles with a SHARED sponsored gas account (81d557c9…) that
# drains under whole-cohort load. When it hits ~0, every settlement fails
# "insufficient balance". This checks it and tops it up from our payer when low,
# without draining the payer below a safety buffer. Runs from launchd every 30m.
#
# Logs to agent/scripts/gas_watchdog.log. Manual run: bash gas_watchdog.sh
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT="$(cd "$DIR/.." && pwd)"
LOG="$DIR/gas_watchdog.log"

# thresholds (CSPR)
SPONSOR_MIN=150          # top up when sponsor drops below this
TOPUP=1000               # amount to send per top-up
PAYER_BUFFER=400         # never send if it would leave the payer below this

log(){ echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"; }

set +u; set -a; source "$AGENT/.env.casper" 2>/dev/null; set +a; set -u
KEY="${X402_FACILITATOR_API_KEY:-}"
FEEPAYER="${X402_FEE_PAYER:-81d557c9dcaadea97c34d79bf7b6af07aa9d760e5dd1aabf78a45fb39e072c3a}"
PAYER_HASH="0de60d3acb6caba35e66e90a62ebf2707a0e04286de203fb316179c1f2c9ed84"

if [[ -z "$KEY" ]]; then log "ERROR: no X402_FACILITATOR_API_KEY (.env.casper not found?)"; exit 1; fi

bal_cspr(){ # account-hash -> integer CSPR (floor), or empty on error
  curl -sS -m 15 "https://api.testnet.cspr.cloud/accounts/$1" -H "Authorization: $KEY" 2>/dev/null \
    | python3 -c "import sys,json
try:
  b=json.load(sys.stdin).get('data',{}).get('balance') or 0; print(int(int(b)/1e9))
except: print('')"
}

SPONSOR=$(bal_cspr "$FEEPAYER")
PAYER=$(bal_cspr "$PAYER_HASH")
if [[ -z "$SPONSOR" || -z "$PAYER" ]]; then log "WARN: balance query failed (sponsor='$SPONSOR' payer='$PAYER')"; exit 0; fi

if (( SPONSOR >= SPONSOR_MIN )); then
  log "ok: sponsor ${SPONSOR} CSPR (>= ${SPONSOR_MIN}), payer ${PAYER} CSPR — no action"
  exit 0
fi

if (( PAYER < TOPUP + PAYER_BUFFER )); then
  log "ALERT: sponsor LOW (${SPONSOR} CSPR) but payer too low to top up (${PAYER} CSPR < ${TOPUP}+${PAYER_BUFFER}). Faucet the payer 00${PAYER_HASH} at https://testnet.cspr.live/tools/faucet"
  exit 0
fi

log "sponsor LOW (${SPONSOR} CSPR) — topping up ${TOPUP} CSPR from payer (${PAYER} CSPR)…"
cd "$DIR"
export CLIENT_PRIVATE_KEY_PATH="$DIR/payer.pem" CLIENT_KEY_ALGO=secp256k1 FUND_CSPR="$TOPUP"
if OUT=$(node fund_feepayer.mjs --submit 2>&1); then
  TX=$(echo "$OUT" | grep -oE '[0-9a-f]{64}' | tail -1)
  log "topped up ${TOPUP} CSPR — tx ${TX:-?}"
else
  log "ERROR: top-up failed: $(echo "$OUT" | tail -1)"
fi
