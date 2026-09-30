"""Analysis, recommendation, makeover and report API contracts."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.ai.schemas import BudgetPlan, ImprovementPlan, RoomAnalysis


class ErrorBody(BaseModel):
    code: str
    message: str
    details: Any = None


class ErrorResponse(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "error": {
                    "code": "ai_quota_exceeded",
                    "message": "The AI free-tier quota has been reached.",
                    "details": None,
                }
            }
        }
    )
    error: ErrorBody


class ImageRef(BaseModel):
    id: uuid.UUID
    image_type: str
    url: str
    mime_type: str
    width: int | None = None
    height: int | None = None


class ScoreDetail(BaseModel):
    score: int = Field(..., ge=0, le=100)
    band: str
    summary: str
    factors: list[str] = Field(default_factory=list)
    breakdown: dict[str, int] = Field(default_factory=dict)
    disclaimer: str = "Visual AI-assisted assessment"


class OverallScore(BaseModel):
    score: int = Field(..., ge=0, le=100)
    band: str
    summary: str
    formula: str
    weights: dict[str, float]
    weakest_dimension: str
    strongest_dimension: str
    disclaimer: str = "Visual AI-assisted assessment"


class RoomScores(BaseModel):
    lighting: ScoreDetail
    ventilation: ScoreDetail
    space_utilization: ScoreDetail
    overall: OverallScore


class AnalysisSummary(BaseModel):
    id: uuid.UUID
    title: str | None
    room_type: str
    primary_style: str
    style_confidence: float
    overall_score: int
    thumbnail_url: str | None
    created_at: datetime


class MakeoverResponse(BaseModel):
    id: uuid.UUID
    target_style: str
    kind: str
    provider: str
    label: str
    image_url: str | None
    mockup: dict[str, Any]
    note: str | None
    created_at: datetime


class ReportSummary(BaseModel):
    id: uuid.UUID
    analysis_id: uuid.UUID
    file_name: str
    size_bytes: int
    created_at: datetime
    room_type: str | None = None
    primary_style: str | None = None
    download_url: str


class AnalysisDetail(BaseModel):
    id: uuid.UUID
    title: str | None
    room_type: str
    primary_style: str
    style_confidence: float
    overall_score: int
    created_at: datetime
    model_name: str | None
    analysis: RoomAnalysis
    model_metadata: dict[str, Any] = Field(default_factory=dict)
    scores: RoomScores
    improvements: ImprovementPlan
    budget_plans: list[BudgetPlan]
    images: list[ImageRef]
    makeovers: list[MakeoverResponse] = Field(default_factory=list)
    reports: list[ReportSummary] = Field(default_factory=list)


class RecommendationsResponse(BaseModel):
    analysis_id: uuid.UUID
    improvements: ImprovementPlan
    budget_plans: list[BudgetPlan]
    scores: RoomScores


class PaginatedAnalyses(BaseModel):
    items: list[AnalysisSummary]
    total: int
    page: int
    page_size: int
    has_more: bool


class DashboardStats(BaseModel):
    total_analyses: int
    average_health_score: int
    reports_created: int
    style_distribution: list[dict[str, Any]]
    room_type_distribution: list[dict[str, Any]]
    score_trend: list[dict[str, Any]]
    latest: AnalysisSummary | None = None


class MakeoverRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={"example": {"target_style": "Minimalist", "force": False}}
    )
    target_style: str = Field(..., description="One of the seven supported styles.")
    force: bool = Field(
        False, description="Regenerate even if a concept already exists for this style."
    )


class CapabilitiesResponse(BaseModel):
    vision_enabled: bool
    vision_model: str
    image_generation_enabled: bool
    image_generation_provider: str
    demo_mode: bool
    max_upload_mb: int
    supported_styles: list[str]
    supported_room_types: list[str]
    budget_tiers: list[int]
