"""Bills router for tracking and managing upcoming & paid bills."""
import uuid
from fastapi import APIRouter, HTTPException, Depends

from backend.models import BillInput, BillUpdate
from backend.auth import now_iso, get_current_user
from backend import database
from backend.database import clean

router = APIRouter(prefix="/bills", tags=["Bills"])


@router.get("")
async def list_bills(user=Depends(get_current_user)):
    """List all bills sorted by due date."""
    items = (
        await database.db.bills.find({"user_id": user["id"]})
        .sort("due_date", 1)
        .to_list(500)
    )
    return [clean(i) for i in items]


@router.post("")
async def create_bill(payload: BillInput, user=Depends(get_current_user)):
    """Create a new bill record."""
    doc = payload.model_dump()
    doc.update({"id": str(uuid.uuid4()), "user_id": user["id"], "created_at": now_iso()})
    await database.db.bills.insert_one(doc.copy())
    return clean(doc)


@router.patch("/{bill_id}")
async def update_bill(bill_id: str, payload: BillUpdate, user=Depends(get_current_user)):
    """Update an existing bill."""
    changes = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not changes:
        raise HTTPException(status_code=400, detail="No changes provided")
    res = await database.db.bills.update_one(
        {"id": bill_id, "user_id": user["id"]}, {"$set": changes}
    )
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Bill not found")
    doc = await database.db.bills.find_one({"id": bill_id, "user_id": user["id"]})
    return clean(doc)


@router.delete("/{bill_id}")
async def delete_bill(bill_id: str, user=Depends(get_current_user)):
    """Delete a bill."""
    res = await database.db.bills.delete_one({"id": bill_id, "user_id": user["id"]})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Bill not found")
    return {"ok": True}
