#!/usr/bin/env bash
# verify-skill.sh — end-to-end demo an agent (or reviewer) can run against
# the deployed KaJota Mesh Skill.  Pretty-prints each step with jq; exits
# non-zero on any failed HTTP or unexpected response shape.
#
# Usage:
#     SKILL_URL=https://kajota-mesh-skill.onrender.com ./verify-skill.sh
#     ./verify-skill.sh                    # defaults to localhost:8081
#
# Ideal for the NandaHack Step-2 demo recording: run it live against the
# deployed URL, screen-cap the output, done.

set -euo pipefail

SKILL_URL="${SKILL_URL:-http://localhost:8081}"
SUBJECT="${SUBJECT:-0x1111111111111111111111111111111111111111}"
DEPOSIT_ID="${DEPOSIT_ID:-0xabababababababababababababababababababababababababababababababab}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "missing dep: $1" >&2; exit 2; }; }
need curl
need jq

step() { printf "\n\033[1;34m=== %s ===\033[0m\n" "$1"; }
call() {
  local method="$1" path="$2" body="${3-}"
  if [[ -n "$body" ]]; then
    curl -fsS -X "$method" -H content-type:application/json -d "$body" "${SKILL_URL}${path}"
  else
    curl -fsS -X "$method" "${SKILL_URL}${path}"
  fi
}

step "1. Health probe — is the service alive?"
call GET /healthz | jq .

step "2. Escrow quote — convert USD to USDC base units"
call POST /escrow/quote '{"amount_usd": 42.5}' | jq .

step "3. Create buyer wallet (server-signed managed demo wallet)"
BUYER_JSON=$(call POST /wallet/create '{"label": "buyer"}')
echo "$BUYER_JSON" | jq .
BUYER_ID=$(echo "$BUYER_JSON" | jq -r .wallet_id)

step "4. Create seller wallet"
SELLER_JSON=$(call POST /wallet/create '{"label": "seller"}')
echo "$SELLER_JSON" | jq .

step "5. Lock \$42.50 USDC into escrow — approve + deposit, both signed server-side"
LOCK_JSON=$(call POST /escrow/lock "$(cat <<EOF
{
  "buyer_wallet_id": "${BUYER_ID}",
  "listing_id": "0xabababababababababababababababababababababababababababababababab",
  "gross_amount_units": 42500000
}
EOF
)")
echo "$LOCK_JSON" | jq .
DEP_ID=$(echo "$LOCK_JSON" | jq -r .deposit_id)

step "6. Release escrow to seller — settles on Sepolia via releaseAuth key"
call POST /escrow/release "{\"deposit_id\": \"${DEP_ID}\"}" | jq .

step "7. Wallet balance (post-lock; USDC now in escrow, not in wallet)"
call GET "/wallet/${BUYER_ID}" | jq .

printf "\n\033[1;32mFull escrow cycle succeeded against %s (create → lock → release, all HTTP)\033[0m\n" "${SKILL_URL}"
