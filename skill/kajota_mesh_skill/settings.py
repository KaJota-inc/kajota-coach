"""Runtime settings — all env-var driven, no defaults that would let prod boot misconfigured."""

from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Service configuration.

    Required env vars:
      MESH_RPC_URL              — Sepolia RPC endpoint (Alchemy / Infura / Ankr)
      MESH_RELEASE_AUTH_KEY     — hex private key for the wallet authorised to call
                                  ``release`` / ``refund`` on the deployed escrow.
                                  Match against ``releaseAuth`` in the deployment manifest.
    Optional:
      MESH_REGISTRY_ADDRESS     — defaults to the Sepolia mainnet-of-testnet deploy
      MESH_ESCROW_ADDRESS       — ""
      MESH_USDC_ADDRESS         — ""
      MESH_CHAIN_ID             — 11155111
      MESH_DRY_RUN              — when true, never broadcasts; returns fake tx hashes.
                                  Used for the local smoke test + demo without a funded wallet.
    """

    model_config = SettingsConfigDict(env_prefix="MESH_", env_file=".env", extra="ignore")

    rpc_url: str = Field(default="")
    release_auth_key: str = Field(default="")
    treasury_key: str = Field(
        default="",
        description="Optional: separate treasury wallet that funds managed demo wallets "
        "with ETH + USDC.  When empty, defaults to release_auth_key so a single funded "
        "wallet drives everything.",
    )
    registry_address: str = Field(default="0xfce6bd68d8d6f858d447f537d206c1e354b44315")
    escrow_address: str = Field(default="0x599869cef2e4c52e2c9074caaf8f9fb0cb191776")
    usdc_address: str = Field(default="0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238")
    chain_id: int = 11155111
    dry_run: bool = False

    wallet_eth_grant_wei: int = Field(
        default=8_000_000_000_000_000,  # 0.008 ETH — covers approve (~50k gas) + deposit
        # (~150k) plus a safety margin at ~20 gwei on Sepolia.  Earlier 0.002 ETH was too
        # tight: build_transaction's gas estimate failed on insufficient-funds for deposit.
        description="Wei sent to each freshly-created managed wallet for gas.",
    )
    wallet_usdc_grant_units: int = Field(
        default=500_000,  # 0.50 USDC — a demo cycle needs ~0.05 USDC per wallet, this is buffer.
        description="USDC base units transferred to each fresh managed wallet.",
    )
    demo_lock_amount_units: int = Field(
        default=100_000,  # 0.10 USDC — /demo/run locks this much, leaving budget for many runs.
        description="USDC base units locked by /demo/run to keep the treasury sustainable.",
    )

    @property
    def is_live(self) -> bool:
        return bool(self.rpc_url) and bool(self.release_auth_key) and not self.dry_run

    @property
    def effective_treasury_key(self) -> str:
        return self.treasury_key or self.release_auth_key
