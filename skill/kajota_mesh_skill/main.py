"""FastAPI app — agent-callable escrow surface."""

from __future__ import annotations

from pathlib import Path
from typing import Annotated

import uvicorn
from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import FileResponse, PlainTextResponse, RedirectResponse
from pydantic import BaseModel, Field

from kajota_mesh_skill.mesh import MeshClient
from kajota_mesh_skill.settings import Settings

_SKILL_DIR = Path(__file__).resolve().parents[1]

app = FastAPI(
    title="KaJota Mesh Skill",
    description="On-chain escrow as a NANDA-discoverable skill. Agents lock, release, "
    "and dispute USDC on Ethereum Sepolia via a single service wallet — no key "
    "management required on the agent side.",
    version="0.1.0",
)

_settings = Settings()
_client = MeshClient(_settings)


def get_client() -> MeshClient:
    return _client


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class HealthResponse(BaseModel):
    ok: bool
    mode: str
    service_address: str
    chain_id: int
    extra: dict[str, object] = Field(default_factory=dict)


class QuoteRequest(BaseModel):
    amount_usd: float = Field(gt=0, description="Gross amount in human-readable USD.")


class QuoteResponse(BaseModel):
    gross_amount_units: int = Field(description="USDC base units (6 decimals).")
    fee_amount_units: int = Field(description="Service fee in USDC base units (currently 0).")
    net_amount_units: int = Field(description="Net to seller in USDC base units.")
    currency: str = "USDC"


class DepositResponse(BaseModel):
    deposit_id: str
    listing_id: str
    buyer: str
    seller: str
    gross_amount_units: int
    fee_amount_units: int
    net_amount_units: int
    status: str


class ActionRequest(BaseModel):
    deposit_id: str = Field(
        description="The on-chain deposit id (0x-prefixed 32-byte hex) returned at "
        "lock time by the CosellEscrow.Deposited event."
    )


class ActionResponse(BaseModel):
    deposit_id: str
    action: str  # "release" | "refund"
    tx_hash: str
    explorer_url: str


class CreateWalletRequest(BaseModel):
    label: str | None = Field(
        default=None,
        description="Optional human-readable label such as 'buyer' or 'seller-01'.",
    )


class WalletResponse(BaseModel):
    wallet_id: str = Field(description="Opaque identifier — pass this to /escrow/lock.")
    address: str = Field(description="On-chain address of the managed wallet.")
    note: str = Field(
        default="Demo wallet — service holds the key. Do not send real funds.",
    )


class WalletBalanceResponse(BaseModel):
    wallet_id: str
    address: str
    eth_wei: int
    usdc_units: int
    currency: str = "USDC"


class LockRequest(BaseModel):
    buyer_wallet_id: str = Field(
        description="Wallet id returned by /wallet/create; funds the escrow deposit."
    )
    listing_id: str = Field(
        description="Any 0x-prefixed hex string (right-padded to 32 bytes) identifying "
        "the listing being paid for.  Reused as-is on-chain."
    )
    gross_amount_units: int = Field(
        gt=0,
        description="USDC base units (6 decimals) to lock in escrow.",
    )


class LockResponse(BaseModel):
    deposit_id: str = Field(
        description="The on-chain deposit id — the exact string to pass to "
        "/escrow/release or /escrow/refund."
    )
    tx_hash: str
    explorer_url: str
    listing_id: str
    buyer_address: str
    gross_amount_units: int


class DisputeRequest(BaseModel):
    deposit_id: str = Field(description="The disputed deposit's id.")
    reason: str = Field(
        min_length=1,
        max_length=1000,
        description="Free-text reason for the dispute — e.g., 'goods not delivered'.",
    )


class DisputeResponse(BaseModel):
    dispute_id: str
    deposit_id: str
    filed_at: int
    reason: str
    witness_hash: str = Field(
        description="SHA-256 of the canonical dispute payload — a portable, "
        "signable authorization for a mediator to co-sign a resolution."
    )
    status: str


def _explorer_url_for_tx(tx_hash: str, chain_id: int) -> str:
    if chain_id == 11155111:
        return f"https://sepolia.etherscan.io/tx/{tx_hash}"
    return f"https://etherscan.io/tx/{tx_hash}"


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/healthz", response_model=HealthResponse, tags=["meta"])
def healthz(client: Annotated[MeshClient, Depends(get_client)]) -> HealthResponse:
    status = client.chain_status()
    return HealthResponse(
        ok=True,
        mode=str(status["mode"]),
        service_address=str(status["service_address"]),
        chain_id=int(status["chain_id"]),
        extra={k: v for k, v in status.items() if k not in {"mode", "service_address", "chain_id"}},
    )


@app.post("/escrow/quote", response_model=QuoteResponse, tags=["escrow"])
def quote(body: QuoteRequest) -> QuoteResponse:
    """Convert a human-readable USD amount into USDC base units.

    USDC has 6 decimal places; this endpoint is purely informational and does
    not touch chain state.  Agents should call it before ``/escrow/lock`` so
    they understand the on-chain unit they'll be charged.
    """
    units = int(round(body.amount_usd * 1_000_000))
    return QuoteResponse(
        gross_amount_units=units,
        fee_amount_units=0,
        net_amount_units=units,
    )


@app.get("/escrow/deposit/{deposit_id}", response_model=DepositResponse, tags=["escrow"])
def get_deposit(
    deposit_id: str,
    client: Annotated[MeshClient, Depends(get_client)],
) -> DepositResponse:
    """Read on-chain state for a deposit by id."""
    view = client.get_deposit(deposit_id)
    if view is None:
        raise HTTPException(404, f"deposit {deposit_id} not found (or dry-run mode)")
    return DepositResponse(
        deposit_id=view.deposit_id,
        listing_id=view.listing_id,
        buyer=view.buyer,
        seller=view.seller,
        gross_amount_units=view.gross_amount,
        fee_amount_units=view.fee_amount,
        net_amount_units=view.net_amount,
        status=view.status,
    )


@app.post("/escrow/release", response_model=ActionResponse, tags=["escrow"])
def release(
    body: ActionRequest,
    client: Annotated[MeshClient, Depends(get_client)],
) -> ActionResponse:
    """Release the escrowed USDC to the seller.

    Authorised by the service wallet (matches ``releaseAuth`` on the
    deployed escrow).  Agents should call this once they have verified
    delivery off-chain.  Refused with 409 if the deposit has an open
    dispute — resolve it first with ``/escrow/dispute/resolve``.
    """
    try:
        tx_hash = client.release(body.deposit_id)
    except RuntimeError as e:
        raise HTTPException(409, str(e)) from e
    return ActionResponse(
        deposit_id=body.deposit_id,
        action="release",
        tx_hash=tx_hash,
        explorer_url=_explorer_url_for_tx(tx_hash, _settings.chain_id),
    )


@app.post("/escrow/refund", response_model=ActionResponse, tags=["escrow"])
def refund(
    body: ActionRequest,
    client: Annotated[MeshClient, Depends(get_client)],
) -> ActionResponse:
    """Refund the escrowed USDC to the buyer.

    Authorised by the service wallet.  Use when delivery did not occur
    or both parties agree to cancel.
    """
    tx_hash = client.refund(body.deposit_id)
    return ActionResponse(
        deposit_id=body.deposit_id,
        action="refund",
        tx_hash=tx_hash,
        explorer_url=_explorer_url_for_tx(tx_hash, _settings.chain_id),
    )


@app.post("/wallet/create", response_model=WalletResponse, tags=["wallet"])
def wallet_create(
    body: CreateWalletRequest,
    client: Annotated[MeshClient, Depends(get_client)],
) -> WalletResponse:
    """Create a fresh managed demo wallet, funded from the service treasury.

    In live mode the wallet gets a small ETH grant (for gas) and a USDC
    grant (so it can immediately take part in an escrow).  In dry-run
    the wallet is synthetic and un-funded.

    **Not for production custody.**  The service holds the private key
    server-side so calling agents can drive the entire escrow lifecycle
    from HTTP alone — this is the point of "agents succeed using only
    your SKILL.md."
    """
    wallet = client.create_managed_wallet(body.label)
    return WalletResponse(wallet_id=wallet.wallet_id, address=wallet.address)


@app.get("/wallet/{wallet_id}", response_model=WalletBalanceResponse, tags=["wallet"])
def wallet_balance(
    wallet_id: str,
    client: Annotated[MeshClient, Depends(get_client)],
) -> WalletBalanceResponse:
    """Return the ETH + USDC balance for a managed wallet."""
    balance = client.wallet_balance(wallet_id)
    if balance is None:
        raise HTTPException(404, f"wallet {wallet_id} not found")
    return WalletBalanceResponse(
        wallet_id=wallet_id,
        address=balance.address,
        eth_wei=balance.eth_wei,
        usdc_units=balance.usdc_units,
    )


@app.post("/escrow/lock", response_model=LockResponse, tags=["escrow"])
def escrow_lock(
    body: LockRequest,
    client: Annotated[MeshClient, Depends(get_client)],
) -> LockResponse:
    """Server-signed deposit from a managed buyer wallet.

    Does the two on-chain transactions the buyer would normally have to
    do themselves — ``USDC.approve(escrow, amount)`` then
    ``CosellEscrow.deposit(listingId, amount)`` — and returns the
    ``deposit_id`` parsed from the ``Deposited`` event so the caller
    can hand it back to ``/escrow/release`` or ``/escrow/refund``.
    """
    try:
        result = client.lock_from_wallet(
            buyer_wallet_id=body.buyer_wallet_id,
            listing_id=body.listing_id,
            gross_amount_units=body.gross_amount_units,
        )
    except KeyError as e:
        raise HTTPException(404, str(e)) from e
    return LockResponse(
        deposit_id=result.deposit_id,
        tx_hash=result.tx_hash,
        explorer_url=_explorer_url_for_tx(result.tx_hash, _settings.chain_id),
        listing_id=result.listing_id,
        buyer_address=result.buyer_address,
        gross_amount_units=result.gross_amount_units,
    )


@app.post("/escrow/dispute", response_model=DisputeResponse, tags=["escrow"])
def escrow_dispute(
    body: DisputeRequest,
    client: Annotated[MeshClient, Depends(get_client)],
) -> DisputeResponse:
    """File an off-chain dispute against a deposit.

    Pauses ``/escrow/release`` for that deposit (subsequent releases 409
    until the dispute resolves).  ``/escrow/refund`` still works — refund
    is the buyer-favorable resolution and auto-marks the dispute as
    ``resolved-refund``.  Returns a witness hash a mediator agent can
    sign to authorise a release resolution off-chain.
    """
    receipt = client.file_dispute(body.deposit_id, body.reason)
    return DisputeResponse(
        dispute_id=receipt.dispute_id,
        deposit_id=receipt.deposit_id,
        filed_at=receipt.filed_at,
        reason=receipt.reason,
        witness_hash=receipt.witness_hash,
        status=receipt.status,
    )


@app.get("/escrow/dispute/{deposit_id}", response_model=DisputeResponse, tags=["escrow"])
def escrow_dispute_read(
    deposit_id: str,
    client: Annotated[MeshClient, Depends(get_client)],
) -> DisputeResponse:
    """Read the dispute record for a deposit, if any."""
    receipt = client.get_dispute_for(deposit_id)
    if receipt is None:
        raise HTTPException(404, f"no dispute filed for deposit {deposit_id}")
    return DisputeResponse(
        dispute_id=receipt.dispute_id,
        deposit_id=receipt.deposit_id,
        filed_at=receipt.filed_at,
        reason=receipt.reason,
        witness_hash=receipt.witness_hash,
        status=receipt.status,
    )


@app.get("/metrics", tags=["meta"], response_class=PlainTextResponse, include_in_schema=False)
def metrics(client: Annotated[MeshClient, Depends(get_client)]) -> PlainTextResponse:
    """Prometheus-format counters for operational visibility."""
    lines = []
    for name, value in client.counters().items():
        lines.append(f"# TYPE kajota_mesh_skill_{name} counter")
        lines.append(f"kajota_mesh_skill_{name} {value}")
    return PlainTextResponse("\n".join(lines) + "\n", media_type="text/plain; version=0.0.4")


@app.get("/", tags=["meta"], include_in_schema=False)
def root() -> RedirectResponse:
    """Redirect the human default to the interactive API docs."""
    return RedirectResponse(url="/docs")


@app.get("/agentfacts.json", tags=["discovery"], include_in_schema=False)
def agentfacts() -> FileResponse:
    """Serve the AgentFacts record so the MIT NANDA Index can pull it directly."""
    return FileResponse(_SKILL_DIR / "agentfacts.json", media_type="application/json")


@app.get("/skill.md", tags=["discovery"], response_class=PlainTextResponse, include_in_schema=False)
@app.get("/SKILL.md", tags=["discovery"], response_class=PlainTextResponse, include_in_schema=False)
def skill_md() -> PlainTextResponse:
    """Serve SKILL.md so a discovering agent can fetch it from the deployed host."""
    return PlainTextResponse((_SKILL_DIR / "SKILL.md").read_text(), media_type="text/markdown")


def run() -> None:
    """Entry-point for ``kajota-mesh-skill`` script + Render PORT env var."""
    import os

    uvicorn.run("kajota_mesh_skill.main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8081")))


if __name__ == "__main__":
    run()
