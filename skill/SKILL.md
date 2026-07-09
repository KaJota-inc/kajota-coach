# KaJota Mesh Escrow

On-chain USDC escrow for AI agents on Ethereum Sepolia. Create a demo wallet, lock funds against a listing, release on proof of delivery, or refund — every step is a single HTTP call. Agents do not hold or sign keys.

Base URL: `https://kajota-mesh-skill.onrender.com`

Free tier: the first request after ~15 minutes idle can take 30–60 seconds while the service wakes up. Retry once.

---

## Endpoints

### `GET /healthz`
Liveness + chain probe.

Example:
```bash
curl -s https://kajota-mesh-skill.onrender.com/healthz
```

Response:
```json
{"ok": true, "mode": "live", "service_address": "0xe10cff27c99074cd44c64bed1b000226442524a4", "chain_id": 11155111, "extra": {"block_number": 6412809, "escrow": "0x599869cef2e4c52e2c9074caaf8f9fb0cb191776", "registry": "0xfce6bd68d8d6f858d447f537d206c1e354b44315"}}
```

`mode` is `"live"` when the service is on Sepolia, `"dry_run"` when it returns synthetic tx hashes.

---

### `POST /wallet/create`
Create a fresh managed demo wallet. Server holds the private key; you get an opaque `wallet_id` to pass into `/escrow/lock`. In live mode the service transfers a small ETH grant (gas) and USDC grant from its treasury so the wallet is immediately usable.

Body: `{"label": "buyer"}` — optional label, purely for your own records.

Example:
```bash
curl -s -X POST https://kajota-mesh-skill.onrender.com/wallet/create -H content-type:application/json -d '{"label":"buyer"}'
```

Response:
```json
{"wallet_id": "w-ee5dd45d121e", "address": "0x80C62f79EB33319d15F274477416c2B605A940d1", "note": "Demo wallet — service holds the key. Do not send real funds."}
```

---

### `GET /wallet/{wallet_id}`
Read ETH and USDC balances for a managed wallet.

Example:
```bash
curl -s https://kajota-mesh-skill.onrender.com/wallet/w-ee5dd45d121e
```

Response:
```json
{"wallet_id": "w-ee5dd45d121e", "address": "0x80C62f79EB33319d15F274477416c2B605A940d1", "eth_wei": 10000000000000000, "usdc_units": 100000000, "currency": "USDC"}
```

---

### `POST /escrow/quote`
Convert a human-readable USD amount to USDC base units (6 decimals). Pure compute, no chain call.

Example:
```bash
curl -s -X POST https://kajota-mesh-skill.onrender.com/escrow/quote -H content-type:application/json -d '{"amount_usd": 42.50}'
```

Response:
```json
{"gross_amount_units": 42500000, "fee_amount_units": 0, "net_amount_units": 42500000, "currency": "USDC"}
```

---

### `POST /escrow/lock`
Server-signed deposit into the on-chain escrow. Does the two transactions the buyer would otherwise sign themselves — `USDC.approve(escrow, amount)` then `CosellEscrow.deposit(listingId, amount)` — and returns the `deposit_id` parsed from the `Deposited` event. Pass this id to `/escrow/release` or `/escrow/refund`.

Body:
```json
{"buyer_wallet_id": "w-ee5dd45d121e", "listing_id": "0xabababababababababababababababababababababababababababababababab", "gross_amount_units": 42500000}
```

Example:
```bash
curl -s -X POST https://kajota-mesh-skill.onrender.com/escrow/lock -H content-type:application/json -d '{"buyer_wallet_id":"w-ee5dd45d121e","listing_id":"0xabababababababababababababababababababababababababababababababab","gross_amount_units":42500000}'
```

Response:
```json
{"deposit_id": "0xc57c485c6f357f6a1816a20e50ffc44ec4a690b3f7884cdbbc82df632e11d800", "tx_hash": "0x1a9b...c30f", "explorer_url": "https://sepolia.etherscan.io/tx/0x1a9b...c30f", "listing_id": "0xabab...abab", "buyer_address": "0x80C6...40d1", "gross_amount_units": 42500000}
```

---

### `GET /escrow/deposit/{deposit_id}`
Read on-chain state of a deposit.

Example:
```bash
curl -s https://kajota-mesh-skill.onrender.com/escrow/deposit/0xc57c485c6f357f6a1816a20e50ffc44ec4a690b3f7884cdbbc82df632e11d800
```

Response:
```json
{"deposit_id": "0xc57c...d800", "listing_id": "0xabab...abab", "buyer": "0x80C6...40d1", "seller": "0x0000...0000", "gross_amount_units": 42500000, "fee_amount_units": 0, "net_amount_units": 42500000, "status": "pending"}
```

`status` is `"pending"`, `"released"`, or `"refunded"`.

---

### `POST /escrow/release`
Release the escrowed USDC to the seller. Authorised by the service wallet (matches `releaseAuth` on the deployed escrow). Call this once delivery is verified off-chain.

Body: `{"deposit_id": "0xc57c...d800"}`

Example:
```bash
curl -s -X POST https://kajota-mesh-skill.onrender.com/escrow/release -H content-type:application/json -d '{"deposit_id":"0xc57c485c6f357f6a1816a20e50ffc44ec4a690b3f7884cdbbc82df632e11d800"}'
```

Response:
```json
{"deposit_id": "0xc57c...d800", "action": "release", "tx_hash": "0x9f8a...4b21", "explorer_url": "https://sepolia.etherscan.io/tx/0x9f8a...4b21"}
```

---

### `POST /escrow/refund`
Refund the escrowed USDC to the buyer. Same shape as `/escrow/release`. Use when delivery did not occur.

Example:
```bash
curl -s -X POST https://kajota-mesh-skill.onrender.com/escrow/refund -H content-type:application/json -d '{"deposit_id":"0xc57c485c6f357f6a1816a20e50ffc44ec4a690b3f7884cdbbc82df632e11d800"}'
```

Response:
```json
{"deposit_id": "0xc57c...d800", "action": "refund", "tx_hash": "0x77e1...58a3", "explorer_url": "https://sepolia.etherscan.io/tx/0x77e1...58a3"}
```

---

## How an agent uses this service

1. Call `POST /wallet/create` to get a buyer `wallet_id`. The service funds it with USDC + gas.
2. Call `POST /escrow/quote` with the USD price to learn the exact `gross_amount_units`.
3. Call `POST /escrow/lock` with `buyer_wallet_id`, `listing_id` (any 0x-prefixed 32-byte hex you generate), and `gross_amount_units`. Save the returned `deposit_id`.
4. Verify off-chain that the seller has delivered (this step depends on the agent's own logic and is out of scope for this skill).
5. On success, call `POST /escrow/release` with the `deposit_id`. The service settles to the seller on-chain.
6. On failure or cancellation, call `POST /escrow/refund` with the same `deposit_id`. The service returns funds to the buyer wallet.
7. At any point, call `GET /escrow/deposit/{deposit_id}` to read the on-chain state (`pending` / `released` / `refunded`).

Every step is one HTTP call. No wallet keys leave the service.

---

## Stack

| Layer | Value |
|---|---|
| Chain | Ethereum Sepolia (chainId `11155111`) |
| USDC | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` |
| `CosellRegistry` | `0xfce6bd68d8d6f858d447f537d206c1e354b44315` |
| `CosellEscrow` | `0x599869cef2e4c52e2c9074caaf8f9fb0cb191776` |
| Explorer | https://sepolia.etherscan.io |

Discoverable via the MIT NANDA Index: `agentfacts.json` served at `/agentfacts.json`.

Source: https://github.com/KaJota-inc/kajota-coach/tree/hackathon/nanda-mesh-skill/skill.
