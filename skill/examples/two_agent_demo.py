#!/usr/bin/env python3
"""Two-agent demo: buyer + seller settling a trade through KaJota Mesh Escrow.

Shows the actual agent-to-agent story:

    * Buyer-agent and seller-agent are two independent processes.
    * They discovered each other's capabilities off-band (would be NANDA
      Index in production).
    * Neither holds a wallet key.  Both drive settlement through HTTP.
    * The KaJota Mesh Escrow skill mediates: escrow lock, dispute channel,
      release.

Coloured split-lane terminal output — buyer left/cyan, skill centre/grey,
seller right/magenta.  Pure stdlib + one dependency (``requests``) so the
script runs anywhere.

Usage:
    # Against a local dry-run FastAPI:
    SKILL_URL=http://localhost:8081 python examples/two_agent_demo.py

    # Against the live Render deploy:
    SKILL_URL=https://kajota-mesh-skill.onrender.com python examples/two_agent_demo.py
"""

from __future__ import annotations

import os
import sys
import time
from threading import Thread

import requests

SKILL_URL = os.environ.get("SKILL_URL", "http://localhost:8081").rstrip("/")

# ANSI colour codes — buyer cyan, seller magenta, skill grey.
CY = "\033[96m"
MG = "\033[95m"
GY = "\033[90m"
YE = "\033[93m"
GR = "\033[92m"
BOLD = "\033[1m"
RE = "\033[0m"

# Pace the demo so the story reads.
PACE = float(os.environ.get("DEMO_PACE", "0.9"))


def buyer(prefix: str, msg: str) -> None:
    print(f"{CY}{prefix:<12}{RE} {msg}", flush=True)
    time.sleep(PACE)


def seller(prefix: str, msg: str) -> None:
    print(f"{MG}{prefix:<12}{RE} {msg}", flush=True)
    time.sleep(PACE)


def skill(msg: str) -> None:
    print(f"{GY}{'← skill':<12}{RE} {msg}", flush=True)
    time.sleep(0.3)


def separator(label: str) -> None:
    print(f"\n{BOLD}{YE}──── {label} ─────────────────────────────────────{RE}\n", flush=True)
    time.sleep(0.5)


def call(method: str, path: str, body: dict[str, object] | None = None) -> dict[str, object]:
    url = f"{SKILL_URL}{path}"
    r = requests.request(method, url, json=body, timeout=180)
    r.raise_for_status()
    return r.json()


def scene() -> None:
    print(f"\n{BOLD}KaJota Mesh Escrow — Two-Agent Demo{RE}")
    print(f"{GY}skill:{RE} {SKILL_URL}\n")
    time.sleep(1)

    # ---- 1. Discovery -----------------------------------------------------
    separator("1. Discovery")

    buyer("buyer-agent", "I need to buy widget-42 for $0.10 USD.")
    seller("seller-agent", "I ship widget-42. My asking price is $0.10.")
    buyer("buyer-agent", "Terms accepted. I do not hold keys — routing through NANDA skill.")
    seller("seller-agent", "Same. Skill address?")
    buyer("buyer-agent", "kajota:mesh-escrow-skill-v1 · Sepolia · USDC.")

    # ---- 2. Wallets -------------------------------------------------------
    separator("2. Managed wallets (no agent holds a key)")

    buyer("buyer-agent", "POST /wallet/create  {label: 'buyer'}")
    buyer_wallet = call("POST", "/wallet/create", {"label": "buyer"})
    bw_id, bw_addr = buyer_wallet["wallet_id"], buyer_wallet["address"]
    skill(f"wallet_id={bw_id}  address={bw_addr}")

    seller("seller-agent", "POST /wallet/create  {label: 'seller'}")
    seller_wallet = call("POST", "/wallet/create", {"label": "seller"})
    sw_id, sw_addr = seller_wallet["wallet_id"], seller_wallet["address"]
    skill(f"wallet_id={sw_id}  address={sw_addr}")

    # ---- 3. Quote ---------------------------------------------------------
    separator("3. Quote")

    buyer("buyer-agent", "POST /escrow/quote  {amount_usd: 0.10}")
    quote = call("POST", "/escrow/quote", {"amount_usd": 0.10})
    skill(f"gross_amount_units={quote['gross_amount_units']} USDC (6 decimals)")

    # ---- 4. Lock ----------------------------------------------------------
    separator("4. Buyer locks USDC into escrow — no wallet key required")

    buyer(
        "buyer-agent",
        "POST /escrow/lock  {buyer_wallet_id, seller_wallet_id, listing_id: 'widget-42'}",
    )
    lock = call(
        "POST",
        "/escrow/lock",
        {
            "buyer_wallet_id": bw_id,
            "listing_id": "widget-42",
            "gross_amount_units": quote["gross_amount_units"],
            "auto_register_with_seller_wallet_id": sw_id,
            "product_id": "widget-42",
        }
        if os.environ.get("MESH_LIVE_MODE") == "1"
        else {
            "buyer_wallet_id": bw_id,
            "listing_id": "widget-42",
            "gross_amount_units": quote["gross_amount_units"],
        },
    )
    deposit_id = str(lock["deposit_id"])
    skill(f"deposit_id={deposit_id[:20]}…")
    skill(f"tx_hash={str(lock['tx_hash'])[:20]}…")
    skill(f"explorer_url={lock['explorer_url']}")

    # ---- 5. Off-chain delivery -------------------------------------------
    separator("5. Off-chain: seller ships, buyer verifies")

    seller("seller-agent", "Escrow observed on-chain. Producing widget-42.")
    seller("seller-agent", "[widget crafted]  shipping to buyer-agent…")
    buyer("buyer-agent", "Delivery received.  Running QC…")
    buyer("buyer-agent", "QC pass.  Authorising release.")

    # ---- 6. Release -------------------------------------------------------
    separator("6. Release — real USDC to seller wallet")

    buyer("buyer-agent", f"POST /escrow/release  {{deposit_id: '{deposit_id[:20]}…'}}")
    release = call("POST", "/escrow/release", {"deposit_id": deposit_id})
    skill(f"tx_hash={release['tx_hash'][:24]}…")
    skill(f"explorer_url={release['explorer_url']}")
    seller("seller-agent", "Payment received.  Settlement complete.")

    # ---- 7. Recap ---------------------------------------------------------
    separator("7. Recap")

    print(f"{GR}✓ Deposit id     :{RE} {deposit_id}")
    print(f"{GR}✓ Lock tx        :{RE} {lock['explorer_url']}")
    print(f"{GR}✓ Release tx     :{RE} {release['explorer_url']}")
    print()
    print(f"{BOLD}Two agents transacted end-to-end through HTTP alone.{RE}")
    print(f"{BOLD}No wallet keys held on either side. Real Ethereum Sepolia settlement.{RE}")


if __name__ == "__main__":
    try:
        scene()
    except requests.RequestException as e:
        print(f"\n\033[91mHTTP error against {SKILL_URL}: {e}\033[0m", file=sys.stderr)
        sys.exit(1)
