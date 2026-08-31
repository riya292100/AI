"""LifeOS Backend API Server."""
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, APIRouter, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from backend.config import settings
from backend.logger import logger
from backend.database import client
from backend.seed import seed_demo
from backend.routers import (
    health,
    auth,
    tasks,
    bills,
    expenses,
    documents,
    appointments,
    habits,
    shopping,
    budgets,
    reminders,
    dashboard,
    ai,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown events."""
    logger.info("Starting LifeOS API server...")
    try:
        await seed_demo()
    except Exception as e:
        logger.warning(f"Initial demo seeding skipped or failed: {e}")
    yield
    logger.info("Shutting down LifeOS API server...")
    client.close()


app = FastAPI(
    title="LifeOS API",
    description="Intelligent AI-Powered Personal Life Assistant Backend",
    version="1.0.0",
    lifespan=lifespan,
)

# Global Exception Handlers for structured JSON errors and error tracking
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    req_id = str(uuid.uuid4())
    logger.warning(
        f"HTTP {exc.status_code} error on {request.method} {request.url.path}: {exc.detail}",
        extra={"request_id": req_id, "path": request.url.path, "status_code": exc.status_code},
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail, "status_code": exc.status_code, "request_id": req_id},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    req_id = str(uuid.uuid4())
    logger.warning(
        f"Validation error on {request.method} {request.url.path}: {exc.errors()}",
        extra={"request_id": req_id, "path": request.url.path, "errors": exc.errors()},
    )
    return JSONResponse(
        status_code=422,
        content={"error": "Validation error", "detail": exc.errors(), "request_id": req_id},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    req_id = str(uuid.uuid4())
    logger.error(
        f"Unhandled server error on {request.method} {request.url.path}: {str(exc)}",
        exc_info=True,
        extra={"request_id": req_id, "path": request.url.path},
    )
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "request_id": req_id},
    )


# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Consolidated API Router
api = APIRouter(prefix="/api")
api.include_router(health.router)
api.include_router(auth.router)
api.include_router(tasks.router)
api.include_router(bills.router)
api.include_router(expenses.router)
api.include_router(documents.router)
api.include_router(appointments.router)
api.include_router(habits.router)
api.include_router(shopping.router)
api.include_router(budgets.router)
api.include_router(reminders.router)
api.include_router(dashboard.router)
api.include_router(ai.router)

app.include_router(api)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.server:app", host="0.0.0.0", port=8000, reload=True)
