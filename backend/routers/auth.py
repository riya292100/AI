"""Authentication router for user registration, login, logout, and profile."""
import uuid
from fastapi import APIRouter, HTTPException, Depends, Request, Response

from backend.models import RegisterInput, LoginInput
from backend.auth import (
    now_iso,
    hash_password,
    verify_password,
    create_access_token,
    set_auth_cookie,
    get_current_user,
    get_optional_current_user,
    check_login_lockout,
)
from backend import database

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register")
async def register(payload: RegisterInput, response: Response):
    """Register a new user account."""
    email = payload.email.lower()
    existing = await database.db.users.find_one({"email": email})
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
    await database.db.users.insert_one(doc)
    token = create_access_token(user_id, email)
    set_auth_cookie(response, token)
    return {"id": user_id, "email": email, "name": doc["name"], "token": token}


@router.post("/login")
async def login(payload: LoginInput, response: Response, request: Request):
    """Authenticate user with email and password."""
    email = payload.email.lower()
    ip = request.client.host if request.client else "unknown"
    ident = f"{ip}:{email}"
    locked = await check_login_lockout(email, ip)
    if locked:
        raise HTTPException(
            status_code=429,
            detail=f"Too many attempts. Try again in {locked // 60 + 1} min.",
        )
    user = await database.db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        await database.db.login_attempts.insert_one({"identifier": ident, "at": now_iso()})
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await database.db.login_attempts.delete_many({"identifier": ident})
    token = create_access_token(user["id"], email)
    set_auth_cookie(response, token)
    return {"id": user["id"], "email": email, "name": user.get("name"), "token": token}


@router.post("/logout")
async def logout(response: Response):
    """Log out user by clearing the auth cookie."""
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@router.get("/me")
async def me(user=Depends(get_current_user)):
    """Get the currently authenticated user's profile."""
    return user


@router.post("/sync")
async def sync_profile(request: Request, user=Depends(get_current_user)):
    """Sync and update user details from client or Firebase."""
    try:
        body = await request.json()
    except Exception:
        body = {}
    updates = {}
    if body.get("name"):
        updates["name"] = body["name"]
    if body.get("photo_url"):
        updates["photo_url"] = body["photo_url"]
    if updates:
        await database.db.users.update_one({"id": user["id"]}, {"$set": updates})
        user.update(updates)
    return user


@router.get("/session")
async def session(user=Depends(get_optional_current_user)):
    """Return current session user info or None for unauthenticated state."""
    if not user:
        return None
    name = user.get("name") or user.get("display_name") or user["email"].split("@")[0].title()
    is_demo = "demo" in user.get("email", "").lower() or user.get("auth_provider") == "demo"
    return {
        "id": user["id"],
        "email": user["email"],
        "display_name": name,
        "auth_provider": user.get("auth_provider", "local"),
        "auth_mode": "MOCK" if is_demo else "AUTHENTICATED",
    }


@router.post("/demo-login")
async def demo_login(response: Response):
    """Authenticate or provision the demo user and set an HttpOnly session cookie."""
    demo_email = "demo@lifeos.internal"
    demo_id = "demo-user-hardened"
    user = await database.db.users.find_one({"id": demo_id})
    if not user:
        user = {
            "id": demo_id,
            "email": demo_email,
            "name": "Demo User",
            "created_at": now_iso(),
            "preferences": {"currency": "USD", "timezone": "UTC"},
            "auth_provider": "demo",
        }
        await database.db.users.insert_one(user)

    token = create_access_token(demo_id, demo_email)
    set_auth_cookie(response, token)
    return {
        "id": demo_id,
        "email": demo_email,
        "display_name": user.get("name", "Demo User"),
        "auth_provider": "demo",
        "auth_mode": "MOCK",
        "token": token,
    }

