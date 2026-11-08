"""Generate believable demo data:  python -m app.seed [--reset]

Used by `DEMO_MODE=1` on startup and by the README quickstart.
"""
from __future__ import annotations

import random
import sys
from datetime import date, timedelta

from .db import get_db, init_db, month_bounds, shift_month, current_month

MERCHANTS: dict[str, list[tuple[str, int, int]]] = {
    # category -> [(merchant, min_cents, max_cents), ...]
    "Groceries": [("Whole Foods", 2400, 14200), ("Trader Joe's", 1800, 9600), ("Corner Market", 700, 4200)],
    "Dining": [("Blue Bottle", 450, 1900), ("Sweetgreen", 1200, 2600), ("Sushi Katsu", 3200, 8800), ("Taqueria Sol", 900, 3100)],
    "Transport": [("Uber", 800, 4200), ("Metro Card", 2750, 2750), ("Shell", 3800, 7400)],
    "Housing": [("Aster Properties", 185000, 185000)],
    "Utilities": [("ConEd", 6200, 11800), ("Verizon Fios", 7999, 7999)],
    "Health": [("Equinox", 21500, 21500), ("CVS Pharmacy", 900, 5600)],
    "Shopping": [("Amazon", 1200, 18900), ("Uniqlo", 2900, 12400), ("IKEA", 3400, 24900)],
    "Entertainment": [("AMC Theatres", 1800, 4600), ("Steam", 1200, 6900), ("Live Nation", 4500, 15500)],
    "Subscriptions": [("Spotify", 1199, 1199), ("Netflix", 1599, 1599), ("iCloud", 299, 299), ("Figma", 1500, 1500)],
}

INCOME = [("Northwind Labs", 640000, 640000), ("Freelance — Brava Studio", 45000, 180000)]

DESCRIPTIONS = {
    "Groceries": ["Weekly groceries", "Produce run", "Pantry restock"],
    "Dining": ["Lunch", "Coffee", "Dinner out", "Team lunch"],
    "Transport": ["Ride to airport", "Commute top-up", "Fuel"],
    "Housing": ["Monthly rent"],
    "Utilities": ["Electricity bill", "Internet"],
    "Health": ["Gym membership", "Prescription"],
    "Shopping": ["Household items", "New sneakers", "Desk lamp"],
    "Entertainment": ["Movie night", "Game purchase", "Concert tickets"],
    "Subscriptions": ["Monthly subscription"],
}


def seed_demo_data(reset: bool = False, months_back: int = 6, seed: int = 7) -> int:
    init_db()
    rng = random.Random(seed)
    now = date.today()

    with get_db() as conn:
        if reset:
            conn.execute("DELETE FROM transactions")
        existing = conn.execute("SELECT COUNT(*) AS n FROM transactions").fetchone()["n"]
        if existing:
            return 0

        cats = {r["name"]: r["id"] for r in conn.execute("SELECT id, name FROM categories")}
        rows: list[tuple] = []

        for offset in range(months_back - 1, -1, -1):
            month = shift_month(current_month(), -offset)
            year, mon = (int(p) for p in month.split("-"))
            lo, hi = month_bounds(month)
            first = date(year, mon, 1)
            days = (date.fromisoformat(hi) - first).days
            is_current = month == current_month()
            last_day = now.day if is_current else days

            # salary on the 1st
            if last_day >= 1:
                rows.append((640000, "income", cats.get("Salary"), "Salary — Northwind Labs", "Northwind Labs", f"{month}-01"))

            # rent on the 2nd (kept separate from the variable-spend pool so the
            # "top merchants" list isn't dominated by one fixed bill)
            if last_day >= 2:
                rows.append((185000, "expense", cats.get("Housing"), "Monthly rent", "Aster Properties", f"{month}-02"))

            # freelance, 0-2 times
            for _ in range(rng.choice([0, 1, 1, 2])):
                day = rng.randint(4, max(4, last_day))
                amt = rng.randint(45000, 180000)
                rows.append((amt, "income", cats.get("Freelance"), "Client invoice", "Brava Studio", f"{month}-{day:02d}"))

            # fixed subscriptions
            for name, _, amt in MERCHANTS["Subscriptions"]:
                day = rng.randint(3, max(3, last_day))
                rows.append((amt, "expense", cats.get("Subscriptions"), f"{name} subscription", name, f"{month}-{day:02d}"))

            # variable spending: ~18-26 transactions per month
            for _ in range(rng.randint(18, 26)):
                cat = rng.choice([c for c in MERCHANTS if c not in ("Housing", "Subscriptions")])
                merchant, lo_c, hi_c = rng.choice(MERCHANTS[cat])
                day = rng.randint(1, max(1, last_day))
                amt = rng.randint(lo_c, hi_c)
                desc = rng.choice(DESCRIPTIONS.get(cat, ["Purchase"]))
                rows.append((amt, "expense", cats.get(cat), desc, merchant, f"{month}-{day:02d}"))

        conn.executemany(
            """INSERT INTO transactions
               (amount_cents, type, category_id, description, merchant, occurred_on)
               VALUES (?, ?, ?, ?, ?, ?)""",
            rows,
        )
        return len(rows)


if __name__ == "__main__":
    n = seed_demo_data(reset="--reset" in sys.argv)
    print(f"Seeded {n} transactions.")
