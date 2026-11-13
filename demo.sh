#!/usr/bin/env bash
#
# One-command local demo stack for KaJota Coach × Casper.
#
# Brings up the three moving parts of the x402 premium flow and leaves Metro
# in the foreground; Ctrl-C tears the whole thing down:
#
#   1. Agent   — FastAPI /coach/premium paywall            http://localhost:8080
#   2. Bridge  — signs the x402 payment (holds payer key)  http://localhost:4040
#   3. Metro   — Expo bundler for the RN app               http://localhost:8088
#
# Then open the app on the simulator and tap "Premium Insight (x402 · pay on
# Casper)". The agent serves the 402 price tag; the bridge signs it; the
# facilitator settles on Casper.
#
# Prereqs (see agent/CASPER.md):
#   - agent installed:   pip install -e ./agent
#   - agent configured:  agent/.env.casper  (CSPR.cloud key, asset, payTo…)
#   - bridge deps:       (cd agent/scripts && npm install)
#   - RN deps:           npm install
#   - payer key (for one-tap pay): export CLIENT_PRIVATE_KEY_PATH=…/payer.pem
#
# Config (env overrides): AGENT_PORT=8080 SIGNER_PORT=4040 METRO_PORT=8088
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_PORT="${AGENT_PORT:-8080}"
SIGNER_PORT="${SIGNER_PORT:-4040}"
METRO_PORT="${METRO_PORT:-8088}"
LOG_DIR="$ROOT/logs"
mkdir -p "$LOG_DIR"

# Load agent/.env.casper into the environment so both the agent and the bridge
# see the same config (CSPR.cloud key, network, asset, payer key path…).
if [[ -f "$ROOT/agent/.env.casper" ]]; then
  set -a; # shellcheck disable=SC1091
  source "$ROOT/agent/.env.casper"; set +a
  echo "✓ loaded agent/.env.casper"
else
  echo "⚠ agent/.env.casper not found — copy agent/.env.casper.example and fill it in."
fi

PIDS=()
cleanup() {
  echo ""
  echo "⏹  shutting down demo stack…"
  for pid in "${PIDS[@]:-}"; do
    [[ -n "$pid" ]] && kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  echo "   done."
}
trap cleanup INT TERM EXIT

port_busy() { lsof -ti ":$1" >/dev/null 2>&1; }

wait_for() { # url, label, tries
  local url="$1" label="$2" tries="${3:-40}"
  for ((i=0; i<tries; i++)); do
    if curl -s -m 3 -o /dev/null "$url"; then echo "   ✓ $label up"; return 0; fi
    sleep 1
  done
  echo "   ✗ $label did not come up in time — check its log."; return 1
}

echo "── KaJota Coach × Casper — local demo stack ──"

# ── 1. Agent ──────────────────────────────────────────────────────────────
if port_busy "$AGENT_PORT"; then
  echo "▸ Agent: port $AGENT_PORT already in use — reusing whatever is there."
else
  echo "▸ Agent: starting on :$AGENT_PORT (log: logs/agent.log)"
  if command -v kajota-agent >/dev/null 2>&1; then
    ( cd "$ROOT/agent" && PORT="$AGENT_PORT" kajota-agent ) >"$LOG_DIR/agent.log" 2>&1 &
  else
    # Fall back to uvicorn if the console script isn't on PATH.
    ( cd "$ROOT/agent" && PORT="$AGENT_PORT" python -m uvicorn kajota_concierge.server:app \
        --host 0.0.0.0 --port "$AGENT_PORT" ) >"$LOG_DIR/agent.log" 2>&1 &
  fi
  PIDS+=("$!")
  wait_for "http://localhost:$AGENT_PORT/" "agent" || true
fi

# ── 2. Signer bridge (optional — needs a payer key) ───────────────────────
if [[ -z "${CLIENT_PRIVATE_KEY_PATH:-}" || ! -f "${CLIENT_PRIVATE_KEY_PATH:-/nonexistent}" ]]; then
  echo "▸ Bridge: SKIPPED — set CLIENT_PRIVATE_KEY_PATH to a payer PEM to enable one-tap pay."
  echo "          (the app still shows the live 402 price tag; paste a payload to settle.)"
elif port_busy "$SIGNER_PORT"; then
  echo "▸ Bridge: port $SIGNER_PORT already in use — reusing whatever is there."
else
  echo "▸ Bridge: starting on :$SIGNER_PORT (log: logs/bridge.log)"
  ( cd "$ROOT/agent/scripts" && SIGNER_PORT="$SIGNER_PORT" node x402_signer_bridge.mjs ) \
      >"$LOG_DIR/bridge.log" 2>&1 &
  PIDS+=("$!")
  wait_for "http://localhost:$SIGNER_PORT/health" "bridge" || true
fi

# ── 3. Metro (foreground) ─────────────────────────────────────────────────
if port_busy "$METRO_PORT"; then
  echo "✗ Metro: port $METRO_PORT is busy. Another Expo server may be running there"
  echo "         (a stale Metro from a DIFFERENT project serves the WRONG bundle)."
  echo "         Free it (lsof -ti :$METRO_PORT | xargs kill) or set METRO_PORT=…"
  exit 1
fi

cat <<BANNER

── stack up ─────────────────────────────────────────────
  Agent   http://localhost:$AGENT_PORT   (/coach/premium)
  Bridge  http://localhost:$SIGNER_PORT   (/sign)
  Metro   http://localhost:$METRO_PORT   (starting below…)

  Next: run the app  →  npm run ios   (or press i once Metro is up)
        then tap "Premium Insight (x402 · pay on Casper)".
  Ctrl-C here stops the whole stack.
─────────────────────────────────────────────────────────
BANNER

echo "▸ Metro: starting on :$METRO_PORT"
RCT_METRO_PORT="$METRO_PORT" npx expo start --port "$METRO_PORT"
