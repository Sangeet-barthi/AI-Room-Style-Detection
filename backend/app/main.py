"""FastAPI application entrypoint."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.api.v1.routes import health
from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.core.logging import (
    RequestContextMiddleware,
    SecurityHeadersMiddleware,
    configure_logging,
)

logger = logging.getLogger("app")

DESCRIPTION = """
**RoomStyle AI** turns a single room photograph into a design assessment.

The pipeline is deliberately split between the model and the backend:

* **Gemini vision through the Google GenAI SDK**, produces structured *visual
  observations* — room type, style evidence, furniture, materials, colours and
  qualitative lighting / ventilation / space signals.
* **A deterministic scoring engine in the backend** turns those observations into
  the 0–100 room-health numbers. The model never decides a score the user sees.
* **Recommendation and budget chains** produce actionable, costed suggestions, and a
  deterministic validator guarantees no package ever exceeds its budget.

No custom machine-learning model is trained. Every score is a *visual AI-assisted
assessment* derived from one photograph, not a professional survey.
"""


@asynccontextmanager
async def lifespan(app: FastAPI):  # type: ignore[no-untyped-def]
    configure_logging("DEBUG" if settings.debug else "INFO")
    settings.ensure_directories()
    logger.info(
        "Starting %s in %s mode (vision configured: %s)",
        settings.app_name,
        settings.app_env,
        settings.vision_enabled,
    )
    yield
    from app.db.session import engine

    await engine.dispose()
    logger.info("Shutdown complete")


def create_app() -> FastAPI:
    app = FastAPI(
        title=f"{settings.app_name} API",
        description=DESCRIPTION,
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        contact={"name": "RoomStyle AI"},
        license_info={"name": "MIT"},
        openapi_tags=[
            {"name": "Authentication", "description": "Registration, sign-in and JWT lifecycle."},
            {"name": "Analyses", "description": "Upload a room photo and read saved analyses."},
            {"name": "Makeover", "description": "Before/after concept visualizations."},
            {"name": "Reports", "description": "PDF report generation and download."},
            {"name": "System", "description": "Health, readiness and runtime capabilities."},
        ],
    )

    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
        expose_headers=["X-Request-ID", "Content-Disposition"],
    )

    register_exception_handlers(app)

    app.include_router(health.router)
    app.include_router(api_router, prefix=settings.api_v1_prefix)

    @app.get("/", include_in_schema=False)
    async def root() -> dict[str, str]:
        return {
            "name": settings.app_name,
            "docs": "/docs",
            "health": "/health",
            "api": settings.api_v1_prefix,
        }

    return app


app = create_app()
