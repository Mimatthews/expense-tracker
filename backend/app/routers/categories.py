"""CRUD for spending categories."""
from __future__ import annotations

import sqlite3

from fastapi import APIRouter, HTTPException, Query, status

from ..db import current_month, get_db, month_bounds
from ..schemas import Category, CategoryCreate, CategoryUpdate, CategoryWithStats

router = APIRouter(prefix="/api/categories", tags=["categories"])


def _stats(conn: sqlite3.Connection, month: str) -> dict[int, tuple[int, int]]:
    start, end = month_bounds(month)
    rows = conn.execute(
        """
        SELECT category_id,
               COUNT(*)                 AS n,
               SUM(amount_cents)        AS total
          FROM transactions
         WHERE occurred_on >= ? AND occurred_on < ?
         GROUP BY category_id
        """,
        (start, end),
    ).fetchall()
    return {r["category_id"]: (r["n"], r["total"] or 0) for r in rows}


@router.get("", response_model=list[CategoryWithStats])
def list_categories(
    month: str | None = Query(default=None, pattern=r"^\d{4}-(0[1-9]|1[0-2])$"),
):
    """All categories with usage stats for `month` (defaults to the current month)."""
    month = month or current_month()
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM categories ORDER BY kind DESC, name COLLATE NOCASE"
        ).fetchall()
        stats = _stats(conn, month)
    out = []
    for row in rows:
        count, total = stats.get(row["id"], (0, 0))
        out.append(
            CategoryWithStats(
                **dict(row), transaction_count=count, month_total_cents=total
            )
        )
    return out


@router.post("", response_model=Category, status_code=status.HTTP_201_CREATED)
def create_category(payload: CategoryCreate):
    with get_db() as conn:
        try:
            cur = conn.execute(
                "INSERT INTO categories (name, color, icon, kind) VALUES (?, ?, ?, ?)",
                (payload.name, payload.color, payload.icon, payload.kind),
            )
        except sqlite3.IntegrityError as exc:
            raise HTTPException(
                status.HTTP_409_CONFLICT, f"A category named '{payload.name}' already exists."
            ) from exc
        row = conn.execute(
            "SELECT * FROM categories WHERE id = ?", (cur.lastrowid,)
        ).fetchone()
    return Category(**dict(row))


@router.patch("/{category_id}", response_model=Category)
def update_category(category_id: int, payload: CategoryUpdate):
    fields = payload.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update.")
    if "color" in fields and not fields["color"]:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "color cannot be empty.")

    assignments = ", ".join(f"{key} = ?" for key in fields)
    with get_db() as conn:
        exists = conn.execute(
            "SELECT 1 FROM categories WHERE id = ?", (category_id,)
        ).fetchone()
        if not exists:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Category not found.")
        try:
            conn.execute(
                f"UPDATE categories SET {assignments} WHERE id = ?",
                (*fields.values(), category_id),
            )
        except sqlite3.IntegrityError as exc:
            raise HTTPException(
                status.HTTP_409_CONFLICT, "Another category already uses that name."
            ) from exc
        row = conn.execute(
            "SELECT * FROM categories WHERE id = ?", (category_id,)
        ).fetchone()
    return Category(**dict(row))


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int):
    """Deletes the category. Linked transactions are kept and become uncategorised."""
    with get_db() as conn:
        cur = conn.execute("DELETE FROM categories WHERE id = ?", (category_id,))
        if cur.rowcount == 0:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Category not found.")
