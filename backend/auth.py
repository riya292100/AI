"""Authentication and authorization utilities for LifeOS."""
import bcrypt
import jwt as pyjwt
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from fastapi import Request, Response, HTTPException

from backend.config import settings
from backend import database


def now_iso() -> str:
    """Return current UTC time in ISO 8601 format."""
    return datetime.now(timezone.utc).isoformat()


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plain password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str, days: int = 7) -> str:
    """Create a signed JWT access token."""
    payload = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(days=days),
    }
    return pyjwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGO)


def set_auth_cookie(response: Response, token: str) -> None:
    """Set the HttpOnly access_token cookie."""
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/",
    )


async def get_current_user(request: Request) -> Dict[str, Any]:
    """FastAPI dependency to extract and validate the authenticated user."""
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = pyjwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGO])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await database.db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user.pop("_id", None)
        user.pop("password_hash", None)
        return user
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


LOCK_MAX_ATTEMPTS = 5
LOCK_WINDOW_MIN = 15


async def check_login_lockout(email: str, ip: str) -> Optional[int]:
    """Return seconds until unlock if user/IP is locked out, else None."""
    ident = f"{ip}:{email}"
    since = datetime.now(timezone.utc) - timedelta(minutes=LOCK_WINDOW_MIN)
    count = await database.db.login_attempts.count_documents(
        {"identifier": ident, "at": {"$gte": since.isoformat()}}
    )
    if count >= LOCK_MAX_ATTEMPTS:
        first = (
            await database.db.login_attempts.find(
                {"identifier": ident, "at": {"$gte": since.isoformat()}}
            )
            .sort("at", 1)
            .limit(1)
            .to_list(1)
        )
        if first:
            unlock_at = datetime.fromisoformat(first[0]["at"]) + timedelta(
                minutes=LOCK_WINDOW_MIN
            )
            secs = int((unlock_at - datetime.now(timezone.utc)).total_seconds())
            return max(secs, 1)
        return LOCK_WINDOW_MIN * 60
    return None
