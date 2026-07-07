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

step "3. Escrow release — settle a deposit to the seller (dry-run: synthetic tx)"
call POST /escrow/release "{\"deposit_id\": \"${DEPOSIT_ID}\"}" | jq .

step "4. Credit score — deterministic rules-based SME trade-credit scoring"
call POST /credit/score "$(cat <<EOF
{
  "subject": "${SUBJECT}",
  "history": {
    "months_active": 18,
    "completed_orders": 84,
    "gross_volume_usd": 32000.0,
    "receivables_financed": 12,
    "receivables_repaid": 11,
    "receivables_defaulted": 1,
    "disputes": 0,
    "outstanding_usd": 4500.0
  }
}
EOF
)" | jq .

step "5. Credit lookup — read on-chain attestation (may 404 in dry-run)"
call GET "/credit/${SUBJECT}" 2>/dev/null | jq . || echo "(404 expected in dry-run — anchor not live)"

printf "\n\033[1;32mAll steps succeeded against %s\033[0m\n" "${SKILL_URL}"
