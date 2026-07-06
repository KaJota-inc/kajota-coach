"""Rules-based SME trade-credit scoring engine.

Deterministic and fully explainable: a supplier's trade history maps to
a 0..1000 score via five weighted, bounded factors, each of which
reports the points it contributed and why. No ML, no black box — a
financier (or a Kajota agent) can read exactly how a number was reached.

The dominant signal is the on-chain repayment record from
``ReceivableRegistry`` (repaid vs defaulted); the rest — tenure, trade
volume, order fulfilment, conduct — come from Kajota's order history.

The engine is pure: same inputs → same score → same ``payload_hash``.
That hash is what ``ScoreAttestation`` anchors on-chain, so the score is
a verifiable credential without leaking the underlying financials.
"""

from __future__ import annotations

import json
import math

from pydantic import BaseModel, Field
from web3 import Web3

# Factor weights — sum to MAX_SCORE. Repayment record dominates because
# it is the truest signal of credit behaviour; the rest are supporting.
W_REPAYMENT = 400
W_TENURE = 150
W_VOLUME = 200
W_FULFILMENT = 150
W_CONDUCT = 100
MAX_SCORE = W_REPAYMENT + W_TENURE + W_VOLUME + W_FULFILMENT + W_CONDUCT  # 1000

# Saturation points — where a factor earns full marks.
TENURE_FULL_MONTHS = 24
VOLUME_FULL_USD = 50_000  # micro-SME scale; full marks at $50k lifetime GMV
FULFILMENT_FULL_ORDERS = 100
DISPUTE_PENALTY = 25  # points lost per dispute, off the conduct factor
THIN_FILE_REPAYMENT = 200  # neutral baseline when there's no settled history

# Payload schema version — bump if the canonical hash layout changes so
# old attestations stay verifiable against the version they were made with.
PAYLOAD_VERSION = 1


class TradeHistory(BaseModel):
    """Aggregated trade signals for one SME.

    These are produced off-chain — order/tenure fields from Kajota's
    Mongo order history, the receivable counts from ReceivableRegistry.
    The engine treats them as given and does not fetch anything itself.
    """

    months_active: int = Field(ge=0, description="Months since the SME's first order.")
    completed_orders: int = Field(ge=0, description="Count of fulfilled orders.")
    gross_volume_usd: float = Field(ge=0, description="Lifetime GMV in USD.")
    receivables_financed: int = Field(ge=0, description="Receivables ever financed.")
    receivables_repaid: int = Field(ge=0, description="Receivables repaid in full.")
    receivables_defaulted: int = Field(ge=0, description="Receivables that defaulted.")
    disputes: int = Field(ge=0, description="Disputes / chargebacks raised against the SME.")
    outstanding_usd: float = Field(ge=0, description="Currently-financed unpaid exposure, USD.")


class Factor(BaseModel):
    """One scored dimension, with its contribution and a human reason."""

    name: str
    points: int
    max_points: int
    detail: str


class ScoreResult(BaseModel):
    score: int = Field(description="Composite credit score, 0..1000.")
    band: str = Field(description="Risk band letter, A (best) .. E (weakest).")
    band_index: int = Field(description="Risk band index, 0 (best) .. 4 (weakest).")
    recommended_advance_rate: float = Field(
        description="Fraction of invoice face value a financier should advance."
    )
    factors: list[Factor]
    payload_hash: str = Field(description="0x keccak256 of the canonical scoring payload.")


# Band cut-offs (inclusive lower bound) → (letter, index, advance rate).
# Advance rate is the fraction of face value a financier is guided to
# release up-front; weaker credit → thinner advance (bigger discount).
_BANDS: list[tuple[int, str, int, float]] = [
    (800, "A", 0, 0.90),
    (650, "B", 1, 0.80),
    (500, "C", 2, 0.70),
    (350, "D", 3, 0.60),
    (0, "E", 4, 0.50),
]


def _band_for(score: int) -> tuple[str, int, float]:
    for lower, letter, index, advance in _BANDS:
        if score >= lower:
            return letter, index, advance
    # Unreachable — the last cut-off is 0 — but keep mypy + safety happy.
    return "E", 4, 0.50


def _repayment_factor(h: TradeHistory) -> Factor:
    settled = h.receivables_repaid + h.receivables_defaulted
    if settled == 0:
        return Factor(
            name="repayment_record",
            points=THIN_FILE_REPAYMENT,
            max_points=W_REPAYMENT,
            detail=(
                "No settled financings yet — thin-file baseline. Score will "
                "sharpen as receivables repay or default on-chain."
            ),
        )
    # Share of settled receivables that were repaid (not defaulted).
    repaid_ratio = h.receivables_repaid / settled
    points = max(0, min(W_REPAYMENT, round(W_REPAYMENT * repaid_ratio)))
    return Factor(
        name="repayment_record",
        points=points,
        max_points=W_REPAYMENT,
        detail=(
            f"{h.receivables_repaid}/{settled} settled receivables repaid "
            f"({repaid_ratio:.0%}); {h.receivables_defaulted} defaulted."
        ),
    )


def _tenure_factor(h: TradeHistory) -> Factor:
    ratio = min(1.0, h.months_active / TENURE_FULL_MONTHS)
    points = round(W_TENURE * ratio)
    return Factor(
        name="trade_tenure",
        points=points,
        max_points=W_TENURE,
        detail=(
            f"{h.months_active} months active "
            f"(full marks at {TENURE_FULL_MONTHS})."
        ),
    )


def _volume_factor(h: TradeHistory) -> Factor:
    # Log scale — an SME doing $5k shouldn't score a tenth of one doing
    # $50k; early volume matters more than marginal volume at the top.
    if h.gross_volume_usd <= 0:
        ratio = 0.0
    else:
        ratio = min(
            1.0,
            math.log10(1 + h.gross_volume_usd) / math.log10(1 + VOLUME_FULL_USD),
        )
    points = round(W_VOLUME * ratio)
    return Factor(
        name="trade_volume",
        points=points,
        max_points=W_VOLUME,
        detail=(
            f"${h.gross_volume_usd:,.0f} lifetime GMV "
            f"(full marks at ${VOLUME_FULL_USD:,.0f}, log-scaled)."
        ),
    )


def _fulfilment_factor(h: TradeHistory) -> Factor:
    ratio = min(1.0, h.completed_orders / FULFILMENT_FULL_ORDERS)
    points = round(W_FULFILMENT * ratio)
    return Factor(
        name="order_fulfilment",
        points=points,
        max_points=W_FULFILMENT,
        detail=(
            f"{h.completed_orders} fulfilled orders "
            f"(full marks at {FULFILMENT_FULL_ORDERS})."
        ),
    )


def _conduct_factor(h: TradeHistory) -> Factor:
    points = max(0, W_CONDUCT - h.disputes * DISPUTE_PENALTY)
    if h.disputes == 0:
        detail = "No disputes on record — clean conduct."
    else:
        detail = (
            f"{h.disputes} dispute(s) — "
            f"-{h.disputes * DISPUTE_PENALTY} conduct points."
        )
    return Factor(name="conduct", points=points, max_points=W_CONDUCT, detail=detail)


def canonical_payload(subject: str, history: TradeHistory, *, score: int, band_index: int, advance_rate: float) -> str:
    """Deterministic JSON string that gets hashed for the on-chain anchor.

    Sorted keys + fixed separators so the same logical inputs always
    serialise identically — the hash is only meaningful if it's stable.
    ``subject`` is lower-cased so address casing can't fork the hash.
    """
    doc = {
        "v": PAYLOAD_VERSION,
        "subject": subject.lower(),
        "inputs": history.model_dump(),
        "result": {
            "score": score,
            "band_index": band_index,
            "advance_rate": advance_rate,
        },
    }
    return json.dumps(doc, sort_keys=True, separators=(",", ":"))


def score_trade_history(subject: str, history: TradeHistory) -> ScoreResult:
    """Score one SME. Pure — same inputs always yield the same result."""
    factors = [
        _repayment_factor(history),
        _tenure_factor(history),
        _volume_factor(history),
        _fulfilment_factor(history),
        _conduct_factor(history),
    ]
    score = sum(f.points for f in factors)
    score = max(0, min(MAX_SCORE, score))
    band, band_index, advance_rate = _band_for(score)

    payload = canonical_payload(
        subject, history, score=score, band_index=band_index, advance_rate=advance_rate
    )
    payload_hash = Web3.keccak(text=payload).hex()
    if not payload_hash.startswith("0x"):
        payload_hash = "0x" + payload_hash

    return ScoreResult(
        score=score,
        band=band,
        band_index=band_index,
        recommended_advance_rate=advance_rate,
        factors=factors,
        payload_hash=payload_hash,
    )
