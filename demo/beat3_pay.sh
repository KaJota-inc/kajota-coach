#!/usr/bin/env bash
# Demo helper for Beat 3 of the OKX.AI Genesis submission video.
#
# Fetches Coach's live 402 challenge and hands the payload directly to
# `onchainos payment pay` — OKX's Agentic Wallet TEE-signs an EIP-3009
# `transferWithAuthorization` and returns the ready-to-broadcast
# `authorization + signature` blob. The blob is exactly what an EVM
# facilitator would submit on XLayer mainnet to move the fee from the
# buyer wallet to Coach's payTo.
#
# No in-flight patches needed — Coach's hub env now emits the correct
# eip155:196 chain + XLayer mainnet USDT asset natively.

set -euo pipefail

ENDPOINT="https://kajota-hub.onrender.com/coach-okx/coach/premium"

curl -s "$ENDPOINT" \
  | base64 \
  | { read -r PAYLOAD; onchainos payment pay --payload "$PAYLOAD"; } \
  | jq '.data'
