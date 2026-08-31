"""AI router for intelligent chat assistant and daily planning."""
import uuid
import json
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse

from backend.models import ChatInput
from backend.auth import now_iso, get_current_user
from backend.config import settings
from backend.logger import logger
from backend import database
from backend.database import clean

router = APIRouter(prefix="/ai", tags=["AI"])


async def build_user_context(uid: str) -> str:
    """Extract and summarize user context for LLM grounding."""
    tasks = (
        await database.db.tasks.find({"user_id": uid, "status": {"$ne": "done"}}).to_list(30)
    )
    bills = (
        await database.db.bills.find({"user_id": uid, "status": {"$ne": "paid"}}).to_list(20)
    )
    appts = (
        await database.db.appointments.find({"user_id": uid})
        .sort("starts_at", 1)
        .to_list(10)
    )
    habits = await database.db.habits.find({"user_id": uid}).to_list(20)

    def brief(items, keys):
        return [{k: it.get(k) for k in keys} for it in items]

    context = {
        "open_tasks": brief(tasks, ["title", "priority", "due_date", "category"]),
        "unpaid_bills": brief(bills, ["name", "amount", "due_date", "frequency"]),
        "next_appointments": brief(appts, ["title", "starts_at", "location"]),
        "habits": brief(habits, ["name", "target_days_per_week"]),
    }
    return json.dumps(context, default=str)


@router.post("/chat")
async def ai_chat(payload: ChatInput, user=Depends(get_current_user)):
    """Streaming AI conversational assistant grounded in user data."""
    msg = payload.message.strip()
    if not msg:
        raise HTTPException(status_code=400, detail="Message required")
    now = now_iso()
    await database.db.ai_messages.insert_one(
        {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "role": "user",
            "content": msg,
            "created_at": now,
        }
    )
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
            from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

            chat = LlmChat(
                api_key=settings.EMERGENT_LLM_KEY,
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
            if not settings.EMERGENT_LLM_KEY:
                mock_msg = f"LifeOS Assistant: Here is guidance for your request '{msg}'. Focus on your high priority tasks and upcoming bills."
                answer = mock_msg
                yield f"data: {json.dumps({'type': 'delta', 'content': mock_msg})}\n\n"
            else:
                answer = answer or "The assistant is temporarily unavailable. Please try again."
                yield f"data: {json.dumps({'type': 'error', 'content': answer, 'detail': str(e)})}\n\n"

        await database.db.ai_messages.insert_one(
            {
                "id": str(uuid.uuid4()),
                "user_id": user["id"],
                "role": "assistant",
                "content": answer,
                "created_at": now_iso(),
            }
        )
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/messages")
async def ai_messages(user=Depends(get_current_user)):
    """Retrieve chat message history for the authenticated user."""
    items = (
        await database.db.ai_messages.find({"user_id": user["id"]})
        .sort("created_at", 1)
        .to_list(200)
    )
    return [clean(i) for i in items]


@router.post("/plan-day")
async def plan_day(user=Depends(get_current_user)):
    """Generate structured daily plan tailored to user's tasks, bills, and schedule."""
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
        from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

        chat = LlmChat(
            api_key=settings.EMERGENT_LLM_KEY,
            session_id=f"lifeos-plan-{user['id']}-{now_iso()}",
            system_message=system,
        ).with_model("anthropic", "claude-sonnet-4-6")
        text = ""
        async for ev in chat.stream_message(UserMessage(text=prompt)):
            if isinstance(ev, TextDelta):
                text += ev.content
            elif isinstance(ev, StreamDone):
                break
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1:
            try:
                return json.loads(text[start : end + 1])
            except Exception:
                pass
        return {
            "summary": text.strip() or "Here is your plan for today.",
            "focus": ["Review priorities", "Complete tasks due today"],
            "schedule": [{"time": "09:00", "task": "Plan work session"}],
            "reminders": ["Stay hydrated"],
        }
    except Exception as e:
        logger.exception("plan-day failed")
        if not settings.EMERGENT_LLM_KEY:
            return {
                "summary": "Focus on high-priority items, upcoming bills, and healthy habits today.",
                "focus": ["Complete open tasks", "Check pending bills", "Review schedule"],
                "schedule": [
                    {"time": "09:00", "task": "Morning standup & high priority tasks"},
                    {"time": "14:00", "task": "Review bills and financial dashboard"},
                    {"time": "18:00", "task": "Habit check-in"},
                ],
                "reminders": ["Check due tasks", "Log completed habits"],
            }
        raise HTTPException(status_code=502, detail=f"Assistant unavailable: {e}")
