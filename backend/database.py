"""Database connection and helpers for MongoDB via Motor."""
import os
from typing import Any, Dict
from backend.config import settings
from backend.logger import logger


def _init_db():
    mongo_url = settings.MONGO_URL
    use_mock = os.environ.get("USE_MOCK_DB", "").lower() in ("1", "true", "yes")
    if not use_mock:
        try:
            from pymongo import MongoClient
            from motor.motor_asyncio import AsyncIOMotorClient

            test_client = MongoClient(mongo_url, serverSelectionTimeoutMS=1000)
            test_client.admin.command("ping")
            test_client.close()
            logger.info(f"Connected to live MongoDB at {mongo_url}")
            c = AsyncIOMotorClient(mongo_url)
            return c, c[settings.DB_NAME]
        except Exception as e:
            logger.warning(
                f"Live MongoDB server at {mongo_url} is unreachable ({type(e).__name__}). Using in-memory database for local execution."
            )

    from mongomock_motor import AsyncMongoMockClient

    c = AsyncMongoMockClient()
    return c, c[settings.DB_NAME]


client, db = _init_db()


def clean(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Remove internal MongoDB _id field for clean API serialization."""
    if doc is not None and isinstance(doc, dict):
        doc.pop("_id", None)
    return doc


def set_db(mock_db):
    """Override database instance (used in automated testing)."""
    global db
    db = mock_db
