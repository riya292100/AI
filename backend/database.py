"""Database connection and helpers for MongoDB via Motor."""
from typing import Any, Dict
from motor.motor_asyncio import AsyncIOMotorClient
from backend.config import settings

client: AsyncIOMotorClient = AsyncIOMotorClient(settings.MONGO_URL)
db = client[settings.DB_NAME]


def clean(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Remove internal MongoDB _id field for clean API serialization."""
    if doc is not None and isinstance(doc, dict):
        doc.pop("_id", None)
    return doc


def set_db(mock_db):
    """Override database instance (used in automated testing)."""
    global db
    db = mock_db
