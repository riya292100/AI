"""Database seeding utilities for LifeOS demo account."""
import uuid
from datetime import datetime, timezone, timedelta

from backend.config import settings
from backend.auth import now_iso, hash_password, verify_password
from backend.logger import logger
from backend import database


async def seed_demo():
    """Ensure database indexes and populate seed data if not present."""
    await database.db.users.create_index("email", unique=True)
    for coll in (
        "tasks",
        "bills",
        "expenses",
        "documents",
        "appointments",
        "habits",
        "shopping",
        "ai_messages",
        "budgets",
        "dismissed_reminders",
        "login_attempts",
    ):
        await database.db[coll].create_index("user_id")

    existing = await database.db.users.find_one({"email": settings.ADMIN_EMAIL})
    if existing:
        updates = {}
        if not verify_password(settings.ADMIN_PASSWORD, existing.get("password_hash", "")):
            updates["password_hash"] = hash_password(settings.ADMIN_PASSWORD)
        if existing.get("name") != "Riya Gope":
            updates["name"] = "Riya Gope"
        if updates:
            await database.db.users.update_one({"email": settings.ADMIN_EMAIL}, {"$set": updates})
        return

    uid = str(uuid.uuid4())
    await database.db.users.insert_one(
        {
            "id": uid,
            "email": settings.ADMIN_EMAIL,
            "name": "Riya Gope",
            "password_hash": hash_password(settings.ADMIN_PASSWORD),
            "created_at": now_iso(),
            "preferences": {"currency": "USD", "timezone": "UTC"},
        }
    )

    today = datetime.now(timezone.utc).date()
    d = lambda n: (today + timedelta(days=n)).isoformat()

    tasks = [
        {"title": "Finalize Q1 review deck", "priority": "high", "category": "work", "due_date": d(0), "status": "todo"},
        {"title": "Pick up dry cleaning", "priority": "low", "category": "errands", "due_date": d(0), "status": "todo"},
        {"title": "Call dentist to reschedule", "priority": "medium", "category": "health", "due_date": d(1), "status": "todo"},
        {"title": "Renew gym membership", "priority": "low", "category": "personal", "due_date": d(3), "status": "todo"},
        {"title": "Book flights for spring trip", "priority": "medium", "category": "travel", "due_date": d(6), "status": "todo"},
        {"title": "Weekly meal prep", "priority": "medium", "category": "home", "due_date": d(2), "status": "todo"},
        {"title": "Read chapter 4 - Atomic Habits", "priority": "low", "category": "learning", "status": "in_progress"},
    ]
    for t in tasks:
        await database.db.tasks.insert_one({**t, "id": str(uuid.uuid4()), "user_id": uid, "notes": "", "created_at": now_iso(), "updated_at": now_iso()})

    bills = [
        {"name": "Rent", "amount": 1850.0, "due_date": d(2), "frequency": "monthly", "category": "housing", "status": "upcoming"},
        {"name": "Electric bill", "amount": 92.4, "due_date": d(5), "frequency": "monthly", "category": "utilities", "status": "upcoming"},
        {"name": "Netflix", "amount": 15.99, "due_date": d(9), "frequency": "monthly", "category": "subscriptions", "status": "upcoming"},
        {"name": "Car insurance", "amount": 128.0, "due_date": d(14), "frequency": "monthly", "category": "insurance", "status": "upcoming"},
        {"name": "Internet", "amount": 65.0, "due_date": d(-2), "frequency": "monthly", "category": "utilities", "status": "paid"},
    ]
    for b in bills:
        await database.db.bills.insert_one({**b, "id": str(uuid.uuid4()), "user_id": uid, "notes": "", "created_at": now_iso()})

    expenses = [
        {"amount": 42.15, "category": "groceries", "date": d(-1), "notes": "Trader Joe's"},
        {"amount": 12.5, "category": "food", "date": d(-1), "notes": "Coffee + pastry"},
        {"amount": 89.9, "category": "shopping", "date": d(-3), "notes": "New running shoes"},
        {"amount": 34.0, "category": "transport", "date": d(-4), "notes": "Uber to airport"},
        {"amount": 18.75, "category": "food", "date": d(-6), "notes": "Ramen dinner"},
        {"amount": 220.0, "category": "utilities", "date": d(-10), "notes": "Water + gas"},
    ]
    for e in expenses:
        await database.db.expenses.insert_one({**e, "id": str(uuid.uuid4()), "user_id": uid, "created_at": now_iso()})

    appts = [
        {"title": "Team standup", "location": "Zoom", "starts_at": (datetime.now(timezone.utc) + timedelta(hours=3)).isoformat(), "notes": ""},
        {"title": "Doctor - annual checkup", "location": "Downtown Clinic", "starts_at": (datetime.now(timezone.utc) + timedelta(days=2, hours=2)).isoformat(), "notes": "Bring insurance card"},
        {"title": "Dinner with Sam", "location": "Osteria 21", "starts_at": (datetime.now(timezone.utc) + timedelta(days=4, hours=6)).isoformat(), "notes": ""},
    ]
    for a in appts:
        await database.db.appointments.insert_one({**a, "id": str(uuid.uuid4()), "user_id": uid, "created_at": now_iso()})

    habits = [
        {"name": "Morning walk", "icon": "footprints", "target_days_per_week": 7},
        {"name": "Read 20 minutes", "icon": "book-open", "target_days_per_week": 5},
        {"name": "No sugar", "icon": "leaf", "target_days_per_week": 5},
    ]
    for h in habits:
        logs = [d(-i) for i in range(0, 5)]
        await database.db.habits.insert_one({**h, "id": str(uuid.uuid4()), "user_id": uid, "created_at": now_iso(), "logs": logs})

    docs = [
        {"name": "Passport", "type": "id", "expiry_date": d(320), "notes": "Renew online"},
        {"name": "Car insurance policy", "type": "insurance", "expiry_date": d(45), "notes": "Auto-renew enabled"},
        {"name": "MacBook AppleCare", "type": "warranty", "expiry_date": d(200), "notes": ""},
    ]
    for dc in docs:
        await database.db.documents.insert_one({**dc, "id": str(uuid.uuid4()), "user_id": uid, "file_url": "", "created_at": now_iso()})

    shopping = [
        {"name": "Oat milk", "quantity": 2, "checked": False},
        {"name": "Bananas", "quantity": 6, "checked": False},
        {"name": "Laundry detergent", "quantity": 1, "checked": True},
    ]
    for s in shopping:
        await database.db.shopping.insert_one({**s, "id": str(uuid.uuid4()), "user_id": uid, "created_at": now_iso()})

    budgets = [
        {"category": "food", "monthly_cap": 350.0},
        {"category": "groceries", "monthly_cap": 400.0},
        {"category": "shopping", "monthly_cap": 200.0},
        {"category": "transport", "monthly_cap": 150.0},
    ]
    for bg in budgets:
        await database.db.budgets.insert_one({**bg, "id": str(uuid.uuid4()), "user_id": uid, "created_at": now_iso()})

    logger.info(f"Seeded demo user {settings.ADMIN_EMAIL}")
