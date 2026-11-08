"""Monthly aggregation endpoints that feed the dashboard charts."""
from __future__ import annotations

import sqlite3
from datetime import date

from fastapi import APIRouter, Query

from ..db import current_month, get_db, month_bounds, shift_month
from ..schemas import (
    CategorySlice,
    DayPoint,
    MonthlySummary,
    SummaryEnvelope,
    TrendPoint,
)

router = APIRouter(prefix="/api/summary", tags=["summary"])


def _totals(conn: sqlite3.Connection, month: str) -> tuple[int, int, int]:
    lo, hi = month_bounds(month)
    row = conn.execute(
        """
        SELECT
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_cents END), 0) AS expense,
          COALESCE(SUM(CASE WHEN type = 'income'  THEN amount_cents END), 0) AS income,
          COUNT(*) AS n
        FROM transactions
        WHERE occurred_on >= ? AND occurred_on < ?
        """,
        (lo, hi),
    ).fetchone()
    return row["expense"], row["income"], row["n"]


@router.get("", response_model=SummaryEnvelope)
def monthly_summary(
    month: str | None = Query(default=None, pattern=r"^\d{4}-(0[1-9]|1[0-2])$"),
    trend_months: int = Query(default=6, ge=2, le=24),
):
    """Everything the dashboard needs for one month, plus a trailing trend."""
    month = month or current_month()
    lo, hi = month_bounds(month)

    with get_db() as conn:
        expense, income, count = _totals(conn, month)
        prev_month = shift_month(month, -1)
        prev_expense, prev_income, _ = _totals(conn, prev_month)

        cat_rows = conn.execute(
            """
            SELECT t.category_id,
                   COALESCE(c.name, 'Uncategorised') AS name,
                   COALESCE(c.color, '#64748b')      AS color,
                   COALESCE(c.icon, 'tag')           AS icon,
                   SUM(t.amount_cents)               AS total,
                   COUNT(*)                          AS n
              FROM transactions t
              LEFT JOIN categories c ON c.id = t.category_id
             WHERE t.occurred_on >= ? AND t.occurred_on < ?
               AND t.type = 'expense'
             GROUP BY t.category_id
             ORDER BY total DESC
            """,
            (lo, hi),
        ).fetchall()

        day_rows = conn.execute(
            """
            SELECT occurred_on AS day,
                   COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_cents END), 0) AS e,
                   COALESCE(SUM(CASE WHEN type = 'income'  THEN amount_cents END), 0) AS i
              FROM transactions
             WHERE occurred_on >= ? AND occurred_on < ?
             GROUP BY occurred_on
             ORDER BY occurred_on
            """,
            (lo, hi),
        ).fetchall()

        merchant_rows = conn.execute(
            """
            SELECT COALESCE(NULLIF(TRIM(merchant), ''), description) AS label,
                   SUM(amount_cents) AS total,
                   COUNT(*)          AS n
              FROM transactions
             WHERE occurred_on >= ? AND occurred_on < ? AND type = 'expense'
             GROUP BY label
             ORDER BY total DESC
             LIMIT 5
            """,
            (lo, hi),
        ).fetchall()

        # trailing months, oldest first
        months = [shift_month(month, -i) for i in range(trend_months - 1, -1, -1)]
        trend: list[TrendPoint] = []
        for m in months:
            e, i, _ = _totals(conn, m)
            trend.append(TrendPoint(month=m, expense_cents=e, income_cents=i))

    by_category = [
        CategorySlice(
            category_id=r["category_id"],
            name=r["name"],
            color=r["color"],
            icon=r["icon"],
            total_cents=r["total"],
            share=round(r["total"] / expense * 100, 1) if expense else 0.0,
            count=r["n"],
        )
        for r in cat_rows
    ]

    # fill every calendar day of the month so the chart never has gaps
    year, mon = (int(p) for p in month.split("-"))
    next_first = date(year + (mon == 12), 1 if mon == 12 else mon + 1, 1)
    days_in_month = (next_first - date(year, mon, 1)).days
    lookup = {r["day"]: r for r in day_rows}
    daily = []
    for d in range(1, days_in_month + 1):
        key = f"{year:04d}-{mon:02d}-{d:02d}"
        row = lookup.get(key)
        daily.append(
            DayPoint(
                day=key,
                expense_cents=row["e"] if row else 0,
                income_cents=row["i"] if row else 0,
            )
        )

    change_pct = None
    if prev_expense:
        change_pct = round((expense - prev_expense) / prev_expense * 100, 1)

    summary = MonthlySummary(
        month=month,
        expense_cents=expense,
        income_cents=income,
        net_cents=income - expense,
        transaction_count=count,
        # average spend per *active* day (a day with at least one expense)
        avg_expense_cents=(
            round(expense / sum(1 for r in day_rows if r["e"] > 0))
            if any(r["e"] > 0 for r in day_rows)
            else 0
        ),
        top_category=by_category[0].name if by_category else None,
        prev_expense_cents=prev_expense,
        prev_income_cents=prev_income,
        change_pct=change_pct,
        by_category=by_category,
        daily=daily,
        top_merchants=[
            {"label": r["label"], "total_cents": r["total"], "count": r["n"]}
            for r in merchant_rows
        ],
    )
    return SummaryEnvelope(summary=summary, trend=trend)
