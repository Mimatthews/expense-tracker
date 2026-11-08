"""Transaction CRUD with filtering, sorting and pagination."""
from __future__ import annotations

import sqlite3
from datetime import date
from typing import Literal

from fastapi import APIRouter, HTTPException, Query, status

from ..db import get_db, month_bounds
from ..schemas import (
    Transaction,
    TransactionCreate,
    TransactionPage,
    TransactionUpdate,
)

router = APIRouter(prefix="/api/transactions", tags=["transactions"])

SELECT_TX = """
SELECT t.*,
       c.name  AS category_name,
       c.color AS category_color,
       c.icon  AS category_icon
  FROM transactions t
  LEFT JOIN categories c ON c.id = t.category_id
"""

SORTS = {
    "date_desc": "t.occurred_on DESC, t.id DESC",
    "date_asc": "t.occurred_on ASC, t.id ASC",
    "amount_desc": "t.amount_cents DESC, t.occurred_on DESC",
    "amount_asc": "t.amount_cents ASC, t.occurred_on DESC",
}


def _check_category(conn: sqlite3.Connection, category_id: int | None) -> None:
    if category_id is None:
        return
    row = conn.execute("SELECT 1 FROM categories WHERE id = ?", (category_id,)).fetchone()
    if not row:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Unknown category_id.")


def _validate_month(month: str | None) -> None:
    if month is None:
        return
    import re

    if not re.match(r"^\d{4}-(0[1-9]|1[0-2])$", month):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "month must look like 2026-11."
        )


@router.get("", response_model=TransactionPage)
def list_transactions(
    month: str | None = Query(default=None, description="YYYY-MM"),
    category_id: int | None = None,
    type: Literal["expense", "income"] | None = None,
    search: str | None = Query(default=None, max_length=80),
    start: date | None = None,
    end: date | None = None,
    sort: str = Query(default="date_desc", pattern=r"^(date|amount)_(asc|desc)$"),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    _validate_month(month)

    where: list[str] = []
    params: list[object] = []

    if month:
        lo, hi = month_bounds(month)
        where.append("t.occurred_on >= ? AND t.occurred_on < ?")
        params += [lo, hi]
    if start:
        where.append("t.occurred_on >= ?")
        params.append(start.isoformat())
    if end:
        where.append("t.occurred_on <= ?")
        params.append(end.isoformat())
    if category_id is not None:
        if category_id == 0:  # sentinel: uncategorised
            where.append("t.category_id IS NULL")
        else:
            where.append("t.category_id = ?")
            params.append(category_id)
    if type:
        where.append("t.type = ?")
        params.append(type)
    if search:
        where.append("(t.description LIKE ? OR COALESCE(t.merchant, '') LIKE ?)")
        like = f"%{search.strip()}%"
        params += [like, like]

    clause = f"WHERE {' AND '.join(where)}" if where else ""
    order = SORTS[sort]

    with get_db() as conn:
        total = conn.execute(
            f"SELECT COUNT(*) AS n FROM transactions t {clause}", params
        ).fetchone()["n"]
        rows = conn.execute(
            f"{SELECT_TX} {clause} ORDER BY {order} LIMIT ? OFFSET ?",
            (*params, limit, offset),
        ).fetchall()

    return TransactionPage(
        items=[Transaction(**dict(r)) for r in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{tx_id}", response_model=Transaction)
def get_transaction(tx_id: int):
    with get_db() as conn:
        row = conn.execute(f"{SELECT_TX} WHERE t.id = ?", (tx_id,)).fetchone()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Transaction not found.")
    return Transaction(**dict(row))


@router.post("", response_model=Transaction, status_code=status.HTTP_201_CREATED)
def create_transaction(payload: TransactionCreate):
    with get_db() as conn:
        _check_category(conn, payload.category_id)
        cur = conn.execute(
            """
            INSERT INTO transactions
                (amount_cents, type, category_id, description, merchant, occurred_on)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                payload.amount_cents,
                payload.type,
                payload.category_id,
                payload.description,
                payload.merchant or None,
                payload.occurred_on.isoformat(),
            ),
        )
        row = conn.execute(f"{SELECT_TX} WHERE t.id = ?", (cur.lastrowid,)).fetchone()
    return Transaction(**dict(row))


@router.patch("/{tx_id}", response_model=Transaction)
def update_transaction(tx_id: int, payload: TransactionUpdate):
    fields = payload.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update.")
    if "occurred_on" in fields and fields["occurred_on"] is not None:
        fields["occurred_on"] = fields["occurred_on"].isoformat()

    assignments = ", ".join(f"{key} = ?" for key in fields)
    with get_db() as conn:
        _check_category(conn, fields.get("category_id"))
        exists = conn.execute("SELECT 1 FROM transactions WHERE id = ?", (tx_id,)).fetchone()
        if not exists:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Transaction not found.")
        conn.execute(
            f"UPDATE transactions SET {assignments}, updated_at = datetime('now') WHERE id = ?",
            (*fields.values(), tx_id),
        )
        row = conn.execute(f"{SELECT_TX} WHERE t.id = ?", (tx_id,)).fetchone()
    return Transaction(**dict(row))


@router.delete("/{tx_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(tx_id: int):
    with get_db() as conn:
        cur = conn.execute("DELETE FROM transactions WHERE id = ?", (tx_id,))
        if cur.rowcount == 0:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Transaction not found.")
