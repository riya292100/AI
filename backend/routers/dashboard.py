"""Dashboard and global search endpoints."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends

from backend.auth import get_current_user
from backend import database
from backend.database import clean

router = APIRouter(tags=["Dashboard"])


@router.get("/dashboard")
async def dashboard(user=Depends(get_current_user)):
    """Compute consolidated dashboard metrics and KPIs."""
    uid = user["id"]
    today = datetime.now(timezone.utc).date()
    month_start = today.replace(day=1).isoformat()

    tasks = await database.db.tasks.find({"user_id": uid}).to_list(500)
    bills = await database.db.bills.find({"user_id": uid}).to_list(500)
    expenses = await database.db.expenses.find({"user_id": uid}).to_list(1000)
    appts = (
        await database.db.appointments.find({"user_id": uid})
        .sort("starts_at", 1)
        .to_list(500)
    )
    habits = await database.db.habits.find({"user_id": uid}).to_list(500)
    docs = await database.db.documents.find({"user_id": uid}).to_list(500)

    open_tasks = [t for t in tasks if t.get("status") != "done"]
    due_today = []
    upcoming = []
    for t in open_tasks:
        d = t.get("due_date")
        if not d:
            continue
        try:
            dd = datetime.fromisoformat(d.replace("Z", "+00:00")).date()
            if dd == today:
                due_today.append(t)
            elif dd > today:
                upcoming.append(t)
        except Exception:
            pass

    upcoming_bills = []
    total_owed = 0.0
    for b in bills:
        if b.get("status") == "paid":
            continue
        try:
            dd = datetime.fromisoformat(b["due_date"].replace("Z", "+00:00")).date()
            days = (dd - today).days
            if days <= 30:
                upcoming_bills.append({**clean(b), "days_until": days})
                total_owed += float(b.get("amount", 0))
        except Exception:
            pass
    upcoming_bills.sort(key=lambda x: x.get("days_until", 9999))

    month_expense = 0.0
    for e in expenses:
        d = (e.get("date") or "")[:10]
        if d >= month_start:
            month_expense += float(e.get("amount", 0))

    next_appt = None
    for a in appts:
        try:
            if datetime.fromisoformat(
                a["starts_at"].replace("Z", "+00:00")
            ).astimezone(timezone.utc) >= datetime.now(timezone.utc):
                next_appt = clean(a)
                break
        except Exception:
            pass

    expiring_docs = []
    for d in docs:
        exp = d.get("expiry_date")
        if not exp:
            continue
        try:
            edate = (
                datetime.fromisoformat(exp).date()
                if len(exp) == 10
                else datetime.fromisoformat(exp.replace("Z", "+00:00")).date()
            )
            days = (edate - today).days
            if days <= 60:
                expiring_docs.append({**clean(d), "days_until": days})
        except Exception:
            pass
    expiring_docs.sort(key=lambda x: x.get("days_until", 9999))

    return {
        "counts": {
            "open_tasks": len(open_tasks),
            "due_today": len(due_today),
            "upcoming_bills": len(upcoming_bills),
            "habits": len(habits),
        },
        "money": {
            "month_expense": round(month_expense, 2),
            "total_owed": round(total_owed, 2),
            "currency": user.get("preferences", {}).get("currency", "USD"),
        },
        "due_today": [clean(t) for t in due_today],
        "upcoming_tasks": [clean(t) for t in upcoming[:5]],
        "upcoming_bills": upcoming_bills[:5],
        "next_appointment": next_appt,
        "expiring_documents": expiring_docs[:5],
    }


@router.get("/search")
async def search(q: str, user=Depends(get_current_user)):
    """Global search across user tasks, bills, expenses, documents, appointments, habits, and shopping."""
    if not q or len(q) < 2:
        return {"results": []}
    uid = user["id"]
    regex = {"$regex": q, "$options": "i"}
    results = []
    for coll, kind, fields in [
        ("tasks", "task", ["title", "notes"]),
        ("bills", "bill", ["name", "notes"]),
        ("expenses", "expense", ["notes", "category"]),
        ("documents", "document", ["name", "notes"]),
        ("appointments", "appointment", ["title", "location", "notes"]),
        ("habits", "habit", ["name"]),
        ("shopping", "shopping", ["name"]),
    ]:
        query = {"user_id": uid, "$or": [{f: regex} for f in fields]}
        docs = await database.db[coll].find(query).to_list(20)
        for d in docs:
            results.append({"kind": kind, **clean(d)})
    return {"results": results}
