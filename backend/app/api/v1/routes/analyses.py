"""Room analysis endpoints."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, File, Form, Query, Response, UploadFile, status

from app.api.deps import AnalysisServiceDep, CurrentUser
from app.api.v1.serializers import to_detail, to_recommendations, to_summary
from app.core.config import settings
from app.core.errors import NotFoundError, PayloadTooLargeError
from app.core.rate_limit import analysis_rate_limit
from app.schemas.analysis import (
    AnalysisDetail,
    DashboardStats,
    ErrorResponse,
    PaginatedAnalyses,
    RecommendationsResponse,
)
from app.storage import get_storage

router = APIRouter(prefix="/analyses", tags=["Analyses"])

_ERRORS = {
    401: {"model": ErrorResponse, "description": "Authentication required"},
    404: {"model": ErrorResponse, "description": "Analysis not found"},
    413: {"model": ErrorResponse, "description": "Image exceeds the upload limit"},
    415: {"model": ErrorResponse, "description": "Unsupported image format"},
    422: {"model": ErrorResponse, "description": "Image failed validation"},
    429: {"model": ErrorResponse, "description": "Analysis rate limit reached"},
    503: {"model": ErrorResponse, "description": "AI provider unavailable or out of quota"},
}


@router.post(
    "",
    response_model=AnalysisDetail,
    status_code=status.HTTP_201_CREATED,
    responses=_ERRORS,
    summary="Analyse a room photograph",
    description=(
        "Uploads a room photograph and runs the full pipeline: server-side image "
        "validation and normalisation, Google GenAI Gemini vision analysis, "
        "the deterministic room-health scoring engine, and the recommendation and "
        "budget chains. The result is persisted so re-opening the analysis never "
        "re-runs the model.\n\n"
        "Accepts JPEG, PNG and WEBP up to the configured size limit."
    ),
    dependencies=[Depends(analysis_rate_limit)],
)
async def create_analysis(
    user: CurrentUser,
    service: AnalysisServiceDep,
    image: UploadFile = File(..., description="Room photograph (JPEG, PNG or WEBP)"),
    title: str | None = Form(None, description="Optional label for this analysis"),
) -> AnalysisDetail:
    raw = await image.read()
    if len(raw) > settings.max_upload_bytes:
        raise PayloadTooLargeError(
            f"Images must be {settings.max_upload_mb} MB or smaller."
        )
    record = await service.create_analysis(
        user,
        raw,
        filename=image.filename,
        declared_mime=image.content_type,
        title=title,
    )
    return to_detail(record)


@router.get(
    "",
    response_model=PaginatedAnalyses,
    responses=_ERRORS,
    summary="List your analyses",
    description=(
        "Returns the authenticated user's analyses, newest first. Supports pagination "
        "and filtering by room type, detected style and title search."
    ),
)
async def list_analyses(
    user: CurrentUser,
    service: AnalysisServiceDep,
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=50),
    room_type: str | None = Query(None),
    style: str | None = Query(None),
    search: str | None = Query(None, max_length=120),
) -> PaginatedAnalyses:
    rows, total = await service.list_for_user(
        user, page=page, page_size=page_size, room_type=room_type, style=style, search=search
    )
    return PaginatedAnalyses(
        items=[to_summary(row) for row in rows],
        total=total,
        page=page,
        page_size=page_size,
        has_more=page * page_size < total,
    )


@router.get(
    "/stats",
    response_model=DashboardStats,
    responses=_ERRORS,
    summary="Dashboard statistics",
    description="Aggregate counts, average room-health score and chart data for the dashboard.",
)
async def stats(user: CurrentUser, service: AnalysisServiceDep) -> DashboardStats:
    data = await service.stats_for_user(user)
    rows, _ = await service.list_for_user(user, page=1, page_size=1)
    return DashboardStats(**data, latest=to_summary(rows[0]) if rows else None)


@router.get(
    "/{analysis_id}",
    response_model=AnalysisDetail,
    responses=_ERRORS,
    summary="Get a saved analysis",
    description=(
        "Returns a persisted analysis with its scores, recommendations, budget "
        "packages, images and any makeover visualizations. No AI call is made."
    ),
)
async def get_analysis(
    analysis_id: uuid.UUID, user: CurrentUser, service: AnalysisServiceDep
) -> AnalysisDetail:
    record = await service.get_owned(user, analysis_id)
    return to_detail(record)


@router.get(
    "/{analysis_id}/recommendations",
    response_model=RecommendationsResponse,
    responses=_ERRORS,
    summary="Get recommendations",
    description="Returns the stored improvement plan and the three budget packages.",
)
async def get_recommendations(
    analysis_id: uuid.UUID, user: CurrentUser, service: AnalysisServiceDep
) -> RecommendationsResponse:
    record = await service.get_owned(user, analysis_id)
    return to_recommendations(record)


@router.get(
    "/{analysis_id}/images/{image_id}",
    responses={**_ERRORS, 200: {"content": {"image/jpeg": {}}}},
    summary="Fetch an analysis image",
    description=(
        "Streams an image belonging to the analysis. Ownership is enforced server-side, "
        "so image URLs are not publicly guessable resources."
    ),
    response_class=Response,
)
async def get_image(
    analysis_id: uuid.UUID,
    image_id: uuid.UUID,
    user: CurrentUser,
    service: AnalysisServiceDep,
) -> Response:
    record = await service.get_owned(user, analysis_id)
    image = next((img for img in record.images if img.id == image_id), None)
    if image is None:
        raise NotFoundError("Image not found.")
    data = get_storage().read(image.storage_path)
    return Response(
        content=data,
        media_type=image.mime_type,
        headers={"Cache-Control": "private, max-age=3600"},
    )


@router.delete(
    "/{analysis_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses=_ERRORS,
    summary="Delete an analysis",
    description="Permanently deletes the analysis together with its images and reports.",
)
async def delete_analysis(
    analysis_id: uuid.UUID, user: CurrentUser, service: AnalysisServiceDep
) -> Response:
    await service.delete_analysis(user, analysis_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
