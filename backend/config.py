"""Configuration and environment settings for LifeOS backend."""
import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent
load_dotenv(ROOT_DIR / ".env")


class Settings:
    MONGO_URL: str = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    DB_NAME: str = os.environ.get("DB_NAME", "lifeos_db")
    JWT_SECRET: str = os.environ.get("JWT_SECRET", "lifeos_dev_secret_key_change_in_production")
    JWT_ALGO: str = "HS256"
    EMERGENT_LLM_KEY: str = os.environ.get("EMERGENT_LLM_KEY", "")
    ADMIN_EMAIL: str = os.environ.get("ADMIN_EMAIL", "demo@lifeos.app")
    ADMIN_PASSWORD: str = os.environ.get("ADMIN_PASSWORD", "lifeos123")
    FRONTEND_URL: str = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    CORS_ORIGINS_RAW: str = os.environ.get("CORS_ORIGINS", "*")

    @property
    def cors_origins(self) -> List[str]:
        if self.CORS_ORIGINS_RAW == "*":
            return ["*"]
        origins = [o.strip() for o in self.CORS_ORIGINS_RAW.split(",") if o.strip()]
        if self.FRONTEND_URL and self.FRONTEND_URL not in origins:
            origins.append(self.FRONTEND_URL)
        if "http://localhost:3000" not in origins:
            origins.append("http://localhost:3000")
        return origins


settings = Settings()
