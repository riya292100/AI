"""Workspace and Daily Review router for hardened LifeOS."""
import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query

from backend.models import (
    WorkspaceItemInput,
    WorkspaceItemUpdate,
    WorkspaceCategory,
)
from backend.auth import now_iso, get_current_user
from backend import database
from backend.database import clean

router = APIRouter(tags=["Workspace"])


def format_workspace_item(doc: dict) -> dict:
    """Format workspace item with owner_id and defaults."""
    item = clean(doc)
    item["owner_id"] = item.get("owner_id") or item.get("user_id")
    item["category"] = item.get("category", "reminder")
    item["status"] = item.get("status", "open")
    item["version"] = item.get("version", 1)
    item["note"] = item.get("note")
    item["amount"] = item.get("amount")
    item["scheduled_for"] = item.get("scheduled_for")
    return item


@router.get("/workspace/items")
async def list_workspace_items(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    category: Optional[WorkspaceCategory] = None,
    user=Depends(get_current_user),
):
    """List workspace items for the authenticated user."""
    query = {"$or": [{"user_id": user["id"]}, {"owner_id": user["id"]}]}
    if category:
        query["category"] = category

    cursor = database.db.workspace_items.find(query).sort("created_at", -1)
    total = await database.db.workspace_items.count_documents(query)
    items = await cursor.skip(offset).limit(limit).to_list(limit)

    return {
        "items": [format_workspace_item(i) for i in items],
        "total": total,
        "offset": offset,
        "limit": limit,
    }


@router.post("/workspace/items")
async def create_workspace_item(payload: WorkspaceItemInput, user=Depends(get_current_user)):
    """Create a new workspace item record."""
    doc = payload.model_dump()
    doc.update(
        {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "owner_id": user["id"],
            "status": "open",
            "version": 1,
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
    )
    await database.db.workspace_items.insert_one(doc.copy())
    return format_workspace_item(doc)


@router.patch("/workspace/items/{item_id}")
async def update_workspace_item(
    item_id: str, payload: WorkspaceItemUpdate, user=Depends(get_current_user)
):
    """Update a workspace item status or contents."""
    changes = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not changes:
        raise HTTPException(status_code=400, detail="No changes provided")

    query = {
        "id": item_id,
        "$or": [{"user_id": user["id"]}, {"owner_id": user["id"]}],
    }

    # Optimistic locking check if version was provided
    if payload.version is not None:
        existing = await database.db.workspace_items.find_one(query)
        if not existing:
            raise HTTPException(status_code=404, detail="Workspace item not found")
        if existing.get("version", 1) != payload.version:
            raise HTTPException(status_code=409, detail="Workspace item version mismatch")

    changes["updated_at"] = now_iso()
    res = await database.db.workspace_items.update_one(
        query,
        {"$set": changes, "$inc": {"version": 1}},
    )
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Workspace item not found")

    doc = await database.db.workspace_items.find_one(query)
    return format_workspace_item(doc)


@router.delete("/workspace/items/{item_id}")
async def delete_workspace_item(item_id: str, user=Depends(get_current_user)):
    """Delete a workspace item record."""
    query = {
        "id": item_id,
        "$or": [{"user_id": user["id"]}, {"owner_id": user["id"]}],
    }
    res = await database.db.workspace_items.delete_one(query)
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Workspace item not found")
    return {"ok": True}


@router.get("/review/today")
async def get_daily_review(user=Depends(get_current_user)):
    """Generate daily review metrics and prioritized next actions."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    task_filter = {"$or": [{"user_id": user["id"]}, {"owner_id": user["id"]}]}
    open_task_filter = {**task_filter, "status": {"$ne": "done"}}
    completed_task_filter = {**task_filter, "status": "done"}

    open_tasks = await database.db.tasks.count_documents(open_task_filter)
    completed_tasks = await database.db.tasks.count_documents(completed_task_filter)

    module_filter = {"$or": [{"user_id": user["id"]}, {"owner_id": user["id"]}]}
    open_modules = await database.db.workspace_items.count_documents(
        {**module_filter, "status": "open"}
    )

    # Derive top next actions from user tasks and workspace items
    recent_tasks = (
        await database.db.tasks.find(open_task_filter)
        .sort([("priority", -1), ("created_at", -1)])
        .limit(3)
        .to_list(3)
    )
    recent_modules = (
        await database.db.workspace_items.find({**module_filter, "status": "open"})
        .sort("created_at", -1)
        .limit(3)
        .to_list(3)
    )

    actions = [f"Complete task: {t.get('title')}" for t in recent_tasks if t.get("title")]
    for m in recent_modules:
        if len(actions) >= 3:
            break
        title = m.get("title", "")
        cat = m.get("category", "module")
        if title:
            actions.append(f"Review {cat}: {title}")

    # Fallback recommendations if user has few or no items yet
    fallbacks = [
        "Plan top priorities for the week ahead",
        "Review monthly financial commitments",
        "Clear high-priority inbox threads",
    ]
    for fb in fallbacks:
        if len(actions) >= 3:
            break
        if fb not in actions:
            actions.append(fb)

    return {
        "date": today,
        "open_tasks": open_tasks,
        "open_modules": open_modules,
        "completed_tasks": completed_tasks,
        "next_actions": actions[:3],
        "generated_locally": True,
    }
