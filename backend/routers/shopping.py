"""Shopping router for checklist and groceries."""
import uuid
from fastapi import APIRouter, HTTPException, Depends

from backend.models import ShoppingItemInput
from backend.auth import now_iso, get_current_user
from backend import database
from backend.database import clean

router = APIRouter(prefix="/shopping", tags=["Shopping"])


@router.get("")
async def list_shopping(user=Depends(get_current_user)):
    """List all shopping list items."""
    items = (
        await database.db.shopping.find({"user_id": user["id"]})
        .sort("created_at", -1)
        .to_list(500)
    )
    return [clean(i) for i in items]


@router.post("")
async def create_shopping(payload: ShoppingItemInput, user=Depends(get_current_user)):
    """Add an item to the shopping list."""
    doc = payload.model_dump()
    doc.update({"id": str(uuid.uuid4()), "user_id": user["id"], "created_at": now_iso()})
    await database.db.shopping.insert_one(doc.copy())
    return clean(doc)


@router.patch("/{item_id}")
async def toggle_shopping(item_id: str, user=Depends(get_current_user)):
    """Toggle checked state for a shopping item."""
    item = await database.db.shopping.find_one({"id": item_id, "user_id": user["id"]})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    new_checked = not item.get("checked", False)
    await database.db.shopping.update_one(
        {"id": item_id, "user_id": user["id"]}, {"$set": {"checked": new_checked}}
    )
    doc = await database.db.shopping.find_one({"id": item_id, "user_id": user["id"]})
    return clean(doc)


@router.delete("/{item_id}")
async def delete_shopping(item_id: str, user=Depends(get_current_user)):
    """Delete an item from the shopping list."""
    res = await database.db.shopping.delete_one({"id": item_id, "user_id": user["id"]})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"ok": True}
