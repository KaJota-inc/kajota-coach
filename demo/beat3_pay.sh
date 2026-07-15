#!/usr/bin/env bash
# Demo helper for Beat 3 of the OKX.AI Genesis submission video.
#
# Fetches Coach's live 402 challenge, then hands the payload to
# `onchainos payment pay` — OKX's Agentic Wallet TEE-signs an EIP-3009
# `transferWithAuthorization` and returns the ready-to-broadcast
# `authorization + signature` blob. The blob is exactly what a
# facilitator would submit on XLayer mainnet to move the fee from the
# buyer wallet (0x7876…50007) to Coach's payTo (0x8673…5fcb0).
#
# Two small in-flight patches vs. the raw 402:
#   1. network: eip155:195 → eip155:196 (OKX chain 195 isn't
#      indexed on the payment side; XLayer mainnet is 196).
#   2. asset:   hub-env placeholder → 0x1e4a5963abfd975d8c9021ce480b42188849d41d
#      (real XLayer mainnet USDT).
# These will disappear once Coach's hub env vars (X402_NETWORK,
# X402_ASSET, X402_ASSET_NAME/VERSION) are set to their production
# values; the code path itself already emits the corrected `resource`
# URL via X-Forwarded-* headers.

set -euo pipefail

ENDPOINT="https://kajota-hub.onrender.com/coach-okx/coach/premium"
XLAYER_USDT="0x1e4a5963abfd975d8c9021ce480b42188849d41d"

curl -s "$ENDPOINT" \
  | jq --arg asset "$XLAYER_USDT" '
      .accepts[0].network = "eip155:196"
      | .accepts[0].asset = $asset
      | .accepts[0].extra.name = "Tether USD"
      | .accepts[0].extra.version = "1"
    ' \
  | base64 \
  | xargs -I {} onchainos payment pay --payload {} \
  | jq '.data'
