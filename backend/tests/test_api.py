"""API tests: run with `pytest` from the backend/ directory.

Each test gets an isolated temp database via the DATABASE_PATH env var, so the
suite never touches your real data.
"""
from __future__ import annotations

import importlib
import os
import tempfile
from pathlib import Path

import pytest


@pytest.fixture()
def client():
    tmp = tempfile.mkdtemp()
    os.environ["DATABASE_PATH"] = str(Path(tmp) / "test.db")
    os.environ["DATA_DIR"] = tmp

    from app import db, main

    importlib.reload(db)
    importlib.reload(main)
    from fastapi.testclient import TestClient

    with TestClient(main.app) as c:
        yield c


def make_tx(client, **overrides):
    payload = {
        "amount_cents": 1250,
        "type": "expense",
        "description": "Test coffee",
        "merchant": "Blue Bottle",
        "occurred_on": "2026-11-03",
    }
    payload.update(overrides)
    res = client.post("/api/transactions", json=payload)
    assert res.status_code == 201, res.text
    return res.json()


def test_health(client):
    assert client.get("/api/health").json()["status"] == "ok"


def test_categories_are_seeded(client):
    cats = client.get("/api/categories").json()
    assert len(cats) >= 10
    assert {"Groceries", "Salary"} <= {c["name"] for c in cats}


def test_create_read_update_delete_transaction(client):
    cats = {c["name"]: c["id"] for c in client.get("/api/categories").json()}
    tx = make_tx(client, category_id=cats["Dining"])
    assert tx["category_name"] == "Dining"

    assert client.get(f"/api/transactions/{tx['id']}").json()["description"] == "Test coffee"

    patched = client.patch(
        f"/api/transactions/{tx['id']}", json={"amount_cents": 999, "description": "Flat white"}
    ).json()
    assert patched["amount_cents"] == 999
    assert patched["description"] == "Flat white"

    assert client.delete(f"/api/transactions/{tx['id']}").status_code == 204
    assert client.get(f"/api/transactions/{tx['id']}").status_code == 404


def test_rejects_invalid_payloads(client):
    bad_amount = client.post(
        "/api/transactions",
        json={"amount_cents": 0, "description": "free", "occurred_on": "2026-11-03"},
    )
    assert bad_amount.status_code == 422

    blank = client.post(
        "/api/transactions",
        json={"amount_cents": 100, "description": "   ", "occurred_on": "2026-11-03"},
    )
    assert blank.status_code == 422

    unknown_cat = client.post(
        "/api/transactions",
        json={
            "amount_cents": 100,
            "description": "x",
            "occurred_on": "2026-11-03",
            "category_id": 99999,
        },
    )
    assert unknown_cat.status_code == 422


def test_filters_and_pagination(client):
    make_tx(client, description="Coffee one", occurred_on="2026-11-01")
    make_tx(client, description="Coffee two", occurred_on="2026-10-15")
    make_tx(client, description="Paycheck", type="income", occurred_on="2026-11-02")

    nov = client.get("/api/transactions", params={"month": "2026-11"}).json()
    assert nov["total"] == 2

    only_income = client.get("/api/transactions", params={"type": "income"}).json()
    assert only_income["total"] == 1

    search = client.get("/api/transactions", params={"search": "coffee"}).json()
    assert search["total"] == 2

    page = client.get("/api/transactions", params={"limit": 1, "offset": 0}).json()
    assert page["total"] == 3 and len(page["items"]) == 1


def test_monthly_summary_math(client):
    cats = {c["name"]: c["id"] for c in client.get("/api/categories").json()}
    make_tx(client, amount_cents=10000, category_id=cats["Groceries"], occurred_on="2026-11-05")
    make_tx(client, amount_cents=5000, category_id=cats["Groceries"], occurred_on="2026-11-06")
    make_tx(client, amount_cents=2000, category_id=cats["Dining"], occurred_on="2026-11-07")
    make_tx(client, amount_cents=300000, type="income", occurred_on="2026-11-01")
    make_tx(client, amount_cents=99900, description="Last month", occurred_on="2026-10-20")

    body = client.get("/api/summary", params={"month": "2026-11"}).json()
    s = body["summary"]

    assert s["expense_cents"] == 17000
    assert s["income_cents"] == 300000
    assert s["net_cents"] == 283000
    assert s["transaction_count"] == 4
    assert s["top_category"] == "Groceries"
    assert s["by_category"][0]["share"] == pytest.approx(88.2, abs=0.2)
    assert len(s["daily"]) == 30  # every day of November is present
    assert s["daily"][4]["expense_cents"] == 10000
    assert s["change_pct"] == pytest.approx(-82.98, abs=0.1)

    trend = body["trend"]
    assert trend[-1]["month"] == "2026-11"
    assert len(trend) == 6


def test_category_crud_and_conflict(client):
    created = client.post("/api/categories", json={"name": "Pets", "color": "#ff8800"})
    assert created.status_code == 201
    cid = created.json()["id"]

    assert client.post("/api/categories", json={"name": "Pets"}).status_code == 409

    renamed = client.patch(f"/api/categories/{cid}", json={"name": "Pet Care"}).json()
    assert renamed["name"] == "Pet Care"

    assert client.delete(f"/api/categories/{cid}").status_code == 204
    assert client.delete(f"/api/categories/{cid}").status_code == 404


def test_deleting_category_keeps_transactions(client):
    cat = client.post("/api/categories", json={"name": "Temp"}).json()
    tx = make_tx(client, category_id=cat["id"])
    client.delete(f"/api/categories/{cat['id']}")
    after = client.get(f"/api/transactions/{tx['id']}").json()
    assert after["category_id"] is None
