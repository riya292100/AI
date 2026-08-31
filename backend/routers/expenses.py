"""Expenses router for logging expenditures."""
import uuid
from fastapi import APIRouter, HTTPException, Depends

from backend.models import ExpenseInput
from backend.auth import now_iso, get_current_user
from backend import database
from backend.database import clean

router = APIRouter(prefix="/expenses", tags=["Expenses"])


@router.get("")
async def list_expenses(user=Depends(get_current_user)):
    """List all user expenses sorted by date descending."""
    items = (
        await database.db.expenses.find({"user_id": user["id"]})
        .sort("date", -1)
        .to_list(1000)
    )
    return [clean(i) for i in items]


@router.post("")
async def create_expense(payload: ExpenseInput, user=Depends(get_current_user)):
    """Create a new expense entry."""
    doc = payload.model_dump()
    doc["date"] = doc.get("date") or now_iso()
    doc.update({"id": str(uuid.uuid4()), "user_id": user["id"], "created_at": now_iso()})
    await database.db.expenses.insert_one(doc.copy())
    return clean(doc)


@router.delete("/{expense_id}")
async def delete_expense(expense_id: str, user=Depends(get_current_user)):
    """Delete an expense record."""
    res = await database.db.expenses.delete_one({"id": expense_id, "user_id": user["id"]})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"ok": True}
