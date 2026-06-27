#!/usr/bin/env python3
"""Client-side demo for the KaJota Coach x402 paywall.

Runnable, honest helper for the buildathon demo. It does the part that needs
no private key — the **unpaid probe** — for real: POST /coach/premium with no
payment, then decode and pretty-print the Casper price tag (PaymentRequirements)
the server hands back.

It then shows the *shape* of the signed PaymentPayload the client must send
back in the ``X-PAYMENT`` header, and points at where the EIP-712 signing
plugs in. We deliberately do NOT fake a signature here: real settlement needs
a Casper key signing a CEP-18 ``transfer_with_authorization`` (use the
``make-software/casper-x402`` JS/Go client, or CSPR.click in a browser).

Usage:
    python scripts/x402_demo.py [--url http://localhost:8080] [--payment <base64>]

With ``--payment`` (a base64 PaymentPayload produced by a real signer) it sends
the paid request and prints the settlement receipt (the Casper deploy hash).
"""

from __future__ import annotations

import argparse
import base64
import json
import sys

import httpx


def _decode_requirements(resp: httpx.Response) -> None:
    """Print the 402 price tag from both the body and the header."""
    print(f"\n← HTTP {resp.status_code} {resp.reason_phrase}")
    body = resp.json()
    accepts = body.get("accepts", [])
    print(f"  error: {body.get('error')}")
    for i, req in enumerate(accepts):
        print(f"  accepts[{i}]:")
        for k in (
            "scheme",
            "network",
            "maxAmountRequired",
            "asset",
            "payTo",
            "resource",
            "maxTimeoutSeconds",
        ):
            print(f"    {k:20} {req.get(k)}")
    hdr = resp.headers.get("PAYMENT-REQUIRED")
    if hdr:
        decoded = json.loads(base64.b64decode(hdr))
        print(f"  PAYMENT-REQUIRED header decodes to network={decoded.get('network')}")


def _payload_skeleton(requirements: dict) -> dict:
    """The PaymentPayload a real signer fills in and base64-encodes."""
    return {
        "x402Version": 1,
        "scheme": "exact",
        "network": requirements.get("network"),
        "payload": {
            "signature": "<ed25519 sig over EIP-712 transfer_with_authorization>",
            "authorization": {
                "from": "<payer account hash>",
                "to": requirements.get("payTo"),
                "value": requirements.get("maxAmountRequired"),
                "validAfter": "<unix ts>",
                "validBefore": "<unix ts>",
                "nonce": "<random 32-byte hex>",
            },
        },
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://localhost:8080")
    ap.add_argument("--payment", help="base64 PaymentPayload from a real signer")
    args = ap.parse_args()

    endpoint = f"{args.url.rstrip('/')}/coach/premium"

    if args.payment:
        print(f"→ POST {endpoint}  (with X-PAYMENT)")
        resp = httpx.post(endpoint, json={}, headers={"X-PAYMENT": args.payment}, timeout=120)
        if resp.status_code == 200:
            data = resp.json()
            print(f"← HTTP 200 — paid. settlement: {json.dumps(data.get('settlement'), indent=2)}")
            rcpt = resp.headers.get("X-PAYMENT-RESPONSE")
            if rcpt:
                print(f"  X-PAYMENT-RESPONSE: {json.loads(base64.b64decode(rcpt))}")
        else:
            _decode_requirements(resp)
        return 0 if resp.status_code == 200 else 1

    # Unpaid probe — real, no key needed.
    print(f"→ POST {endpoint}  (no payment)")
    resp = httpx.post(endpoint, json={}, timeout=30)
    if resp.status_code != 402:
        print(f"  unexpected: HTTP {resp.status_code} — is the paywall configured?")
        print(f"  {resp.text[:300]}")
        return 1
    _decode_requirements(resp)

    requirements = resp.json()["accepts"][0]
    print("\nNext: a Casper signer fills in and base64-encodes this payload,")
    print("then re-sends it as the X-PAYMENT header (--payment):\n")
    print(json.dumps(_payload_skeleton(requirements), indent=2))
    print(
        "\nSign with: make-software/casper-x402 (JS/Go client) or CSPR.click. "
        "The server (this repo) then /verify + /settle on Casper."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
