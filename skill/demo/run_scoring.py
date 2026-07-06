"""Demo: score a representative SME with the real trade-credit engine.

Runnable with zero setup — no chain, no wallet:

    cd skill && .venv/bin/python demo/run_scoring.py

Prints the full, explainable breakdown the Coach engine produces for a
supplier applying for invoice financing. The `payload_hash` it prints is
exactly what `ScoreAttestation.attest` anchors on-chain in the full
lifecycle demo (kajota-mesh: scripts/demo-trade-finance.ts).
"""

from __future__ import annotations

from kajota_mesh_skill.scoring import TradeHistory, score_trade_history

# A demo SME: ~2 years trading, healthy volume, a clean on-chain
# repayment record. The address is a well-known local-node test account
# so the mesh lifecycle demo can anchor a score for the same subject.
DEMO_SUBJECT = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"

DEMO_HISTORY = TradeHistory(
    months_active=18,
    completed_orders=70,
    gross_volume_usd=35_000,
    receivables_financed=6,
    receivables_repaid=6,
    receivables_defaulted=0,
    disputes=0,
    outstanding_usd=0,
)


def main() -> None:
    result = score_trade_history(DEMO_SUBJECT, DEMO_HISTORY)

    print("\nKajota Trade — SME credit score")
    print("=" * 52)
    print(f"Subject : {DEMO_SUBJECT}")
    print(f"Score   : {result.score} / 1000   Band {result.band}")
    print(f"Advance : {result.recommended_advance_rate:.0%} of invoice face value")
    print("-" * 52)
    for f in result.factors:
        print(f"  {f.name:<18} {f.points:>4}/{f.max_points:<4}  {f.detail}")
    print("-" * 52)
    print(f"Anchored hash : {result.payload_hash}")
    print(
        "  → ScoreAttestation.attest(subject, hash, "
        f"{result.score}, {result.band_index})\n"
    )


if __name__ == "__main__":
    main()
