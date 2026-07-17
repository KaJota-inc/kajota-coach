# Testing Playbook — KaJota Coach × Casper

Step-by-step instructions to verify the MVP on Casper Testnet. No setup required for
Path A; Paths B–C reproduce the on-chain settlement yourself.

**Submission branch:** `hackathon/casper` · **Live API:** `https://kajota-hub.onrender.com/concierge`
· **Demo video:** https://youtu.be/fFbvIZV52RA

---

## Path A — Hit the live x402 paywall (60s, no install)

The premium endpoint is gated by the x402 protocol. An unpaid request returns a
`402` with the Casper price tag:

```bash
curl -s https://kajota-hub.onrender.com/concierge/coach/premium | jq
```

Expected: **HTTP 402** with an `accepts` array containing:
- `scheme: "exact"`, `network: "casper:casper-test"`
- `amount: "1000000"` (0.001 KaJota USD, 9 decimals)
- `asset: "354ca0ad…4fb404"` (our deployed CEP-18)
- `payTo: "000de60d…c9ed84"` (merchant account-hash)
- `extra.feePayer: "81d557c9…"` (sponsored gas account)

A **GET** on the same URL returns the same challenge plus a human-readable
`howToPay` block, so the endpoint is self-documenting when opened in a browser.

Health check: `curl -s https://kajota-hub.onrender.com/concierge/healthz` → `{"ok":true,...}`

---

## Path B — Verify the on-chain proof (no install)

Everything below is live on the Casper Testnet explorer:

| What | Link |
|---|---|
| CEP-18 contract "KaJota USD" (`transfer_with_authorization`) | package `354ca0ad7ef8c97a02b195a1f39e96908fd3bf20d6ec4255850d05f1784fb404` |
| Contract deploy tx | https://testnet.cspr.live/transaction/df0847848800502b1b6919c1ad9a2dc0845c309006382b21ef8ad759d7c4171a |
| x402 settlement tx (real agent micropayment) | https://testnet.cspr.live/transaction/88c4153e211011915b7b7bc2af718ada2b506266512701a7488a80f77a58b4a3 |

On the settlement tx, confirm: `status: processed`, `error_message: null`, Action =
`Authorized transfer`, and the gas caller is the sponsored feePayer `81d557c9…`
(the agent moved value without holding native CSPR — the x402 promise).

---

## Path C — Reproduce a settlement yourself (local)

Prereqs: Python 3.11+, Node 18+, a funded Casper testnet secp256k1 key (PEM).

```bash
git clone -b hackathon/casper https://github.com/KaJota-inc/kajota-coach
cd kajota-coach

# 1. configure — copy the template and fill the sponsored CSPR.cloud key
cp agent/.env.casper.example agent/.env.casper   # set X402_FACILITATOR_API_KEY

# 2. install + run the x402 unit tests (no network, no keys)
pip install -e ./agent && pytest agent/tests/test_x402_casper.py    # 14 tests pass

# 3. land a REAL on-chain settlement (needs a funded payer PEM)
cd agent/scripts && npm install
export CLIENT_PRIVATE_KEY_PATH=./payer.pem CLIENT_KEY_ALGO=secp256k1
node settle_once.mjs      # signs transfer_with_authorization → /verify → /settle → prints tx
```

Full details and every x402 wire-format finding: **[agent/RUNBOOK.md](agent/RUNBOOK.md)**
and **[agent/CASPER.md](agent/CASPER.md)**.

---

## Path D — Mobile app (one-command demo)

```bash
npm install && npm run demo    # brings up agent :8080 + signer bridge :4040 + Metro :8088
npm run ios                    # open the app, tap "Unlock Premium Insight"
```

The Premium screen walks the full `402 → sign → settle → insight` loop against the
live endpoint and shows the on-chain deploy hash with a `View on cspr.live` link.
