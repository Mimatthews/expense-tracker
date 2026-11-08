"""FastAPI application entrypoint:  uvicorn app.main:app --reload"""
from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import DB_PATH, init_db
from .routers import categories, summary, transactions

DEMO_MODE = os.getenv("DEMO_MODE", "0") == "1"


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    if DEMO_MODE:
        from .seed import seed_demo_data

        seed_demo_data(reset=False)
    yield


app = FastAPI(
    title="Ledger — Expense Tracker API",
    version="1.0.0",
    description=(
        "CRUD for transactions and categories, plus monthly aggregation "
        "endpoints powering the dashboard charts."
    ),
    lifespan=lifespan,
)

origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins if o.strip()],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(categories.router)
app.include_router(transactions.router)
app.include_router(summary.router)


@app.get("/api/health", tags=["meta"])
def health():
    return {"status": "ok", "database": str(DB_PATH), "demo_mode": DEMO_MODE}
