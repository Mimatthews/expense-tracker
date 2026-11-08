"""Pydantic request/response models."""
from __future__ import annotations

import re
from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

TxnType = Literal["expense", "income"]
HEX = re.compile(r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")
MONTH_RE = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")


# ---------------------------------------------------------------- categories
class CategoryBase(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    color: str = "#7c8cf8"
    icon: str = "tag"
    kind: TxnType = "expense"

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("name cannot be blank")
        return v

    @field_validator("color")
    @classmethod
    def valid_color(cls, v: str) -> str:
        if not HEX.match(v):
            raise ValueError("color must be a hex value like #38bdf8")
        return v


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=40)
    color: Optional[str] = None
    icon: Optional[str] = None
    kind: Optional[TxnType] = None


class Category(CategoryBase):
    id: int
    created_at: str


class CategoryWithStats(Category):
    transaction_count: int = 0
    month_total_cents: int = 0


# -------------------------------------------------------------- transactions
class TransactionBase(BaseModel):
    amount_cents: int = Field(gt=0, le=10_000_000_00, description="amount in cents")
    type: TxnType = "expense"
    category_id: Optional[int] = None
    description: str = Field(min_length=1, max_length=120)
    merchant: Optional[str] = Field(default=None, max_length=80)
    occurred_on: date

    @field_validator("description")
    @classmethod
    def strip_desc(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("description cannot be blank")
        return v


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    amount_cents: Optional[int] = Field(default=None, gt=0, le=10_000_000_00)
    type: Optional[TxnType] = None
    category_id: Optional[int] = None
    description: Optional[str] = Field(default=None, min_length=1, max_length=120)
    merchant: Optional[str] = Field(default=None, max_length=80)
    occurred_on: Optional[date] = None


class Transaction(BaseModel):
    id: int
    amount_cents: int
    type: TxnType
    category_id: Optional[int]
    category_name: Optional[str] = None
    category_color: Optional[str] = None
    category_icon: Optional[str] = None
    description: str
    merchant: Optional[str]
    occurred_on: str
    created_at: str
    updated_at: str


class TransactionPage(BaseModel):
    items: list[Transaction]
    total: int
    limit: int
    offset: int


# ------------------------------------------------------------------ summary
class CategorySlice(BaseModel):
    category_id: Optional[int]
    name: str
    color: str
    icon: str
    total_cents: int
    share: float
    count: int


class DayPoint(BaseModel):
    day: str
    expense_cents: int
    income_cents: int


class MonthlySummary(BaseModel):
    month: str
    expense_cents: int
    income_cents: int
    net_cents: int
    transaction_count: int
    avg_expense_cents: int
    top_category: Optional[str]
    prev_expense_cents: int
    prev_income_cents: int
    change_pct: Optional[float]
    by_category: list[CategorySlice]
    daily: list[DayPoint]
    top_merchants: list[dict]


class TrendPoint(BaseModel):
    month: str
    expense_cents: int
    income_cents: int


class SummaryEnvelope(BaseModel):
    summary: MonthlySummary
    trend: list[TrendPoint]
