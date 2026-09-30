"""Before/after makeover visualization endpoints."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Response, status

from app.api.deps import AnalysisServiceDep, CurrentUser, MakeoverServiceDep
from app.api.v1.serializers import to_makeover
from app.core.errors import NotFoundError
from app.core.rate_limit import makeover_rate_limit
from app.schemas.analysis import ErrorResponse, MakeoverRequest, MakeoverResponse
from app.storage import get_storage

router = APIRouter(prefix="/analyses/{analysis_id}/makeover", tags=["Makeover"])

_ERRORS = {
    401: {"model": ErrorResponse, "description": "Authentication required"},
    404: {"model": ErrorResponse, "description": "Analysis or visualization not found"},
    422: {"model": ErrorResponse, "description": "Unsupported target style"},
    429: {"model": ErrorResponse, "description": "Makeover rate limit reached"},
}


@router.post(
    "",
    response_model=MakeoverResponse,
    status_code=status.HTTP_201_CREATED,
    responses=_ERRORS,
    summary="Create a makeover visualization",
    description=(
        "Generates a before/after visualization for a target style. If the optional "
        "image-generation provider is enabled and succeeds, the result is an "
        "**AI Concept Visualization**. Otherwise the endpoint returns a deterministic "
        "**Design Mockup** (palette plus concrete change list) and still succeeds — "
        "image generation is never a hard requirement.\n\n"
        "Existing concepts for the same style are reused unless `force` is true."
    ),
    dependencies=[Depends(makeover_rate_limit)],
)
async def create_makeover(
    analysis_id: uuid.UUID,
    payload: MakeoverRequest,
    user: CurrentUser,
    analyses: AnalysisServiceDep,
    makeovers: MakeoverServiceDep,
) -> MakeoverResponse:
    analysis = await analyses.get_owned(user, analysis_id)
    record = await makeovers.generate(analysis, payload.target_style, force=payload.force)
    return to_makeover(record)


@router.get(
    "",
    response_model=list[MakeoverResponse],
    responses=_ERRORS,
    summary="List makeover visualizations",
    description="Returns every visualization already generated for this analysis.",
)
async def list_makeovers(
    analysis_id: uuid.UUID,
    user: CurrentUser,
    analyses: AnalysisServiceDep,
    makeovers: MakeoverServiceDep,
) -> list[MakeoverResponse]:
    analysis = await analyses.get_owned(user, analysis_id)
    rows = await makeovers.list_for_analysis(analysis.id)
    return [to_makeover(row) for row in rows]


@router.get(
    "/{makeover_id}/image",
    responses={**_ERRORS, 200: {"content": {"image/png": {}}}},
    summary="Fetch a generated makeover image",
    description="Streams a stored AI concept image. Ownership is enforced server-side.",
    response_class=Response,
)
async def get_makeover_image(
    analysis_id: uuid.UUID,
    makeover_id: uuid.UUID,
    user: CurrentUser,
    analyses: AnalysisServiceDep,
    makeovers: MakeoverServiceDep,
) -> Response:
    analysis = await analyses.get_owned(user, analysis_id)
    rows = await makeovers.list_for_analysis(analysis.id)
    record = next((row for row in rows if row.id == makeover_id), None)
    if record is None or not record.storage_path:
        raise NotFoundError("Visualization image not found.")
    return Response(
        content=get_storage().read(record.storage_path),
        media_type="image/png",
        headers={"Cache-Control": "private, max-age=3600"},
    )
