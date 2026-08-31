"""Budgets router for monthly category spending limits."""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends

from backend.models import BudgetInput
from backend.auth import now_iso, get_current_user
from backend import database
from backend.database import clean

router = APIRouter(prefix="/budgets", tags=["Budgets"])


@router.get("")
async def list_budgets(user=Depends(get_current_user)):
    """List budgets and calculate current month spending per category."""
    uid = user["id"]
    budgets = await database.db.budgets.find({"user_id": uid}).to_list(200)

    # Compute current-month spend per category
    start = (
        datetime.now(timezone.utc)
        .replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        .isoformat()
    )
    expenses = await database.db.expenses.find({"user_id": uid}).to_list(2000)
    spend = {}
    for e in expenses:
        if (e.get("date") or "") >= start:
            cat = e.get("category", "misc")
            spend[cat] = spend.get(cat, 0) + float(e.get("amount", 0))

    out = []
    for b in budgets:
        used = round(spend.get(b["category"], 0), 2)
        cap = float(b.get("monthly_cap", 0))
        pct = round((used / cap) * 100, 1) if cap else 0.0
        out.append({**clean(b), "spent": used, "percent": pct})
    return out


@router.post("")
async def create_budget(payload: BudgetInput, user=Depends(get_current_user)):
    """Create or update a category monthly budget cap."""
    cat = payload.category.strip().lower()
    existing = await database.db.budgets.find_one({"user_id": user["id"], "category": cat})
    if existing:
        await database.db.budgets.update_one(
            {"id": existing["id"]}, {"$set": {"monthly_cap": payload.monthly_cap}}
        )
        doc = await database.db.budgets.find_one({"id": existing["id"]})
    else:
        doc = {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "category": cat,
            "monthly_cap": payload.monthly_cap,
            "created_at": now_iso(),
        }
        await database.db.budgets.insert_one(doc.copy())
    return clean(doc)


@router.delete("/{bid}")
async def delete_budget(bid: str, user=Depends(get_current_user)):
    """Delete a budget."""
    res = await database.db.budgets.delete_one({"id": bid, "user_id": user["id"]})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Budget not found")
    return {"ok": True}
