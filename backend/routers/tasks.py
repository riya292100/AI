"""Tasks router for CRUD operations."""
import uuid
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query

from backend.models import TaskInput, TaskUpdate
from backend.auth import now_iso, get_current_user
from backend import database
from backend.database import clean

router = APIRouter(prefix="/tasks", tags=["Tasks"])


def format_task(doc: dict) -> dict:
    """Normalize task fields to satisfy both existing and hardened workspace schemas."""
    item = clean(doc)
    item["owner_id"] = item.get("owner_id") or item.get("user_id")
    if "completed" not in item or item["completed"] is None:
        item["completed"] = bool(item.get("status") == "done")
    if "version" not in item:
        item["version"] = 1
    if "due_date" not in item:
        item["due_date"] = None
    return item


@router.get("")
async def list_tasks(
    limit: Optional[int] = Query(None, ge=1, le=500),
    offset: int = Query(0, ge=0),
    user=Depends(get_current_user),
):
    """List tasks for current user. Supports pagination if limit is specified."""
    query = {"$or": [{"user_id": user["id"]}, {"owner_id": user["id"]}]}
    cursor = database.db.tasks.find(query).sort("created_at", -1)

    if limit is not None:
        total = await database.db.tasks.count_documents(query)
        items = await cursor.skip(offset).limit(limit).to_list(limit)
        return {
            "items": [format_task(i) for i in items],
            "total": total,
            "offset": offset,
            "limit": limit,
        }

    items = await cursor.to_list(500)
    return [format_task(i) for i in items]


@router.post("")
async def create_task(payload: TaskInput, user=Depends(get_current_user)):
    """Create a new task."""
    doc = payload.model_dump()
    completed = (
        payload.completed
        if payload.completed is not None
        else (payload.status == "done")
    )
    status = "done" if completed else payload.status

    doc.update(
        {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "owner_id": user["id"],
            "status": status,
            "completed": completed,
            "version": 1,
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
    )
    await database.db.tasks.insert_one(doc.copy())
    return format_task(doc)


@router.patch("/{task_id}")
async def update_task(task_id: str, payload: TaskUpdate, user=Depends(get_current_user)):
    """Update an existing task."""
    changes = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not changes:
        raise HTTPException(status_code=400, detail="No changes provided")

    if "completed" in changes and "status" not in changes:
        changes["status"] = "done" if changes["completed"] else "todo"
    elif "status" in changes and "completed" not in changes:
        changes["completed"] = bool(changes["status"] == "done")

    changes["updated_at"] = now_iso()

    query = {
        "id": task_id,
        "$or": [{"user_id": user["id"]}, {"owner_id": user["id"]}],
    }

    # If version is passed, verify concurrency
    if payload.version is not None:
        existing = await database.db.tasks.find_one(query)
        if not existing:
            raise HTTPException(status_code=404, detail="Task not found")
        if existing.get("version", 1) != payload.version:
            raise HTTPException(status_code=409, detail="Task version mismatch")

    res = await database.db.tasks.update_one(
        query,
        {"$set": changes, "$inc": {"version": 1}},
    )
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Task not found")

    doc = await database.db.tasks.find_one(query)
    return format_task(doc)


@router.delete("/{task_id}")
async def delete_task(task_id: str, user=Depends(get_current_user)):
    """Delete a task."""
    query = {
        "id": task_id,
        "$or": [{"user_id": user["id"]}, {"owner_id": user["id"]}],
    }
    res = await database.db.tasks.delete_one(query)
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"ok": True}
