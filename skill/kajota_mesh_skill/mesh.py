"""Web3 client wrapper around the deployed Sepolia CosellEscrow + CosellRegistry."""

from __future__ import annotations

import hashlib
import json
import secrets
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from eth_account import Account
from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware

from kajota_mesh_skill.settings import Settings

# Minimal ERC-20 ABI — enough for balanceOf, approve, transfer against USDC.
_ERC20_ABI: list[dict[str, Any]] = [
    {
        "name": "balanceOf",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "owner", "type": "address"}],
        "outputs": [{"name": "", "type": "uint256"}],
    },
    {
        "name": "approve",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "spender", "type": "address"},
            {"name": "amount", "type": "uint256"},
        ],
        "outputs": [{"name": "", "type": "bool"}],
    },
    {
        "name": "transfer",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "to", "type": "address"},
            {"name": "amount", "type": "uint256"},
        ],
        "outputs": [{"name": "", "type": "bool"}],
    },
]


def _load_abi(name: str) -> list[dict[str, Any]]:
    """Load a contract ABI from the ``skill/abis/`` directory bundled with the package."""
    abi_dir = Path(__file__).resolve().parents[1] / "abis"
    with (abi_dir / f"{name}.json").open() as f:
        artifact = json.load(f)
    return artifact["abi"]


@dataclass
class DepositView:
    """Plain-data projection of an on-chain deposit record."""

    deposit_id: str
    listing_id: str
    buyer: str
    seller: str
    gross_amount: int
    fee_amount: int
    net_amount: int
    status: str  # "pending" | "released" | "refunded"


_STATUS_BY_INDEX = {0: "pending", 1: "released", 2: "refunded"}


@dataclass
class ManagedWallet:
    """A demo wallet the service holds keys for.  Not for production."""

    wallet_id: str
    address: str
    private_key: str


@dataclass
class WalletBalance:
    """ETH + USDC balances of a managed wallet."""

    address: str
    eth_wei: int
    usdc_units: int


@dataclass
class LockResult:
    """Outcome of a managed-wallet-driven ``deposit`` call on the escrow."""

    deposit_id: str
    tx_hash: str
    listing_id: str
    buyer_address: str
    gross_amount_units: int
    listing_tx_hash: str | None = None  # non-None when we had to register the listing first


@dataclass
class DisputeReceipt:
    """Off-chain dispute record.  Composes with the on-chain escrow's release/refund
    happy-path: filing a dispute pauses the buyer-side agent from calling release
    until a mediator resolves it, without a contract change.  The witness hash
    binds the dispute payload; a mediator agent's signature over the hash is
    a portable, verifiable authorization for either release or refund.
    """

    dispute_id: str
    deposit_id: str
    filed_at: int
    reason: str
    witness_hash: str
    status: str  # "open" | "resolved-release" | "resolved-refund"


def hash_listing_id(raw: str) -> bytes:
    """Accept a plain string OR a 0x-prefixed hex and return a 32-byte value.

    Enables agents to pass any listing key they already have ("kajota-listing-42",
    a UUID, a URL) without knowing what bytes32 is.  Pure sha256 for determinism.
    """
    lowered = raw.strip()
    if lowered.startswith("0x"):
        body = lowered[2:]
        try:
            raw_bytes = bytes.fromhex(body)
            if len(raw_bytes) == 32:
                return raw_bytes
            if len(raw_bytes) < 32:
                return raw_bytes.rjust(32, b"\x00")
        except ValueError:
            pass
    return hashlib.sha256(lowered.encode()).digest()


class MeshClient:
    """Thin wrapper exposing only the operations the skill service needs."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._w3: Web3 | None = None
        self._escrow: Any = None
        self._registry: Any = None
        self._usdc: Any = None
        self._account: Any = None
        self._treasury: Any = None
        # In-memory throwaway store of demo wallets keyed by wallet_id.
        # Not persisted — restart of the service loses them.  Judges know:
        # demo mode, not custody-of-user-funds.
        self._wallets: dict[str, ManagedWallet] = {}
        # Off-chain dispute registry — pauses release, mediator resolves.
        self._disputes: dict[str, DisputeReceipt] = {}
        self._disputes_by_deposit: dict[str, str] = {}
        # Simple in-memory counters for /metrics.
        self._counters: dict[str, int] = {
            "wallet_created": 0,
            "lock_ok": 0,
            "release_ok": 0,
            "refund_ok": 0,
            "dispute_filed": 0,
        }
        if settings.is_live:
            self._connect()

    def _connect(self) -> None:
        s = self._settings
        w3 = Web3(Web3.HTTPProvider(s.rpc_url))
        w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
        self._account = w3.eth.account.from_key(s.release_auth_key)
        self._treasury = w3.eth.account.from_key(s.effective_treasury_key)
        w3.eth.default_account = self._account.address
        self._escrow = w3.eth.contract(
            address=Web3.to_checksum_address(s.escrow_address),
            abi=_load_abi("CosellEscrow"),
        )
        self._registry = w3.eth.contract(
            address=Web3.to_checksum_address(s.registry_address),
            abi=_load_abi("CosellRegistry"),
        )
        self._usdc = w3.eth.contract(
            address=Web3.to_checksum_address(s.usdc_address),
            abi=_ERC20_ABI,
        )
        self._w3 = w3

    @property
    def live(self) -> bool:
        return self._w3 is not None

    @property
    def service_address(self) -> str:
        if self._account is None:
            return "0x" + "0" * 40
        return str(self._account.address)

    def get_deposit(self, deposit_id: str) -> DepositView | None:
        """Read a deposit by id from chain.  Returns ``None`` when dry-run."""
        if not self.live:
            return None
        deposit_bytes = bytes.fromhex(deposit_id.removeprefix("0x"))
        try:
            data = self._escrow.functions.getDeposit(deposit_bytes).call()
        except Exception:
            return None
        listing_id, buyer, seller, gross, fee, net, status_idx = data
        return DepositView(
            deposit_id=deposit_id,
            listing_id="0x" + listing_id.hex(),
            buyer=buyer,
            seller=seller,
            gross_amount=int(gross),
            fee_amount=int(fee),
            net_amount=int(net),
            status=_STATUS_BY_INDEX.get(int(status_idx), "unknown"),
        )

    def is_disputed(self, deposit_id: str) -> bool:
        d = self.get_dispute_for(deposit_id)
        return d is not None and d.status == "open"

    def release(self, deposit_id: str) -> str:
        """Call ``release(depositId)`` and return the transaction hash.

        Refuses if the deposit has an open dispute (mediator must resolve first).
        Returns a synthetic ``0xdry-...`` hash when ``MESH_DRY_RUN=true``.
        """
        if self.is_disputed(deposit_id):
            raise RuntimeError(
                f"deposit {deposit_id} has an open dispute — resolve it before releasing"
            )
        self._counters["release_ok"] += 1
        if not self.live:
            return f"0xdry-release-{deposit_id[:16]}"
        deposit_bytes = bytes.fromhex(deposit_id.removeprefix("0x"))
        tx = self._escrow.functions.release(deposit_bytes).build_transaction(
            {
                "from": self._account.address,
                "nonce": self._w3.eth.get_transaction_count(self._account.address, "pending"),
                "chainId": self._settings.chain_id,
            }
        )
        signed = self._account.sign_transaction(tx)
        tx_hash = self._w3.eth.send_raw_transaction(signed.raw_transaction)
        return tx_hash.hex()

    def refund(self, deposit_id: str) -> str:
        """Call ``refund(depositId)`` and return the transaction hash.

        Refund is allowed even when a dispute is open — refund is the
        buyer-favorable resolution of the dispute.
        """
        self._counters["refund_ok"] += 1
        # Mark dispute (if any) as resolved-refund.
        existing = self.get_dispute_for(deposit_id)
        if existing is not None:
            existing.status = "resolved-refund"
        if not self.live:
            return f"0xdry-refund-{deposit_id[:16]}"
        deposit_bytes = bytes.fromhex(deposit_id.removeprefix("0x"))
        tx = self._escrow.functions.refund(deposit_bytes).build_transaction(
            {
                "from": self._account.address,
                "nonce": self._w3.eth.get_transaction_count(self._account.address, "pending"),
                "chainId": self._settings.chain_id,
            }
        )
        signed = self._account.sign_transaction(tx)
        tx_hash = self._w3.eth.send_raw_transaction(signed.raw_transaction)
        return tx_hash.hex()

    # ------------------------------------------------------------------
    # Managed demo wallets
    # ------------------------------------------------------------------

    def create_managed_wallet(self, label: str | None = None) -> ManagedWallet:
        """Create a fresh demo wallet and (when live) fund it from treasury.

        In dry-run: returns a synthetic wallet without touching chain.
        In live: (1) generates a new keypair, (2) sends an ETH grant for
        gas, (3) transfers a USDC grant so the wallet can immediately
        take part in an escrow.  Both transfers use the treasury key.
        """
        wallet_id = f"w-{uuid.uuid4().hex[:12]}"
        self._counters["wallet_created"] += 1
        if not self.live:
            fake_addr = "0x" + secrets.token_hex(20)
            wallet = ManagedWallet(
                wallet_id=wallet_id,
                address=Web3.to_checksum_address(fake_addr),
                private_key="0xdry-run-no-key",
            )
            self._wallets[wallet_id] = wallet
            return wallet

        acct = Account.create(extra_entropy=secrets.token_bytes(32))
        wallet = ManagedWallet(
            wallet_id=wallet_id,
            address=acct.address,
            private_key=acct.key.hex(),
        )
        self._wallets[wallet_id] = wallet
        self._fund_wallet(wallet)
        return wallet

    def _fund_wallet(self, wallet: ManagedWallet) -> None:
        """Transfer ETH + USDC from treasury to a fresh managed wallet.

        Waits for both funding transactions to mine before returning so
        the wallet is actually usable when the caller proceeds to lock.
        Skips the USDC transfer gracefully if the treasury has zero
        USDC — the caller will get a clear error at lock time instead
        of a silent failure now.
        """
        s = self._settings
        # 1. Native ETH grant for gas (required for the wallet to submit anything).
        eth_tx = {
            "from": self._treasury.address,
            "to": wallet.address,
            "value": s.wallet_eth_grant_wei,
            "nonce": self._w3.eth.get_transaction_count(self._treasury.address, "pending"),
            "gas": 21_000,
            "gasPrice": self._w3.eth.gas_price,
            "chainId": s.chain_id,
        }
        eth_signed = self._treasury.sign_transaction(eth_tx)
        eth_hash = self._w3.eth.send_raw_transaction(eth_signed.raw_transaction)
        self._w3.eth.wait_for_transaction_receipt(eth_hash, timeout=90)

        # 2. USDC grant — only if treasury actually holds any.
        treasury_usdc = int(
            self._usdc.functions.balanceOf(self._treasury.address).call()
        )
        if treasury_usdc < s.wallet_usdc_grant_units:
            return  # let lock() surface a clear "insufficient USDC" error later
        usdc_tx = self._usdc.functions.transfer(
            wallet.address, s.wallet_usdc_grant_units
        ).build_transaction(
            {
                "from": self._treasury.address,
                "nonce": self._w3.eth.get_transaction_count(self._treasury.address, "pending"),
                "chainId": s.chain_id,
            }
        )
        usdc_signed = self._treasury.sign_transaction(usdc_tx)
        usdc_hash = self._w3.eth.send_raw_transaction(usdc_signed.raw_transaction)
        self._w3.eth.wait_for_transaction_receipt(usdc_hash, timeout=90)

    def get_wallet(self, wallet_id: str) -> ManagedWallet | None:
        return self._wallets.get(wallet_id)

    def wallet_balance(self, wallet_id: str) -> WalletBalance | None:
        w = self._wallets.get(wallet_id)
        if w is None:
            return None
        if not self.live:
            return WalletBalance(address=w.address, eth_wei=0, usdc_units=0)
        eth = int(self._w3.eth.get_balance(w.address))
        usdc = int(self._usdc.functions.balanceOf(w.address).call())
        return WalletBalance(address=w.address, eth_wei=eth, usdc_units=usdc)

    # ------------------------------------------------------------------
    # Managed-wallet lock — the missing link that keeps the whole flow
    # inside the SKILL.md-only surface.
    # ------------------------------------------------------------------

    def register_listing_from_wallet(
        self,
        wholesaler_wallet_id: str,
        product_id: str,
        coseller_address: str,
        commission_bps: int = 1000,
        currency: str = "USDC",
    ) -> tuple[bytes, str]:
        """Register a fresh listing in the CosellRegistry.

        The escrow contract's ``deposit`` reverts with ``ListingNotActive``
        unless the referenced listing has been registered here first, and
        the registry enforces ``wholesaler == msg.sender`` — so the
        wholesaler wallet signs the registration.  Returns
        ``(listing_id_bytes, tx_hash)``.  Dry-run returns synthetic.
        """
        w = self._wallets.get(wholesaler_wallet_id)
        if w is None:
            raise KeyError(f"wallet {wholesaler_wallet_id!r} not found")

        if not self.live:
            fake_id = hashlib.sha256(
                (product_id + w.address + coseller_address).encode()
            ).digest()
            return fake_id, f"0xdry-listing-{wholesaler_wallet_id[:12]}"

        wholesaler_acct = self._w3.eth.account.from_key(w.private_key)
        coseller_checksum = Web3.to_checksum_address(coseller_address)

        register_tx = self._registry.functions.register(
            product_id,
            wholesaler_acct.address,
            coseller_checksum,
            int(commission_bps),
            currency,
        ).build_transaction(
            {
                "from": wholesaler_acct.address,
                "nonce": self._w3.eth.get_transaction_count(wholesaler_acct.address, "pending"),
                "chainId": self._settings.chain_id,
            }
        )
        signed = wholesaler_acct.sign_transaction(register_tx)
        tx_hash = self._w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = self._w3.eth.wait_for_transaction_receipt(tx_hash, timeout=180)

        events = self._registry.events.ListingRegistered().process_receipt(receipt)
        if not events:
            raise RuntimeError("listing registered but ListingRegistered event missing")
        listing_id_bytes: bytes = events[0]["args"]["listingId"]
        return listing_id_bytes, tx_hash.hex()

    def lock_from_wallet(
        self,
        buyer_wallet_id: str,
        listing_id: str,
        gross_amount_units: int,
        auto_register_with_seller_wallet_id: str | None = None,
        product_id: str | None = None,
    ) -> LockResult:
        """Approve USDC and call ``deposit`` from a managed buyer wallet.

        Returns the ``deposit_id`` parsed from the Deposited event of the
        deposit transaction, so the caller can use it against
        ``/escrow/release`` or ``/escrow/refund`` immediately.

        When ``auto_register_with_seller_wallet_id`` is set, the buyer
        wallet first calls ``CosellRegistry.register`` — buyer as
        wholesaler, that wallet as coseller — using ``product_id`` (or a
        derived value) as the human-readable product identifier.  The
        computed on-chain listingId is used in place of ``listing_id``
        for the deposit call.

        Dry-run returns synthetic ids so the demo runs without chain.
        """
        buyer = self._wallets.get(buyer_wallet_id)
        if buyer is None:
            raise KeyError(f"wallet {buyer_wallet_id!r} not found")

        listing_tx_hash: str | None = None
        if auto_register_with_seller_wallet_id is not None:
            seller = self._wallets.get(auto_register_with_seller_wallet_id)
            if seller is None:
                raise KeyError(
                    f"seller wallet {auto_register_with_seller_wallet_id!r} not found"
                )
            pid = product_id or listing_id
            listing_bytes, listing_tx_hash = self.register_listing_from_wallet(
                wholesaler_wallet_id=buyer_wallet_id,
                product_id=pid,
                coseller_address=seller.address,
            )
        else:
            listing_bytes = hash_listing_id(listing_id)

        if not self.live:
            fake_deposit = "0xdep" + secrets.token_hex(29)
            self._counters["lock_ok"] += 1
            return LockResult(
                deposit_id=fake_deposit,
                tx_hash=f"0xdry-lock-{buyer_wallet_id[:12]}",
                listing_id="0x" + listing_bytes.hex(),
                buyer_address=buyer.address,
                gross_amount_units=gross_amount_units,
                listing_tx_hash=listing_tx_hash,
            )

        s = self._settings
        buyer_acct = self._w3.eth.account.from_key(buyer.private_key)

        # 1. approve USDC → escrow for gross_amount_units.  web3 v7 requires
        # a checksum-cased address for contract arguments.
        approve_tx = self._usdc.functions.approve(
            Web3.to_checksum_address(self._settings.escrow_address), gross_amount_units
        ).build_transaction(
            {
                "from": buyer_acct.address,
                "nonce": self._w3.eth.get_transaction_count(buyer_acct.address, "pending"),
                "chainId": s.chain_id,
            }
        )
        approve_signed = buyer_acct.sign_transaction(approve_tx)
        approve_hash = self._w3.eth.send_raw_transaction(approve_signed.raw_transaction)
        self._w3.eth.wait_for_transaction_receipt(approve_hash, timeout=180)

        # 2. deposit(listingId, grossAmount) from the buyer wallet
        deposit_tx = self._escrow.functions.deposit(
            listing_bytes, gross_amount_units
        ).build_transaction(
            {
                "from": buyer_acct.address,
                "nonce": self._w3.eth.get_transaction_count(buyer_acct.address, "pending"),
                "chainId": s.chain_id,
            }
        )
        deposit_signed = buyer_acct.sign_transaction(deposit_tx)
        deposit_hash = self._w3.eth.send_raw_transaction(deposit_signed.raw_transaction)
        receipt = self._w3.eth.wait_for_transaction_receipt(deposit_hash, timeout=180)

        # Parse the Deposited event out of the receipt to get depositId.
        events = self._escrow.events.Deposited().process_receipt(receipt)
        if not events:
            raise RuntimeError(
                "deposit tx succeeded but Deposited event was not emitted — check ABI"
            )
        deposit_id_bytes: bytes = events[0]["args"]["depositId"]
        self._counters["lock_ok"] += 1

        return LockResult(
            deposit_id="0x" + deposit_id_bytes.hex(),
            tx_hash=deposit_hash.hex(),
            listing_id="0x" + listing_bytes.hex(),
            buyer_address=buyer_acct.address,
            gross_amount_units=gross_amount_units,
            listing_tx_hash=listing_tx_hash,
        )

    # ------------------------------------------------------------------
    # Dispute (off-chain) — pairs on-chain settlement with a witnessed
    # dispute channel.  Filing a dispute pauses buyer-side release until
    # a mediator resolves it.  Deposit itself remains on-chain unchanged.
    # ------------------------------------------------------------------

    def file_dispute(self, deposit_id: str, reason: str) -> DisputeReceipt:
        existing_id = self._disputes_by_deposit.get(deposit_id)
        if existing_id is not None:
            return self._disputes[existing_id]

        dispute_id = f"d-{uuid.uuid4().hex[:12]}"
        filed_at = int(time.time())
        # Witness hash binds (dispute_id, deposit_id, reason, filed_at).
        # Any mediator can recompute and sign it to resolve.
        payload = json.dumps(
            {
                "dispute_id": dispute_id,
                "deposit_id": deposit_id,
                "reason": reason,
                "filed_at": filed_at,
            },
            sort_keys=True,
            separators=(",", ":"),
        )
        witness_hash = "0x" + hashlib.sha256(payload.encode()).hexdigest()

        receipt = DisputeReceipt(
            dispute_id=dispute_id,
            deposit_id=deposit_id,
            filed_at=filed_at,
            reason=reason,
            witness_hash=witness_hash,
            status="open",
        )
        self._disputes[dispute_id] = receipt
        self._disputes_by_deposit[deposit_id] = dispute_id
        self._counters["dispute_filed"] += 1
        return receipt

    def get_dispute_for(self, deposit_id: str) -> DisputeReceipt | None:
        dispute_id = self._disputes_by_deposit.get(deposit_id)
        return self._disputes.get(dispute_id) if dispute_id else None

    def counters(self) -> dict[str, int]:
        return dict(self._counters)

    # ------------------------------------------------------------------
    # Demo transcript ring buffer — powers the playground page.
    # ------------------------------------------------------------------

    def demo_history(self) -> list[dict[str, Any]]:
        return list(getattr(self, "_demo_history", []))

    def push_demo_run(self, transcript: dict[str, Any]) -> None:
        buf = getattr(self, "_demo_history", None)
        if buf is None:
            buf = []
            self._demo_history = buf  # type: ignore[attr-defined]
        buf.append(transcript)
        # Keep last 20 to bound memory.
        if len(buf) > 20:
            del buf[: len(buf) - 20]

    def chain_status(self) -> dict[str, Any]:
        """Quick health report for the ``/healthz`` endpoint."""
        if not self.live:
            return {
                "mode": "dry_run",
                "service_address": self.service_address,
                "escrow": self._settings.escrow_address,
                "chain_id": self._settings.chain_id,
            }
        return {
            "mode": "live",
            "service_address": self.service_address,
            "block_number": int(self._w3.eth.block_number),
            "escrow": self._settings.escrow_address,
            "registry": self._settings.registry_address,
            "chain_id": self._settings.chain_id,
        }
