"""Health and readiness check endpoints."""
from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/")
async def root():
    """Service status and health check."""
    return {"app": "LifeOS", "status": "ok"}


@router.get("/health")
async def health():
    """Detailed health check endpoint."""
    return {"status": "healthy", "service": "LifeOS API"}
