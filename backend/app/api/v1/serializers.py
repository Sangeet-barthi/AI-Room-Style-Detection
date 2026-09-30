"""ORM -> API response mapping."""
from __future__ import annotations

from typing import Any

from app.ai.schemas import BudgetPlan, ImprovementPlan
from app.core.config import settings
from app.models import MakeoverVisualization, Report, RoomAnalysis
from app.schemas.analysis import (
    AnalysisDetail,
    AnalysisSummary,
    ImageRef,
    MakeoverResponse,
    RecommendationsResponse,
    ReportSummary,
    RoomScores,
)

PREFIX = settings.api_v1_prefix


def image_url(analysis_id: Any, image_id: Any) -> str:
    return f"{PREFIX}/analyses/{analysis_id}/images/{image_id}"


def makeover_image_url(analysis_id: Any, makeover_id: Any) -> str:
    return f"{PREFIX}/analyses/{analysis_id}/makeover/{makeover_id}/image"


def report_download_url(report_id: Any) -> str:
    return f"{PREFIX}/reports/{report_id}/download"


def _improvements(analysis: RoomAnalysis) -> ImprovementPlan:
    payload = next(
        (r.payload for r in analysis.recommendations if r.kind == "improvement"), None
    )
    if not payload:
        return ImprovementPlan(summary="", improvements=[])
    return ImprovementPlan.model_validate(payload)


def _budgets(analysis: RoomAnalysis) -> list[BudgetPlan]:
    payload = next(
        (r.payload for r in analysis.recommendations if r.kind == "budget"), None
    )
    if not payload:
        return []
    return [BudgetPlan.model_validate(plan) for plan in payload.get("plans", [])]


def to_summary(analysis: RoomAnalysis) -> AnalysisSummary:
    thumb = analysis.thumbnail_image or analysis.original_image
    return AnalysisSummary(
        id=analysis.id,
        title=analysis.title,
        room_type=analysis.room_type,
        primary_style=analysis.primary_style,
        style_confidence=analysis.style_confidence,
        overall_score=analysis.overall_score,
        thumbnail_url=image_url(analysis.id, thumb.id) if thumb else None,
        created_at=analysis.created_at,
    )


def to_makeover(makeover: MakeoverVisualization) -> MakeoverResponse:
    label = "AI Concept Visualization" if makeover.kind == "ai_concept" else "Design Mockup"
    return MakeoverResponse(
        id=makeover.id,
        target_style=makeover.target_style,
        kind=makeover.kind,
        provider=makeover.provider,
        label=label,
        image_url=(
            makeover_image_url(makeover.analysis_id, makeover.id)
            if makeover.storage_path
            else None
        ),
        mockup=makeover.mockup_json or {},
        note=makeover.note,
        created_at=makeover.created_at,
    )


def to_report(report: Report, analysis: RoomAnalysis | None = None) -> ReportSummary:
    return ReportSummary(
        id=report.id,
        analysis_id=report.analysis_id,
        file_name=report.file_name,
        size_bytes=report.size_bytes,
        created_at=report.created_at,
        room_type=analysis.room_type if analysis else None,
        primary_style=analysis.primary_style if analysis else None,
        download_url=report_download_url(report.id),
    )


def to_detail(analysis: RoomAnalysis) -> AnalysisDetail:
    payload = dict(analysis.analysis_json)
    metadata = payload.pop("model_metadata", {}) or {}
    return AnalysisDetail(
        id=analysis.id,
        title=analysis.title,
        room_type=analysis.room_type,
        primary_style=analysis.primary_style,
        style_confidence=analysis.style_confidence,
        overall_score=analysis.overall_score,
        created_at=analysis.created_at,
        model_name=analysis.model_name,
        analysis=payload,  # type: ignore[arg-type]
        model_metadata=metadata,
        scores=RoomScores.model_validate(analysis.scores_json),
        improvements=_improvements(analysis),
        budget_plans=_budgets(analysis),
        images=[
            ImageRef(
                id=image.id,
                image_type=image.image_type,
                url=image_url(analysis.id, image.id),
                mime_type=image.mime_type,
                width=image.width,
                height=image.height,
            )
            for image in analysis.images
        ],
        makeovers=[to_makeover(m) for m in analysis.makeovers],
        reports=[to_report(r, analysis) for r in analysis.reports],
    )


def to_recommendations(analysis: RoomAnalysis) -> RecommendationsResponse:
    return RecommendationsResponse(
        analysis_id=analysis.id,
        improvements=_improvements(analysis),
        budget_plans=_budgets(analysis),
        scores=RoomScores.model_validate(analysis.scores_json),
    )
