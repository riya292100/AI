"""Tasks router for CRUD operations."""
import uuid
from fastapi import APIRouter, HTTPException, Depends

from backend.models import TaskInput, TaskUpdate
from backend.auth import now_iso, get_current_user
from backend import database
from backend.database import clean

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get("")
async def list_tasks(user=Depends(get_current_user)):
    """List all tasks for current user."""
    items = (
        await database.db.tasks.find({"user_id": user["id"]})
        .sort("created_at", -1)
        .to_list(500)
    )
    return [clean(i) for i in items]


@router.post("")
async def create_task(payload: TaskInput, user=Depends(get_current_user)):
    """Create a new task."""
    doc = payload.model_dump()
    doc.update(
        {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
    )
    await database.db.tasks.insert_one(doc.copy())
    return clean(doc)


@router.patch("/{task_id}")
async def update_task(task_id: str, payload: TaskUpdate, user=Depends(get_current_user)):
    """Update an existing task."""
    changes = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not changes:
        raise HTTPException(status_code=400, detail="No changes provided")
    changes["updated_at"] = now_iso()
    res = await database.db.tasks.update_one(
        {"id": task_id, "user_id": user["id"]}, {"$set": changes}
    )
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Task not found")
    doc = await database.db.tasks.find_one({"id": task_id, "user_id": user["id"]})
    return clean(doc)


@router.delete("/{task_id}")
async def delete_task(task_id: str, user=Depends(get_current_user)):
    """Delete a task."""
    res = await database.db.tasks.delete_one({"id": task_id, "user_id": user["id"]})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"ok": True}
