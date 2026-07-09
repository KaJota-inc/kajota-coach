#!/usr/bin/env python3
"""Reference agent: run the full KaJota Mesh Escrow cycle from a script.

Uses only ``urllib`` from the stdlib — no dependencies at all.  An LLM
agent following ``SKILL.md`` would produce something structurally
identical.  The point of shipping this file: reviewers can see the
end-to-end HTTP flow in ~50 lines and copy-paste it against their own
deploy.

Usage:
    python example_agent.py                    # defaults to localhost:8081
    SKILL_URL=https://kajota-mesh-skill.onrender.com python example_agent.py
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

SKILL_URL = os.environ.get("SKILL_URL", "http://localhost:8081").rstrip("/")


def call(method: str, path: str, body: dict[str, object] | None = None) -> dict[str, object]:
    url = f"{SKILL_URL}{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={"content-type": "application/json"} if data else {},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"{method} {path} → {e.code} {e.read().decode()}") from e


def main() -> int:
    print(f"[agent] targeting {SKILL_URL}")

    health = call("GET", "/healthz")
    print(f"[agent] service mode={health['mode']} chain_id={health['chain_id']}")

    buyer = call("POST", "/wallet/create", {"label": "buyer"})
    seller = call("POST", "/wallet/create", {"label": "seller"})
    print(f"[agent] created buyer {buyer['address']} + seller {seller['address']}")

    quote = call("POST", "/escrow/quote", {"amount_usd": 42.50})
    amount = int(quote["gross_amount_units"])
    print(f"[agent] $42.50 = {amount} USDC base units")

    lock = call(
        "POST",
        "/escrow/lock",
        {
            "buyer_wallet_id": buyer["wallet_id"],
            "listing_id": "example-listing-42",
            "gross_amount_units": amount,
        },
    )
    deposit_id = str(lock["deposit_id"])
    print(f"[agent] locked → deposit_id={deposit_id[:24]}…  tx={lock['tx_hash']}")

    # Off-chain: agent verifies delivery.  Here we just assert success.
    print("[agent] simulated delivery verification: OK")

    release = call("POST", "/escrow/release", {"deposit_id": deposit_id})
    print(f"[agent] released → tx={release['tx_hash']}")
    print(f"[agent] explorer: {release['explorer_url']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
