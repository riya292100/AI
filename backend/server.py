from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import json
import logging
import bcrypt
import jwt as pyjwt
from datetime import datetime, timezone, timedelta, date
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from starlette.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict

from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone


# ---------------------------------------------------------------------------
# App / DB
# ---------------------------------------------------------------------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="LifeOS API")
api = APIRouter(prefix="/api")

JWT_ALGO = "HS256"
JWT_SECRET = os.environ["JWT_SECRET"]
EMERGENT_LLM_KEY = os.environ["EMERGENT_LLM_KEY"]

logger = logging.getLogger("lifeos")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/",
    )


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user.pop("_id", None)
        user.pop("password_hash", None)
        return user
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def clean(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class RegisterInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: Optional[str] = None


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class TaskInput(BaseModel):
    title: str
    notes: Optional[str] = ""
    priority: Literal["low", "medium", "high"] = "medium"
    category: str = "general"
    due_date: Optional[str] = None  # ISO date/datetime
    status: Literal["todo", "in_progress", "done"] = "todo"


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    notes: Optional[str] = None
    priority: Optional[Literal["low", "medium", "high"]] = None
    category: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[Literal["todo", "in_progress", "done"]] = None


class BillInput(BaseModel):
    name: str
    amount: float
    due_date: str
    frequency: Literal["once", "weekly", "monthly", "yearly"] = "monthly"
    category: str = "utilities"
    status: Literal["upcoming", "paid", "overdue"] = "upcoming"
    notes: Optional[str] = ""


class BillUpdate(BaseModel):
    name: Optional[str] = None
    amount: Optional[float] = None
    due_date: Optional[str] = None
    frequency: Optional[Literal["once", "weekly", "monthly", "yearly"]] = None
    category: Optional[str] = None
    status: Optional[Literal["upcoming", "paid", "overdue"]] = None
    notes: Optional[str] = None


class ExpenseInput(BaseModel):
    amount: float
    category: str = "misc"
    date: Optional[str] = None
    notes: Optional[str] = ""


class DocumentInput(BaseModel):
    name: str
    type: str = "id"  # id, insurance, contract, warranty, receipt
    expiry_date: Optional[str] = None
    notes: Optional[str] = ""
    file_url: Optional[str] = ""


class AppointmentInput(BaseModel):
    title: str
    location: Optional[str] = ""
    starts_at: str
    ends_at: Optional[str] = None
    notes: Optional[str] = ""


class HabitInput(BaseModel):
    name: str
    icon: Optional[str] = "target"
    target_days_per_week: int = 7


class HabitLogInput(BaseModel):
    date: str  # YYYY-MM-DD


class ShoppingItemInput(BaseModel):
    name: str
    quantity: int = 1
    checked: bool = False


class ChatInput(BaseModel):
    message: str


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
@api.post("/auth/register")
async def register(payload: RegisterInput, response: Response):
    email = payload.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "email": email,
        "name": payload.name or email.split("@")[0].title(),
        "password_hash": hash_password(payload.password),
        "created_at": now_iso(),
        "preferences": {"currency": "USD", "timezone": "UTC"},
    }
    await db.users.insert_one(doc)
    token = create_access_token(user_id, email)
    set_auth_cookie(response, token)
    return {"id": user_id, "email": email, "name": doc["name"], "token": token}


@api.post("/auth/login")
async def login(payload: LoginInput, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], email)
    set_auth_cookie(response, token)
    return {"id": user["id"], "email": email, "name": user.get("name"), "token": token}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user


# ---------------------------------------------------------------------------
# Tasks
# ---------------------------------------------------------------------------
@api.get("/tasks")
async def list_tasks(user=Depends(get_current_user)):
    items = await db.tasks.find({"user_id": user["id"]}).sort("created_at", -1).to_list(500)
    return [clean(i) for i in items]


@api.post("/tasks")
async def create_task(payload: TaskInput, user=Depends(get_current_user)):
    doc = payload.model_dump()
    doc.update({"id": str(uuid.uuid4()), "user_id": user["id"], "created_at": now_iso(), "updated_at": now_iso()})
    await db.tasks.insert_one(doc.copy())
    return clean(doc)


@api.patch("/tasks/{task_id}")
async def update_task(task_id: str, payload: TaskUpdate, user=Depends(get_current_user)):
    changes = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not changes:
        raise HTTPException(status_code=400, detail="No changes")
    changes["updated_at"] = now_iso()
    res = await db.tasks.update_one({"id": task_id, "user_id": user["id"]}, {"$set": changes})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Task not found")
    doc = await db.tasks.find_one({"id": task_id})
    return clean(doc)


@api.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user=Depends(get_current_user)):
    res = await db.tasks.delete_one({"id": task_id, "user_id": user["id"]})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Bills
# ---------------------------------------------------------------------------
@api.get("/bills")
async def list_bills(user=Depends(get_current_user)):
    items = await db.bills.find({"user_id": user["id"]}).sort("due_date", 1).to_list(500)
    return [clean(i) for i in items]


@api.post("/bills")
async def create_bill(payload: BillInput, user=Depends(get_current_user)):
    doc = payload.model_dump()
    doc.update({"id": str(uuid.uuid4()), "user_id": user["id"], "created_at": now_iso()})
    await db.bills.insert_one(doc.copy())
    return clean(doc)


@api.patch("/bills/{bill_id}")
async def update_bill(bill_id: str, payload: BillUpdate, user=Depends(get_current_user)):
    changes = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not changes:
        raise HTTPException(status_code=400, detail="No changes")
    res = await db.bills.update_one({"id": bill_id, "user_id": user["id"]}, {"$set": changes})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Bill not found")
    doc = await db.bills.find_one({"id": bill_id})
    return clean(doc)


@api.delete("/bills/{bill_id}")
async def delete_bill(bill_id: str, user=Depends(get_current_user)):
    res = await db.bills.delete_one({"id": bill_id, "user_id": user["id"]})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Bill not found")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Expenses
# ---------------------------------------------------------------------------
@api.get("/expenses")
async def list_expenses(user=Depends(get_current_user)):
    items = await db.expenses.find({"user_id": user["id"]}).sort("date", -1).to_list(1000)
    return [clean(i) for i in items]


@api.post("/expenses")
async def create_expense(payload: ExpenseInput, user=Depends(get_current_user)):
    doc = payload.model_dump()
    doc["date"] = doc.get("date") or now_iso()
    doc.update({"id": str(uuid.uuid4()), "user_id": user["id"], "created_at": now_iso()})
    await db.expenses.insert_one(doc.copy())
    return clean(doc)


@api.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, user=Depends(get_current_user)):
    res = await db.expenses.delete_one({"id": expense_id, "user_id": user["id"]})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Documents (with mock OCR expiry detection)
# ---------------------------------------------------------------------------
@api.get("/documents")
async def list_documents(user=Depends(get_current_user)):
    items = await db.documents.find({"user_id": user["id"]}).sort("expiry_date", 1).to_list(500)
    return [clean(i) for i in items]


@api.post("/documents")
async def create_document(payload: DocumentInput, user=Depends(get_current_user)):
    doc = payload.model_dump()
    # Mock OCR: if no expiry, invent a plausible one 6 months out for id/insurance
    if not doc.get("expiry_date") and doc["type"] in ("id", "insurance", "warranty"):
        doc["expiry_date"] = (datetime.now(timezone.utc) + timedelta(days=180)).date().isoformat()
    doc.update({"id": str(uuid.uuid4()), "user_id": user["id"], "created_at": now_iso()})
    await db.documents.insert_one(doc.copy())
    return clean(doc)


@api.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, user=Depends(get_current_user)):
    res = await db.documents.delete_one({"id": doc_id, "user_id": user["id"]})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Appointments
# ---------------------------------------------------------------------------
@api.get("/appointments")
async def list_appointments(user=Depends(get_current_user)):
    items = await db.appointments.find({"user_id": user["id"]}).sort("starts_at", 1).to_list(500)
    return [clean(i) for i in items]


@api.post("/appointments")
async def create_appointment(payload: AppointmentInput, user=Depends(get_current_user)):
    doc = payload.model_dump()
    doc.update({"id": str(uuid.uuid4()), "user_id": user["id"], "created_at": now_iso()})
    await db.appointments.insert_one(doc.copy())
    return clean(doc)


@api.delete("/appointments/{apt_id}")
async def delete_appointment(apt_id: str, user=Depends(get_current_user)):
    res = await db.appointments.delete_one({"id": apt_id, "user_id": user["id"]})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Habits
# ---------------------------------------------------------------------------
@api.get("/habits")
async def list_habits(user=Depends(get_current_user)):
    items = await db.habits.find({"user_id": user["id"]}).sort("created_at", 1).to_list(200)
    return [clean(i) for i in items]


@api.post("/habits")
async def create_habit(payload: HabitInput, user=Depends(get_current_user)):
    doc = payload.model_dump()
    doc.update({"id": str(uuid.uuid4()), "user_id": user["id"], "created_at": now_iso(), "logs": []})
    await db.habits.insert_one(doc.copy())
    return clean(doc)


@api.post("/habits/{habit_id}/log")
async def log_habit(habit_id: str, payload: HabitLogInput, user=Depends(get_current_user)):
    habit = await db.habits.find_one({"id": habit_id, "user_id": user["id"]})
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    logs = set(habit.get("logs", []))
    if payload.date in logs:
        logs.remove(payload.date)
    else:
        logs.add(payload.date)
    await db.habits.update_one({"id": habit_id}, {"$set": {"logs": sorted(list(logs))}})
    doc = await db.habits.find_one({"id": habit_id})
    return clean(doc)


@api.delete("/habits/{habit_id}")
async def delete_habit(habit_id: str, user=Depends(get_current_user)):
    res = await db.habits.delete_one({"id": habit_id, "user_id": user["id"]})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Habit not found")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Shopping
# ---------------------------------------------------------------------------
@api.get("/shopping")
async def list_shopping(user=Depends(get_current_user)):
    items = await db.shopping.find({"user_id": user["id"]}).sort("created_at", -1).to_list(500)
    return [clean(i) for i in items]


@api.post("/shopping")
async def create_shopping(payload: ShoppingItemInput, user=Depends(get_current_user)):
    doc = payload.model_dump()
    doc.update({"id": str(uuid.uuid4()), "user_id": user["id"], "created_at": now_iso()})
    await db.shopping.insert_one(doc.copy())
    return clean(doc)


@api.patch("/shopping/{item_id}")
async def toggle_shopping(item_id: str, user=Depends(get_current_user)):
    item = await db.shopping.find_one({"id": item_id, "user_id": user["id"]})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    await db.shopping.update_one({"id": item_id}, {"$set": {"checked": not item.get("checked", False)}})
    doc = await db.shopping.find_one({"id": item_id})
    return clean(doc)


@api.delete("/shopping/{item_id}")
async def delete_shopping(item_id: str, user=Depends(get_current_user)):
    res = await db.shopping.delete_one({"id": item_id, "user_id": user["id"]})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Dashboard summary + global search
# ---------------------------------------------------------------------------
@api.get("/dashboard")
async def dashboard(user=Depends(get_current_user)):
    uid = user["id"]
    today = datetime.now(timezone.utc).date()
    month_start = today.replace(day=1).isoformat()

    tasks = await db.tasks.find({"user_id": uid}).to_list(500)
    bills = await db.bills.find({"user_id": uid}).to_list(500)
    expenses = await db.expenses.find({"user_id": uid}).to_list(1000)
    appts = await db.appointments.find({"user_id": uid}).sort("starts_at", 1).to_list(500)
    habits = await db.habits.find({"user_id": uid}).to_list(500)
    docs = await db.documents.find({"user_id": uid}).to_list(500)

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
            if datetime.fromisoformat(a["starts_at"].replace("Z", "+00:00")).astimezone(timezone.utc) >= datetime.now(timezone.utc):
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
            edate = datetime.fromisoformat(exp).date() if len(exp) == 10 else datetime.fromisoformat(exp.replace("Z", "+00:00")).date()
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


@api.get("/search")
async def search(q: str, user=Depends(get_current_user)):
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
        docs = await db[coll].find(query).to_list(20)
        for d in docs:
            results.append({"kind": kind, **clean(d)})
    return {"results": results}


# ---------------------------------------------------------------------------
# AI Assistant (Claude Sonnet 4.6, streaming)
# ---------------------------------------------------------------------------
async def build_user_context(uid: str) -> str:
    tasks = await db.tasks.find({"user_id": uid, "status": {"$ne": "done"}}).to_list(30)
    bills = await db.bills.find({"user_id": uid, "status": {"$ne": "paid"}}).to_list(20)
    appts = await db.appointments.find({"user_id": uid}).sort("starts_at", 1).to_list(10)
    habits = await db.habits.find({"user_id": uid}).to_list(20)

    def brief(items, keys):
        return [{k: it.get(k) for k in keys} for it in items]

    context = {
        "open_tasks": brief(tasks, ["title", "priority", "due_date", "category"]),
        "unpaid_bills": brief(bills, ["name", "amount", "due_date", "frequency"]),
        "next_appointments": brief(appts, ["title", "starts_at", "location"]),
        "habits": brief(habits, ["name", "target_days_per_week"]),
    }
    return json.dumps(context, default=str)


@api.post("/ai/chat")
async def ai_chat(payload: ChatInput, user=Depends(get_current_user)):
    msg = payload.message.strip()
    if not msg:
        raise HTTPException(status_code=400, detail="Message required")
    now = now_iso()
    await db.ai_messages.insert_one({"id": str(uuid.uuid4()), "user_id": user["id"], "role": "user", "content": msg, "created_at": now})
    context = await build_user_context(user["id"])
    system = (
        "You are LifeOS, a warm, practical personal life assistant. "
        "You help the user plan their day, manage tasks, bills, expenses, appointments, and habits. "
        "Keep answers concise, actionable, and mobile-friendly (short paragraphs, use bullets when helpful). "
        "You always ground advice in the user's current data provided below.\n\n"
        f"USER DATA (JSON): {context}"
    )

    async def stream():
        answer = ""
        try:
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=f"lifeos-{user['id']}",
                system_message=system,
            ).with_model("anthropic", "claude-sonnet-4-6")
            async for ev in chat.stream_message(UserMessage(text=msg)):
                if isinstance(ev, TextDelta):
                    answer += ev.content
                    yield f"data: {json.dumps({'type': 'delta', 'content': ev.content})}\n\n"
                elif isinstance(ev, StreamDone):
                    break
        except Exception as e:
            logger.exception("AI chat failed")
            answer = answer or "The assistant is temporarily unavailable. Please try again."
            yield f"data: {json.dumps({'type': 'error', 'content': answer, 'detail': str(e)})}\n\n"
        await db.ai_messages.insert_one({"id": str(uuid.uuid4()), "user_id": user["id"], "role": "assistant", "content": answer, "created_at": now_iso()})
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@api.get("/ai/messages")
async def ai_messages(user=Depends(get_current_user)):
    items = await db.ai_messages.find({"user_id": user["id"]}).sort("created_at", 1).to_list(200)
    return [clean(i) for i in items]


@api.post("/ai/plan-day")
async def plan_day(user=Depends(get_current_user)):
    context = await build_user_context(user["id"])
    system = (
        "You are LifeOS. Create a focused day plan for the user based on their data. "
        "Return ONLY valid JSON matching this schema exactly and nothing else: "
        '{"summary": "one short paragraph", "focus": ["3-5 short focus items"], '
        '"schedule": [{"time":"HH:MM","task":"..."}], '
        '"reminders": ["short reminder strings"]}'
    )
    prompt = (
        "Build my ideal plan for today. Prioritize what's due today, "
        "critical bills within 5 days, and the most impactful open tasks. "
        f"USER DATA: {context}"
    )
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"lifeos-plan-{user['id']}-{now_iso()}",
            system_message=system,
        ).with_model("anthropic", "claude-sonnet-4-6")
        text = ""
        async for ev in chat.stream_message(UserMessage(text=prompt)):
            if isinstance(ev, TextDelta):
                text += ev.content
            elif isinstance(ev, StreamDone):
                break
        # Extract JSON block
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1:
            try:
                return json.loads(text[start : end + 1])
            except Exception:
                pass
        return {"summary": text.strip() or "Here is your day plan.", "focus": [], "schedule": [], "reminders": []}
    except Exception as e:
        logger.exception("plan-day failed")
        raise HTTPException(status_code=502, detail=f"Assistant unavailable: {e}")


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
DEMO_EMAIL = os.environ.get("ADMIN_EMAIL", "demo@lifeos.app")
DEMO_PASSWORD = os.environ.get("ADMIN_PASSWORD", "lifeos123")


async def seed_demo():
    await db.users.create_index("email", unique=True)
    for coll in ("tasks", "bills", "expenses", "documents", "appointments", "habits", "shopping", "ai_messages"):
        await db[coll].create_index("user_id")

    existing = await db.users.find_one({"email": DEMO_EMAIL})
    if existing:
        # Refresh password if env changed
        updates = {}
        if not verify_password(DEMO_PASSWORD, existing.get("password_hash", "")):
            updates["password_hash"] = hash_password(DEMO_PASSWORD)
        if existing.get("name") != "Riya Gope":
            updates["name"] = "Riya Gope"
        if updates:
            await db.users.update_one({"email": DEMO_EMAIL}, {"$set": updates})
        return

    uid = str(uuid.uuid4())
    await db.users.insert_one({
        "id": uid,
        "email": DEMO_EMAIL,
        "name": "Riya Gope",
        "password_hash": hash_password(DEMO_PASSWORD),
        "created_at": now_iso(),
        "preferences": {"currency": "USD", "timezone": "UTC"},
    })

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
        await db.tasks.insert_one({**t, "id": str(uuid.uuid4()), "user_id": uid, "notes": "", "created_at": now_iso(), "updated_at": now_iso()})

    bills = [
        {"name": "Rent", "amount": 1850.0, "due_date": d(2), "frequency": "monthly", "category": "housing", "status": "upcoming"},
        {"name": "Electric bill", "amount": 92.4, "due_date": d(5), "frequency": "monthly", "category": "utilities", "status": "upcoming"},
        {"name": "Netflix", "amount": 15.99, "due_date": d(9), "frequency": "monthly", "category": "subscriptions", "status": "upcoming"},
        {"name": "Car insurance", "amount": 128.0, "due_date": d(14), "frequency": "monthly", "category": "insurance", "status": "upcoming"},
        {"name": "Internet", "amount": 65.0, "due_date": d(-2), "frequency": "monthly", "category": "utilities", "status": "paid"},
    ]
    for b in bills:
        await db.bills.insert_one({**b, "id": str(uuid.uuid4()), "user_id": uid, "notes": "", "created_at": now_iso()})

    expenses = [
        {"amount": 42.15, "category": "groceries", "date": d(-1), "notes": "Trader Joe's"},
        {"amount": 12.5, "category": "food", "date": d(-1), "notes": "Coffee + pastry"},
        {"amount": 89.9, "category": "shopping", "date": d(-3), "notes": "New running shoes"},
        {"amount": 34.0, "category": "transport", "date": d(-4), "notes": "Uber to airport"},
        {"amount": 18.75, "category": "food", "date": d(-6), "notes": "Ramen dinner"},
        {"amount": 220.0, "category": "utilities", "date": d(-10), "notes": "Water + gas"},
    ]
    for e in expenses:
        await db.expenses.insert_one({**e, "id": str(uuid.uuid4()), "user_id": uid, "created_at": now_iso()})

    appts = [
        {"title": "Team standup", "location": "Zoom", "starts_at": (datetime.now(timezone.utc) + timedelta(hours=3)).isoformat(), "notes": ""},
        {"title": "Doctor - annual checkup", "location": "Downtown Clinic", "starts_at": (datetime.now(timezone.utc) + timedelta(days=2, hours=2)).isoformat(), "notes": "Bring insurance card"},
        {"title": "Dinner with Sam", "location": "Osteria 21", "starts_at": (datetime.now(timezone.utc) + timedelta(days=4, hours=6)).isoformat(), "notes": ""},
    ]
    for a in appts:
        await db.appointments.insert_one({**a, "id": str(uuid.uuid4()), "user_id": uid, "created_at": now_iso()})

    habits = [
        {"name": "Morning walk", "icon": "footprints", "target_days_per_week": 7},
        {"name": "Read 20 minutes", "icon": "book-open", "target_days_per_week": 5},
        {"name": "No sugar", "icon": "leaf", "target_days_per_week": 5},
    ]
    for h in habits:
        logs = [d(-i) for i in range(0, 5)]
        await db.habits.insert_one({**h, "id": str(uuid.uuid4()), "user_id": uid, "created_at": now_iso(), "logs": logs})

    docs = [
        {"name": "Passport", "type": "id", "expiry_date": d(320), "notes": "Renew online"},
        {"name": "Car insurance policy", "type": "insurance", "expiry_date": d(45), "notes": "Auto-renew enabled"},
        {"name": "MacBook AppleCare", "type": "warranty", "expiry_date": d(200), "notes": ""},
    ]
    for dc in docs:
        await db.documents.insert_one({**dc, "id": str(uuid.uuid4()), "user_id": uid, "file_url": "", "created_at": now_iso()})

    shopping = [
        {"name": "Oat milk", "quantity": 2, "checked": False},
        {"name": "Bananas", "quantity": 6, "checked": False},
        {"name": "Laundry detergent", "quantity": 1, "checked": True},
    ]
    for s in shopping:
        await db.shopping.insert_one({**s, "id": str(uuid.uuid4()), "user_id": uid, "created_at": now_iso()})

    logger.info(f"Seeded demo user {DEMO_EMAIL}")


@app.on_event("startup")
async def on_startup():
    try:
        await seed_demo()
    except Exception as e:
        logger.exception(f"Seeding failed: {e}")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
@api.get("/")
async def root():
    return {"app": "LifeOS", "status": "ok"}


app.include_router(api)

_frontend = os.environ.get("FRONTEND_URL", "").strip()
_allowed = [o for o in [_frontend, "http://localhost:3000"] if o]
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_allowed,
    allow_methods=["*"],
    allow_headers=["*"],
)
