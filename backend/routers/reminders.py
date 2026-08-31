"""Reminders router for proactive alerts on bills, documents, appointments, and budgets."""
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
from fastapi import APIRouter, Depends

from backend.models import DismissInput
from backend.auth import now_iso, get_current_user
from backend import database

router = APIRouter(prefix="/reminders", tags=["Reminders"])


async def compute_reminders(uid: str) -> List[Dict[str, Any]]:
    """Compute proactive notifications across user domains."""
    now = datetime.now(timezone.utc)
    today = now.date()
    dismissed_docs = await database.db.dismissed_reminders.find({"user_id": uid}).to_list(2000)
    dismissed = {d["key"] for d in dismissed_docs}

    items = []

    # Bills due in 0-1 day (unpaid)
    bills = await database.db.bills.find({"user_id": uid, "status": {"$ne": "paid"}}).to_list(500)
    for b in bills:
        try:
            dd = datetime.fromisoformat(b["due_date"].replace("Z", "+00:00")).date()
            days = (dd - today).days
            if days < 0:
                key = f"bill-overdue-{b['id']}"
                if key in dismissed:
                    continue
                items.append(
                    {
                        "id": key,
                        "kind": "bill",
                        "severity": "danger",
                        "title": f"Overdue: {b['name']}",
                        "body": f"${b.get('amount', 0):.2f} was due {abs(days)}d ago",
                        "entity_id": b["id"],
                        "when": b["due_date"],
                    }
                )
            elif days <= 1:
                key = f"bill-soon-{b['id']}-{today.isoformat()}"
                if key in dismissed:
                    continue
                label = "due today" if days == 0 else "due tomorrow"
                items.append(
                    {
                        "id": key,
                        "kind": "bill",
                        "severity": "warn",
                        "title": f"{b['name']} {label}",
                        "body": f"${b.get('amount', 0):.2f}",
                        "entity_id": b["id"],
                        "when": b["due_date"],
                    }
                )
        except Exception:
            pass

    # Appointments within 24h
    appts = (
        await database.db.appointments.find({"user_id": uid})
        .sort("starts_at", 1)
        .to_list(200)
    )
    for a in appts:
        try:
            starts = datetime.fromisoformat(a["starts_at"].replace("Z", "+00:00"))
            delta_h = (starts - now).total_seconds() / 3600
            if 0 <= delta_h <= 24:
                key = f"appt-{a['id']}"
                if key in dismissed:
                    continue
                when_str = starts.strftime("%b %d · %I:%M %p")
                items.append(
                    {
                        "id": key,
                        "kind": "appointment",
                        "severity": "info",
                        "title": a["title"],
                        "body": f"in {int(delta_h)}h · {when_str}",
                        "entity_id": a["id"],
                        "when": a["starts_at"],
                    }
                )
        except Exception:
            pass

    # Documents expiring within 30d
    docs = await database.db.documents.find({"user_id": uid}).to_list(500)
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
            if 0 <= days <= 30:
                key = f"doc-{d['id']}"
                if key in dismissed:
                    continue
                items.append(
                    {
                        "id": key,
                        "kind": "document",
                        "severity": "warn" if days <= 7 else "info",
                        "title": f"{d['name']} expires in {days}d",
                        "body": d.get("type", "").capitalize(),
                        "entity_id": d["id"],
                        "when": exp,
                    }
                )
        except Exception:
            pass

    # Budget threshold alerts (80% and 100%)
    budgets = await database.db.budgets.find({"user_id": uid}).to_list(200)
    start = (
        now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    )
    expenses = await database.db.expenses.find({"user_id": uid}).to_list(2000)
    spend_map = {}
    for e in expenses:
        if (e.get("date") or "") >= start:
            cat = e.get("category", "misc")
            spend_map[cat] = spend_map.get(cat, 0) + float(e.get("amount", 0))
    month_key = now.strftime("%Y-%m")
    for b in budgets:
        cap = float(b.get("monthly_cap", 0))
        if not cap:
            continue
        used = spend_map.get(b["category"], 0)
        pct = (used / cap) * 100
        if pct >= 100:
            key = f"budget-100-{b['id']}-{month_key}"
            if key in dismissed:
                continue
            items.append(
                {
                    "id": key,
                    "kind": "budget",
                    "severity": "danger",
                    "title": f"Over budget: {b['category']}",
                    "body": f"${used:.2f} of ${cap:.2f} ({pct:.0f}%)",
                    "entity_id": b["id"],
                    "when": now.isoformat(),
                }
            )
        elif pct >= 80:
            key = f"budget-80-{b['id']}-{month_key}"
            if key in dismissed:
                continue
            items.append(
                {
                    "id": key,
                    "kind": "budget",
                    "severity": "warn",
                    "title": f"{b['category']} nearing cap",
                    "body": f"${used:.2f} of ${cap:.2f} ({pct:.0f}%)",
                    "entity_id": b["id"],
                    "when": now.isoformat(),
                }
            )

    sev_rank = {"danger": 0, "warn": 1, "info": 2}
    items.sort(key=lambda x: (sev_rank.get(x["severity"], 3), x.get("when", "")))
    return items


@router.get("")
async def list_reminders(user=Depends(get_current_user)):
    """Get active reminders and unread badge count."""
    items = await compute_reminders(user["id"])
    return {"items": items, "unread": len(items)}


@router.post("/dismiss")
async def dismiss_reminder(payload: DismissInput, user=Depends(get_current_user)):
    """Dismiss a specific reminder notification."""
    await database.db.dismissed_reminders.update_one(
        {"user_id": user["id"], "key": payload.key},
        {"$set": {"user_id": user["id"], "key": payload.key, "at": now_iso()}},
        upsert=True,
    )
    return {"ok": True}
