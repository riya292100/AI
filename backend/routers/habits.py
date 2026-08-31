"""Habits router for habit tracking and completion logging."""
import uuid
from fastapi import APIRouter, HTTPException, Depends

from backend.models import HabitInput, HabitLogInput
from backend.auth import now_iso, get_current_user
from backend import database
from backend.database import clean

router = APIRouter(prefix="/habits", tags=["Habits"])


@router.get("")
async def list_habits(user=Depends(get_current_user)):
    """List all habits."""
    items = (
        await database.db.habits.find({"user_id": user["id"]})
        .sort("created_at", 1)
        .to_list(200)
    )
    return [clean(i) for i in items]


@router.post("")
async def create_habit(payload: HabitInput, user=Depends(get_current_user)):
    """Create a new habit."""
    doc = payload.model_dump()
    doc.update(
        {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "created_at": now_iso(),
            "logs": [],
        }
    )
    await database.db.habits.insert_one(doc.copy())
    return clean(doc)


@router.post("/{habit_id}/log")
async def log_habit(habit_id: str, payload: HabitLogInput, user=Depends(get_current_user)):
    """Toggle a completion log for a specific date."""
    habit = await database.db.habits.find_one({"id": habit_id, "user_id": user["id"]})
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    logs = set(habit.get("logs", []))
    if payload.date in logs:
        logs.remove(payload.date)
    else:
        logs.add(payload.date)
    await database.db.habits.update_one(
        {"id": habit_id, "user_id": user["id"]}, {"$set": {"logs": sorted(list(logs))}}
    )
    doc = await database.db.habits.find_one({"id": habit_id, "user_id": user["id"]})
    return clean(doc)


@router.delete("/{habit_id}")
async def delete_habit(habit_id: str, user=Depends(get_current_user)):
    """Delete a habit."""
    res = await database.db.habits.delete_one({"id": habit_id, "user_id": user["id"]})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Habit not found")
    return {"ok": True}
