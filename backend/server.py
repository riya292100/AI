from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from fastapi.responses import StreamingResponse
import json
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class ChatRequest(BaseModel):
    message: str

class TaskCreate(BaseModel):
    title: str
    priority: str = "medium"

class TaskUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None

class NoteCreate(BaseModel):
    content: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "NexusAI workspace online"}

@api_router.get("/workspace")
async def get_workspace():
    tasks = await db.tasks.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    notes = await db.notes.find({}, {"_id": 0}).sort("updated_at", -1).to_list(20)
    messages = await db.messages.find({}, {"_id": 0}).sort("created_at", 1).to_list(100)
    activity = await db.activity.find({}, {"_id": 0}).sort("created_at", -1).to_list(20)
    return {"tasks": tasks, "notes": notes, "messages": messages, "activity": activity}

@api_router.post("/tasks")
async def create_task(input: TaskCreate):
    task = {"id": str(uuid.uuid4()), "title": input.title, "priority": input.priority, "status": "queued", "created_at": datetime.now(timezone.utc).isoformat()}
    await db.tasks.insert_one(task.copy())
    return task

@api_router.patch("/tasks/{task_id}")
async def update_task(task_id: str, input: TaskUpdate):
    changes = {key: value for key, value in input.model_dump().items() if value is not None}
    if not changes:
        raise HTTPException(status_code=400, detail="No changes supplied")
    result = await db.tasks.update_one({"id": task_id}, {"$set": changes})
    if not result.matched_count:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"id": task_id, **changes}

@api_router.post("/notes")
async def save_note(input: NoteCreate):
    note = {"id": str(uuid.uuid4()), "content": input.content, "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.notes.insert_one(note.copy())
    return note

@api_router.post("/chat/stream")
async def stream_chat(input: ChatRequest):
    if not input.message.strip():
        raise HTTPException(status_code=400, detail="Message is required")
    now = datetime.now(timezone.utc).isoformat()
    user_doc = {"id": str(uuid.uuid4()), "role": "user", "content": input.message.strip(), "created_at": now}
    await db.messages.insert_one(user_doc.copy())
    await db.activity.insert_one({"id": str(uuid.uuid4()), "label": "New instruction received", "detail": input.message[:80], "created_at": now, "kind": "message"})

    async def event_stream():
        answer = ""
        try:
            chat = LlmChat(api_key=os.environ["EMERGENT_LLM_KEY"], session_id="nexus-workspace", system_message="You are Nexus, an autonomous personal work agent. Be concise, practical, and proactive. When a request implies work, outline the next steps and ask only for essential approval. Use plain text with short paragraphs.").with_model("openai", "gpt-5.4")
            async for event in chat.stream_message(UserMessage(text=input.message)):
                if isinstance(event, TextDelta):
                    answer += event.content
                    yield f"data: {json.dumps({'type': 'delta', 'content': event.content})}\n\n"
                elif isinstance(event, StreamDone):
                    break
        except Exception as exc:
            logging.exception("LLM stream failed")
            answer = "I’m ready, but the reasoning service is temporarily unavailable. Please try again in a moment."
            yield f"data: {json.dumps({'type': 'error', 'content': answer, 'detail': str(exc)})}\n\n"
        await db.messages.insert_one({"id": str(uuid.uuid4()), "role": "assistant", "content": answer, "created_at": datetime.now(timezone.utc).isoformat()})
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
    return StreamingResponse(event_stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()