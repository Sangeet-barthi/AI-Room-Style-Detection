"""API v1 router aggregation."""
from fastapi import APIRouter

from app.api.v1.routes import analyses, auth, makeover, reports

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(analyses.router)
api_router.include_router(makeover.router)
api_router.include_router(reports.analysis_router)
api_router.include_router(reports.report_router)
