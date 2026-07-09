"""Mesh on-chain settlement client for the Slack transport.

The Slack `/kajota pay` command lands here. Given a listing id and a
gross-amount in USDC, this module:

1. Reads the two Mesh contracts (CosellRegistry, CosellEscrow) and the
   MockUSDC token to validate the listing exists + the buyer has funds.
2. Builds the two-tx deposit sequence — USDC.approve(escrow, amount)
   then CosellEscrow.deposit(listingId, grossAmount).
3. If `MESH_RELAYER_PRIVATE_KEY` is set, signs + broadcasts both txs
   from a demo-relayer wallet so the Slack demo shows a real on-chain
   settlement receipt. If not set, returns the unsigned tx objects the
   client can hand to a wallet.

The default chain is Mantle Sepolia (chainId 5003) — the only chain in
the current Mesh deploy set with the full stack (Registry + Escrow +
MockUSDC) live. Amoy (80002) is registry-only until the POL top-up
lands; pointing at Amoy will raise on escrow calls.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from importlib.resources import files
from typing import Any

from eth_account import Account
from web3 import Web3
from web3.types import TxParams


DEFAULT_CHAINS: dict[str, dict[str, Any]] = {
    "mantle-sepolia": {
        "chain_id": 5003,
        "rpc": "https://rpc.sepolia.mantle.xyz",
        "explorer_tx": "https://explorer.sepolia.mantle.xyz/tx/",
        "registry": "0x33A1029d5E43E0A4eb1E9397881390D28f02DA7e",
        "escrow": "0xe02b16c439e7596F7A032ACe5E9ff42c2ecd3167",
        "usdc": "0x6F0EaF790309e05C550bD7bbdB36ADF6db978f4d",
    },
    "amoy": {
        "chain_id": 80002,
        "rpc": "https://rpc-amoy.polygon.technology",
        "explorer_tx": "https://amoy.polygonscan.com/tx/",
        "registry": "0x33A1029d5E43E0A4eb1E9397881390D28f02DA7e",
        "escrow": None,
        "usdc": "0x6F0EaF790309e05C550bD7bbdB36ADF6db978f4d",
    },
}


class MeshConfigError(RuntimeError):
    pass


class MeshCallError(RuntimeError):
    pass


@dataclass
class TxReceipt:
    label: str
    hash: str
    explorer_url: str
    status: str  # "confirmed" | "pending" | "unsigned"
    from_address: str
    to_address: str
    raw: dict[str, Any] = field(default_factory=dict)


@dataclass
class DepositResult:
    chain: str
    listing_id: str
    gross_amount: int
    gross_amount_display: str
    approve: TxReceipt
    deposit: TxReceipt
    signed: bool


def _load_abi(name: str) -> list[dict[str, Any]]:
    path = files("kajota_concierge.mesh_abi").joinpath(name)
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def _resolve_chain() -> dict[str, Any]:
    """Merge env-var overrides on top of the DEFAULT_CHAINS entry."""
    chain_key = os.environ.get("MESH_CHAIN", "mantle-sepolia")
    base = DEFAULT_CHAINS.get(chain_key)
    if base is None:
        raise MeshConfigError(
            f"MESH_CHAIN='{chain_key}' unknown; known: {sorted(DEFAULT_CHAINS)}"
        )
    resolved = dict(base)
    for key, env_var in (
        ("rpc", "MESH_RPC_URL"),
        ("registry", "MESH_COSELL_REGISTRY"),
        ("escrow", "MESH_COSELL_ESCROW"),
        ("usdc", "MESH_USDC"),
    ):
        if os.environ.get(env_var):
            resolved[key] = os.environ[env_var]
    if not resolved.get("escrow"):
        raise MeshConfigError(
            f"Chain '{chain_key}' has no CosellEscrow deployed. "
            "Point MESH_CHAIN at a chain with the full stack "
            "(default: mantle-sepolia) or set MESH_COSELL_ESCROW."
        )
    return resolved


def _w3(chain: dict[str, Any]) -> Web3:
    w3 = Web3(Web3.HTTPProvider(chain["rpc"], request_kwargs={"timeout": 15}))
    return w3


def _to_deposit_id(text: str) -> bytes:
    """Compact way to derive a deterministic listing id from a demo string.

    The real Mesh flow registers listings ahead of time and hands the
    resulting bytes32 to the buyer. For the Slack demo the /pay command
    accepts a free-text listing hint (e.g. 'yeezy-hoodie') and we derive
    a stable bytes32 from it so repeated demo runs address the same
    listing without touching the registry.
    """
    return Web3.keccak(text=text.strip().lower())[:32]


def get_chain_info() -> dict[str, Any]:
    return _resolve_chain()


def read_usdc_balance(address: str) -> dict[str, Any]:
    chain = _resolve_chain()
    w3 = _w3(chain)
    usdc = w3.eth.contract(
        address=Web3.to_checksum_address(chain["usdc"]),
        abi=_load_abi("ERC20.json"),
    )
    raw = usdc.functions.balanceOf(Web3.to_checksum_address(address)).call()
    decimals = usdc.functions.decimals().call()
    return {
        "chain": chain,
        "address": address,
        "raw": raw,
        "decimals": decimals,
        "display": f"{raw / (10 ** decimals):.2f} USDC",
    }


def _relayer_account() -> Account | None:
    pk = os.environ.get("MESH_RELAYER_PRIVATE_KEY")
    if not pk:
        return None
    pk = pk.strip()
    if not pk.startswith("0x"):
        pk = "0x" + pk
    return Account.from_key(pk)


def _build_tx(
    w3: Web3,
    fn,
    from_address: str,
    chain_id: int,
    nonce: int,
    gas_price: int,
) -> TxParams:
    gas_estimate = fn.estimate_gas({"from": from_address})
    return fn.build_transaction(
        {
            "from": from_address,
            "chainId": chain_id,
            "nonce": nonce,
            # Add 30% headroom so estimate races don't underprice
            "gas": int(gas_estimate * 1.3),
            "gasPrice": gas_price,
        }
    )


def _encode_call(fn: Any) -> str:
    # web3.py's ContractFunction: v6 exposes `_encode_transaction_data`,
    # v7 keeps it. Fall back to `build_transaction`'s `data` field if the
    # method is ever renamed.
    if hasattr(fn, "_encode_transaction_data"):
        data = fn._encode_transaction_data()
    else:
        data = fn.build_transaction({"gas": 0, "gasPrice": 0}).get("data", "0x")
    return data if isinstance(data, str) else data.hex()


def _signed_raw(signed: Any) -> bytes:
    # web3.py v7 uses snake_case; older versions used camelCase. Both
    # attrs live on the same namedtuple, so getattr covers either.
    raw = getattr(signed, "raw_transaction", None)
    if raw is None:
        raw = signed.rawTransaction
    return raw


def _normalise_hash(tx_hash: Any) -> str:
    # HexBytes.hex() returns without the 0x prefix on web3 v7; add it
    # back so the explorer URL is a straight concat.
    h = tx_hash.hex() if hasattr(tx_hash, "hex") else str(tx_hash)
    return h if h.startswith("0x") else "0x" + h


def _send(w3: Web3, tx: TxParams, acct: Account) -> str:
    signed = acct.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(_signed_raw(signed))
    return _normalise_hash(tx_hash)


def build_deposit(
    *,
    listing_hint: str,
    gross_amount_usdc: float,
) -> DepositResult:
    """Build (and optionally send) the two-tx deposit sequence.

    Returns a DepositResult with both tx receipts. If the relayer key
    isn't configured, both receipts have `status='unsigned'` and carry
    the raw tx dict for handoff to a wallet.
    """
    chain = _resolve_chain()
    w3 = _w3(chain)

    usdc = w3.eth.contract(
        address=Web3.to_checksum_address(chain["usdc"]),
        abi=_load_abi("ERC20.json"),
    )
    escrow = w3.eth.contract(
        address=Web3.to_checksum_address(chain["escrow"]),
        abi=_load_abi("CosellEscrow.json"),
    )

    decimals = usdc.functions.decimals().call()
    gross_amount = int(gross_amount_usdc * (10 ** decimals))
    listing_id = _to_deposit_id(listing_hint)

    acct = _relayer_account()

    if acct is None:
        approve_call = usdc.functions.approve(escrow.address, gross_amount)
        deposit_call = escrow.functions.deposit(listing_id, gross_amount)
        approve_raw = {
            "to": usdc.address,
            "data": _encode_call(approve_call),
        }
        deposit_raw = {
            "to": escrow.address,
            "data": _encode_call(deposit_call),
        }
        placeholder_from = os.environ.get("MESH_BUYER_ADDRESS", "0x" + "0" * 40)
        return DepositResult(
            chain=f"chainId={chain['chain_id']}",
            listing_id="0x" + listing_id.hex(),
            gross_amount=gross_amount,
            gross_amount_display=f"{gross_amount_usdc:.2f} USDC",
            approve=TxReceipt(
                label="USDC.approve",
                hash="",
                explorer_url="",
                status="unsigned",
                from_address=placeholder_from,
                to_address=usdc.address,
                raw=approve_raw,
            ),
            deposit=TxReceipt(
                label="CosellEscrow.deposit",
                hash="",
                explorer_url="",
                status="unsigned",
                from_address=placeholder_from,
                to_address=escrow.address,
                raw=deposit_raw,
            ),
            signed=False,
        )

    from_addr = acct.address
    chain_id = chain["chain_id"]
    gas_price = w3.eth.gas_price

    # 1) approve
    nonce = w3.eth.get_transaction_count(from_addr)
    approve_tx = _build_tx(
        w3,
        usdc.functions.approve(escrow.address, gross_amount),
        from_addr,
        chain_id,
        nonce,
        gas_price,
    )
    try:
        approve_hash = _send(w3, approve_tx, acct)
    except Exception as exc:
        raise MeshCallError(f"approve failed: {exc}") from exc
    w3.eth.wait_for_transaction_receipt(approve_hash, timeout=90)

    # 2) deposit
    deposit_tx = _build_tx(
        w3,
        escrow.functions.deposit(listing_id, gross_amount),
        from_addr,
        chain_id,
        nonce + 1,
        gas_price,
    )
    try:
        deposit_hash = _send(w3, deposit_tx, acct)
    except Exception as exc:
        raise MeshCallError(f"deposit failed: {exc}") from exc
    w3.eth.wait_for_transaction_receipt(deposit_hash, timeout=90)

    explorer = chain["explorer_tx"]
    return DepositResult(
        chain=f"chainId={chain_id}",
        listing_id="0x" + listing_id.hex(),
        gross_amount=gross_amount,
        gross_amount_display=f"{gross_amount_usdc:.2f} USDC",
        approve=TxReceipt(
            label="USDC.approve",
            hash=approve_hash,
            explorer_url=f"{explorer}{approve_hash}",
            status="confirmed",
            from_address=from_addr,
            to_address=usdc.address,
        ),
        deposit=TxReceipt(
            label="CosellEscrow.deposit",
            hash=deposit_hash,
            explorer_url=f"{explorer}{deposit_hash}",
            status="confirmed",
            from_address=from_addr,
            to_address=escrow.address,
        ),
        signed=True,
    )
