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
