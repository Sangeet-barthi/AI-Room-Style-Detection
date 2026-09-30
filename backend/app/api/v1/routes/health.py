"""Liveness, readiness and capability endpoints."""
from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import text

from app.ai.schemas import ROOM_TYPES, STYLE_TAXONOMY
from app.api.deps import DbSession
from app.core.config import settings
from app.schemas.analysis import CapabilitiesResponse
from app.services.budget import BUDGET_TIERS

router = APIRouter(tags=["System"])


@router.get("/health", summary="Liveness probe", description="Returns 200 while the process is running.")
async def health() -> dict[str, str]:
    return {"status": "ok", "app": settings.app_name, "environment": settings.app_env}


@router.get(
    "/ready",
    summary="Readiness probe",
    description="Verifies the database connection before reporting the service ready.",
)
async def ready(session: DbSession) -> dict[str, object]:
    try:
        await session.execute(text("SELECT 1"))
        database_ok = True
    except Exception:
        database_ok = False
    return {
        "status": "ready" if database_ok else "degraded",
        "database": database_ok,
        "vision_configured": settings.vision_enabled,
    }


@router.get(
    "/capabilities",
    response_model=CapabilitiesResponse,
    summary="Runtime capabilities",
    description=(
        "Tells the frontend which optional features are configured, without exposing "
        "any secret values. Used to show accurate empty states and warnings."
    ),
)
async def capabilities() -> CapabilitiesResponse:
    return CapabilitiesResponse(
        vision_enabled=settings.vision_enabled,
        vision_model=settings.gemini_model,
        image_generation_enabled=(
            settings.pixazo_image_provider_enabled and bool(settings.pixazo_api_key)
        ),
        image_generation_provider=settings.image_generation_provider,
        demo_mode=settings.demo_mode,
        max_upload_mb=settings.max_upload_mb,
        supported_styles=list(STYLE_TAXONOMY),
        supported_room_types=list(ROOM_TYPES),
        budget_tiers=list(BUDGET_TIERS),
    )
