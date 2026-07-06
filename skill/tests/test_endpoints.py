"""Endpoint smoke tests in dry-run mode (no chain, no funded wallet).

Verifies the credit surface wires up: the score is computed and returned
even when the on-chain anchor isn't live, with anchored=false and a
synthetic tx hash.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from kajota_mesh_skill.main import app

client = TestClient(app)

STRONG_HISTORY = {
    "months_active": 36,
    "completed_orders": 200,
    "gross_volume_usd": 80_000,
    "receivables_financed": 10,
    "receivables_repaid": 10,
    "receivables_defaulted": 0,
    "disputes": 0,
    "outstanding_usd": 0,
}
SUBJECT = "0x1111111111111111111111111111111111111111"


def test_credit_score_computes_and_reports_unanchored_in_dry_run() -> None:
    resp = client.post(
        "/credit/score", json={"subject": SUBJECT, "history": STRONG_HISTORY}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["subject"] == SUBJECT
    assert body["result"]["band"] == "A"
    assert body["result"]["score"] >= 800
    assert body["result"]["payload_hash"].startswith("0x")
    # No anchor configured in the test env → un-anchored, synthetic hash.
    assert body["anchored"] is False
    assert body["tx_hash"].startswith("0xdry-attest-")


def test_credit_score_rejects_negative_inputs() -> None:
    bad = {**STRONG_HISTORY, "disputes": -1}
    resp = client.post("/credit/score", json={"subject": SUBJECT, "history": bad})
    assert resp.status_code == 422  # pydantic ge=0 guard


def test_get_credit_score_404_when_anchor_not_live() -> None:
    resp = client.get(f"/credit/{SUBJECT}")
    assert resp.status_code == 404


def test_healthz_reports_score_anchor_field() -> None:
    resp = client.get("/healthz")
    assert resp.status_code == 200
    # score_anchor surfaces in the health extra (None when unset).
    assert "score_anchor" in resp.json()["extra"]
