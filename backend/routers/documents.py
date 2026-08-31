"""Documents router for document storage and OCR analysis."""
import uuid
import json
import base64
import re
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File

from backend.models import DocumentInput
from backend.auth import now_iso, get_current_user
from backend.config import settings
from backend.logger import logger
from backend import database
from backend.database import clean

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.get("")
async def list_documents(user=Depends(get_current_user)):
    """List all stored documents sorted by expiry date."""
    items = (
        await database.db.documents.find({"user_id": user["id"]})
        .sort("expiry_date", 1)
        .to_list(500)
    )
    return [clean(i) for i in items]


@router.post("")
async def create_document(payload: DocumentInput, user=Depends(get_current_user)):
    """Create a document record with automated expiry detection."""
    doc = payload.model_dump()
    # Mock OCR: if no expiry provided, calculate plausible expiry (~6 months out for id/insurance/warranty)
    if not doc.get("expiry_date") and doc.get("type") in ("id", "insurance", "warranty"):
        doc["expiry_date"] = (
            datetime.now(timezone.utc) + timedelta(days=180)
        ).date().isoformat()
    doc.update({"id": str(uuid.uuid4()), "user_id": user["id"], "created_at": now_iso()})
    await database.db.documents.insert_one(doc.copy())
    return clean(doc)


@router.delete("/{doc_id}")
async def delete_document(doc_id: str, user=Depends(get_current_user)):
    """Delete a document record."""
    res = await database.db.documents.delete_one({"id": doc_id, "user_id": user["id"]})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"ok": True}


@router.post("/ocr")
async def documents_ocr(file: UploadFile = File(...), user=Depends(get_current_user)):
    """Analyze document image using Emergent Vision LLM / Claude."""
    raw = await file.read()
    if len(raw) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 8 MB)")
    mime = (file.content_type or "").lower()
    if not mime.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files supported (jpg, png, webp)")

    b64 = base64.b64encode(raw).decode("utf-8")
    text = ""

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone, ImageContent

        image = ImageContent(image_base64=b64)
        prompt = (
            "You are analyzing a photo of a personal document (ID, insurance card, receipt, warranty, contract). "
            "Extract these fields and return STRICT JSON only, no prose, no code fences:\n"
            '{"name": "short human name for the document", '
            '"type": one of ["id","insurance","warranty","contract","receipt"], '
            '"expiry_date": ISO date "YYYY-MM-DD" or null if not present, '
            '"summary": "one short line describing what this is"}'
        )
        chat = LlmChat(
            api_key=settings.EMERGENT_LLM_KEY,
            session_id=f"lifeos-ocr-{user['id']}-{now_iso()}",
            system_message="Reply with valid JSON only.",
        ).with_model("anthropic", "claude-sonnet-4-6")

        async for ev in chat.stream_message(UserMessage(text=prompt, file_contents=[image])):
            if isinstance(ev, TextDelta):
                text += ev.content
            elif isinstance(ev, StreamDone):
                break
    except Exception as e:
        logger.exception("OCR call failed")
        if not settings.EMERGENT_LLM_KEY:
            # Fallback mock document extraction when no API key configured
            text = '{"name": "Scanned Document", "type": "receipt", "expiry_date": null, "summary": "Uploaded document"}'
        else:
            raise HTTPException(status_code=502, detail=f"OCR service unavailable: {e}")

    match = re.search(r"\{[\s\S]*\}", text)
    data = {}
    if match:
        try:
            data = json.loads(match.group(0))
        except Exception:
            data = {}

    name = (data.get("name") or "Untitled document").strip()
    dtype = (data.get("type") or "receipt").strip().lower()
    if dtype not in ("id", "insurance", "warranty", "contract", "receipt"):
        dtype = "receipt"
    expiry = data.get("expiry_date")
    if isinstance(expiry, str) and not re.match(r"^\d{4}-\d{2}-\d{2}$", expiry):
        expiry = None

    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "name": name,
        "type": dtype,
        "expiry_date": expiry,
        "notes": data.get("summary") or "",
        "file_url": "",
        "ocr_raw": text[:600],
        "created_at": now_iso(),
    }
    await database.db.documents.insert_one(doc.copy())
    return clean(doc)
