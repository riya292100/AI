"""Pydantic schemas and models for LifeOS API."""
from typing import Optional, Literal, List, Dict, Any
from pydantic import BaseModel, Field, EmailStr


# ---------------------------------------------------------------------------
# Auth Models
# ---------------------------------------------------------------------------
class RegisterInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, description="Password must be at least 6 characters")
    name: Optional[str] = None


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    token: Optional[str] = None
    created_at: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None


# ---------------------------------------------------------------------------
# Tasks
# ---------------------------------------------------------------------------
class TaskInput(BaseModel):
    title: str
    notes: Optional[str] = ""
    priority: Literal["low", "medium", "high"] = "medium"
    category: str = "general"
    due_date: Optional[str] = None  # ISO date/datetime
    status: Literal["todo", "in_progress", "done"] = "todo"


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    notes: Optional[str] = None
    priority: Optional[Literal["low", "medium", "high"]] = None
    category: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[Literal["todo", "in_progress", "done"]] = None


# ---------------------------------------------------------------------------
# Bills & Expenses
# ---------------------------------------------------------------------------
class BillInput(BaseModel):
    name: str
    amount: float
    due_date: str
    frequency: Literal["once", "weekly", "monthly", "yearly"] = "monthly"
    category: str = "utilities"
    status: Literal["upcoming", "paid", "overdue"] = "upcoming"
    notes: Optional[str] = ""


class BillUpdate(BaseModel):
    name: Optional[str] = None
    amount: Optional[float] = None
    due_date: Optional[str] = None
    frequency: Optional[Literal["once", "weekly", "monthly", "yearly"]] = None
    category: Optional[str] = None
    status: Optional[Literal["upcoming", "paid", "overdue"]] = None
    notes: Optional[str] = None


class ExpenseInput(BaseModel):
    amount: float
    category: str = "misc"
    date: Optional[str] = None
    notes: Optional[str] = ""


# ---------------------------------------------------------------------------
# Documents & OCR
# ---------------------------------------------------------------------------
class DocumentInput(BaseModel):
    name: str
    type: str = "id"  # id, insurance, contract, warranty, receipt
    expiry_date: Optional[str] = None
    notes: Optional[str] = ""
    file_url: Optional[str] = ""


# ---------------------------------------------------------------------------
# Appointments
# ---------------------------------------------------------------------------
class AppointmentInput(BaseModel):
    title: str
    location: Optional[str] = ""
    starts_at: str
    ends_at: Optional[str] = None
    notes: Optional[str] = ""


# ---------------------------------------------------------------------------
# Habits
# ---------------------------------------------------------------------------
class HabitInput(BaseModel):
    name: str
    icon: Optional[str] = "target"
    target_days_per_week: int = 7


class HabitLogInput(BaseModel):
    date: str  # YYYY-MM-DD


# ---------------------------------------------------------------------------
# Shopping
# ---------------------------------------------------------------------------
class ShoppingItemInput(BaseModel):
    name: str
    quantity: int = 1
    checked: bool = False


# ---------------------------------------------------------------------------
# Budgets & Reminders
# ---------------------------------------------------------------------------
class BudgetInput(BaseModel):
    category: str
    monthly_cap: float


class DismissInput(BaseModel):
    key: str


# ---------------------------------------------------------------------------
# AI & Chat
# ---------------------------------------------------------------------------
class ChatInput(BaseModel):
    message: str


# ---------------------------------------------------------------------------
# Generic API Responses
# ---------------------------------------------------------------------------
class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
    request_id: Optional[str] = None
