"""Appointments router for calendar schedules and events."""
import uuid
from fastapi import APIRouter, HTTPException, Depends

from backend.models import AppointmentInput
from backend.auth import now_iso, get_current_user
from backend import database
from backend.database import clean

router = APIRouter(prefix="/appointments", tags=["Appointments"])


@router.get("")
async def list_appointments(user=Depends(get_current_user)):
    """List all appointments sorted by start time."""
    items = (
        await database.db.appointments.find({"user_id": user["id"]})
        .sort("starts_at", 1)
        .to_list(500)
    )
    return [clean(i) for i in items]


@router.post("")
async def create_appointment(payload: AppointmentInput, user=Depends(get_current_user)):
    """Create a new calendar appointment."""
    doc = payload.model_dump()
    doc.update({"id": str(uuid.uuid4()), "user_id": user["id"], "created_at": now_iso()})
    await database.db.appointments.insert_one(doc.copy())
    return clean(doc)


@router.delete("/{apt_id}")
async def delete_appointment(apt_id: str, user=Depends(get_current_user)):
    """Delete an appointment."""
    res = await database.db.appointments.delete_one({"id": apt_id, "user_id": user["id"]})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return {"ok": True}
