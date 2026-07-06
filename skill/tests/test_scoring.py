"""Unit tests for the rules-based trade-credit scoring engine.

Pure-function tests — no chain, no network. Cover the band boundaries,
each factor's contribution, the thin-file baseline, and the determinism
guarantee the on-chain anchor relies on (same inputs → same hash).
"""

from __future__ import annotations

from kajota_mesh_skill.scoring import (
    MAX_SCORE,
    TradeHistory,
    canonical_payload,
    score_trade_history,
)

SUBJECT = "0x1111111111111111111111111111111111111111"


def _history(**overrides) -> TradeHistory:
    base = dict(
        months_active=0,
        completed_orders=0,
        gross_volume_usd=0.0,
        receivables_financed=0,
        receivables_repaid=0,
        receivables_defaulted=0,
        disputes=0,
        outstanding_usd=0.0,
    )
    base.update(overrides)
    return TradeHistory(**base)


def test_strong_supplier_lands_in_band_a() -> None:
    h = _history(
        months_active=36,
        completed_orders=200,
        gross_volume_usd=80_000,
        receivables_financed=10,
        receivables_repaid=10,
        receivables_defaulted=0,
        disputes=0,
    )
    r = score_trade_history(SUBJECT, h)
    assert r.score >= 800
    assert r.band == "A"
    assert r.band_index == 0
    assert r.recommended_advance_rate == 0.90


def test_defaulting_supplier_scores_poorly() -> None:
    strong = score_trade_history(
        SUBJECT,
        _history(
            months_active=36,
            completed_orders=200,
            gross_volume_usd=80_000,
            receivables_financed=10,
            receivables_repaid=10,
        ),
    )
    # Same trade profile but a bad repayment record must score strictly lower.
    weak = score_trade_history(
        SUBJECT,
        _history(
            months_active=36,
            completed_orders=200,
            gross_volume_usd=80_000,
            receivables_financed=10,
            receivables_repaid=2,
            receivables_defaulted=8,
        ),
    )
    assert weak.score < strong.score
    # 8/10 defaults wipes out most of the 400-point repayment factor.
    assert weak.band_index > strong.band_index


def test_thin_file_gets_neutral_baseline() -> None:
    # No settled financings → repayment factor is the 200 baseline, not 0.
    r = score_trade_history(SUBJECT, _history(months_active=6, completed_orders=5))
    repayment = next(f for f in r.factors if f.name == "repayment_record")
    assert repayment.points == 200
    assert "thin-file" in repayment.detail.lower()


def test_disputes_reduce_conduct_points() -> None:
    clean = score_trade_history(SUBJECT, _history(disputes=0))
    dinged = score_trade_history(SUBJECT, _history(disputes=2))
    c_clean = next(f for f in clean.factors if f.name == "conduct")
    c_dinged = next(f for f in dinged.factors if f.name == "conduct")
    assert c_clean.points == 100
    assert c_dinged.points == 50  # 2 disputes * 25


def test_score_is_bounded() -> None:
    # Absurdly strong inputs still clamp at MAX_SCORE.
    r = score_trade_history(
        SUBJECT,
        _history(
            months_active=999,
            completed_orders=9999,
            gross_volume_usd=10_000_000,
            receivables_financed=100,
            receivables_repaid=100,
        ),
    )
    assert 0 <= r.score <= MAX_SCORE
    # Factor points never exceed their caps.
    for f in r.factors:
        assert 0 <= f.points <= f.max_points


def test_factors_sum_to_score() -> None:
    h = _history(
        months_active=12,
        completed_orders=40,
        gross_volume_usd=15_000,
        receivables_financed=4,
        receivables_repaid=3,
        receivables_defaulted=1,
        disputes=1,
    )
    r = score_trade_history(SUBJECT, h)
    assert sum(f.points for f in r.factors) == r.score


def test_determinism_same_inputs_same_hash() -> None:
    h = _history(months_active=12, completed_orders=40, gross_volume_usd=15_000)
    a = score_trade_history(SUBJECT, h)
    b = score_trade_history(SUBJECT, h)
    assert a.payload_hash == b.payload_hash
    assert a.payload_hash.startswith("0x")
    # 32-byte keccak → 0x + 64 hex chars.
    assert len(a.payload_hash) == 66


def test_hash_is_subject_case_insensitive() -> None:
    h = _history(months_active=12)
    lower = score_trade_history(SUBJECT.lower(), h)
    upper = score_trade_history("0x" + SUBJECT[2:].upper(), h)
    assert lower.payload_hash == upper.payload_hash


def test_canonical_payload_is_sorted_and_compact() -> None:
    h = _history(months_active=12)
    payload = canonical_payload(SUBJECT, h, score=500, band_index=2, advance_rate=0.7)
    # sort_keys puts "inputs" before "result" before "subject" before "v".
    assert payload.index('"inputs"') < payload.index('"result"')
    # compact separators — no spaces after colons/commas.
    assert ", " not in payload and ": " not in payload
