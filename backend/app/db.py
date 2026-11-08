"""SQLite access layer.

Money is stored as an integer number of cents so we never do float math on
currency. Every request gets its own connection; SQLite handles the locking.
"""
from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from datetime import date, datetime
from pathlib import Path
from typing import Iterator

DATA_DIR = Path(os.getenv("DATA_DIR", Path(__file__).resolve().parent.parent / "data"))
DB_PATH = Path(os.getenv("DATABASE_PATH", DATA_DIR / "expenses.db"))

SCHEMA = """
CREATE TABLE IF NOT EXISTS categories (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL UNIQUE,
    color      TEXT    NOT NULL DEFAULT '#787f8a',
    icon       TEXT    NOT NULL DEFAULT 'tag',
    kind       TEXT    NOT NULL DEFAULT 'expense' CHECK (kind IN ('expense', 'income')),
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    type        TEXT    NOT NULL CHECK (type IN ('expense', 'income')),
    category_id INTEGER REFERENCES categories (id) ON DELETE SET NULL,
    description TEXT    NOT NULL,
    merchant    TEXT,
    occurred_on TEXT    NOT NULL,           -- ISO date, YYYY-MM-DD
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tx_date     ON transactions (occurred_on DESC);
CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions (category_id);
CREATE INDEX IF NOT EXISTS idx_tx_type     ON transactions (type);
"""

# Deliberately low-chroma: the palette distinguishes categories without turning
# the charts into confetti. Hues stay muted so the one accent blue still reads
# as the accent.
DEFAULT_CATEGORIES: list[tuple[str, str, str, str]] = [
    ("Groceries", "#6b8a9e", "cart", "expense"),
    ("Dining", "#a3805f", "utensils", "expense"),
    ("Transport", "#7e7ba0", "car", "expense"),
    ("Housing", "#9a6b70", "home", "expense"),
    ("Utilities", "#5f8a8a", "bolt", "expense"),
    ("Health", "#6f9070", "heart", "expense"),
    ("Shopping", "#9c8a5f", "bag", "expense"),
    ("Entertainment", "#8a6f92", "play", "expense"),
    ("Subscriptions", "#787f8a", "repeat", "expense"),
    ("Salary", "#5f8f7b", "wallet", "income"),
    ("Freelance", "#71879b", "laptop", "income"),
]


def connect() -> sqlite3.Connection:
    # make sure the directory for whichever path we're pointed at exists
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


@contextmanager
def get_db() -> Iterator[sqlite3.Connection]:
    conn = connect()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    with get_db() as conn:
        conn.executescript(SCHEMA)
        existing = conn.execute("SELECT COUNT(*) AS n FROM categories").fetchone()["n"]
        if not existing:
            conn.executemany(
                "INSERT INTO categories (name, color, icon, kind) VALUES (?, ?, ?, ?)",
                DEFAULT_CATEGORIES,
            )


def month_bounds(month: str) -> tuple[str, str]:
    """'2026-11' -> ('2026-11-01', '2026-12-01') half-open range."""
    year, mon = (int(p) for p in month.split("-"))
    start = date(year, mon, 1)
    end = date(year + (mon == 12), 1 if mon == 12 else mon + 1, 1)
    return start.isoformat(), end.isoformat()


def shift_month(month: str, delta: int) -> str:
    year, mon = (int(p) for p in month.split("-"))
    index = year * 12 + (mon - 1) + delta
    return f"{index // 12:04d}-{index % 12 + 1:02d}"


def current_month() -> str:
    return datetime.now().strftime("%Y-%m")
