"""Structured schemas the vision model must produce.

These Pydantic models are the source of truth for parsing AI output. They are
intentionally strict about *shape* and permissive about *content*, because a
vision model can only describe what is visible in a single photograph.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

RoomType = Literal[
    "Living Room",
    "Bedroom",
    "Kitchen",
    "Bathroom",
    "Dining Room",
    "Home Office",
    "Balcony",
    "Hallway",
    "Other",
]

DesignStyle = Literal[
    "Modern",
    "Minimalist",
    "Luxury",
    "Classic",
    "Traditional",
    "Rustic",
    "Coastal",
]

STYLE_TAXONOMY: tuple[str, ...] = (
    "Modern",
    "Minimalist",
    "Luxury",
    "Classic",
    "Traditional",
    "Rustic",
    "Coastal",
)

ROOM_TYPES: tuple[str, ...] = (
    "Living Room",
    "Bedroom",
    "Kitchen",
    "Bathroom",
    "Dining Room",
    "Home Office",
    "Balcony",
    "Hallway",
    "Other",
)

Confidence = Literal["observed", "inferred"]


class AlternativeStyle(BaseModel):
    style: DesignStyle
    confidence_estimate: float = Field(
        ..., ge=0, le=1, description="AI confidence estimate between 0 and 1."
    )
    supporting_evidence: list[str] = Field(default_factory=list, max_length=6)


class FurnitureItem(BaseModel):
    name: str = Field(..., max_length=80)
    description: str = Field("", max_length=300)
    condition_note: str = Field("", max_length=200)
    evidence_type: Confidence = "observed"


class MaterialItem(BaseModel):
    name: str = Field(..., max_length=60)
    where_seen: str = Field("", max_length=160)
    evidence_type: Confidence = "observed"


class DominantColor(BaseModel):
    name: str = Field(..., max_length=40)
    hex: str = Field("#CCCCCC", max_length=7)
    coverage: Literal["dominant", "secondary", "accent"] = "secondary"

    @field_validator("hex")
    @classmethod
    def _normalise_hex(cls, value: str) -> str:
        value = (value or "").strip()
        if not value.startswith("#"):
            value = f"#{value}"
        if len(value) == 4:  # #abc -> #aabbcc
            value = "#" + "".join(ch * 2 for ch in value[1:])
        if len(value) != 7:
            return "#CCCCCC"
        try:
            int(value[1:], 16)
        except ValueError:
            return "#CCCCCC"
        return value.upper()


class LightingObservations(BaseModel):
    natural_light_visible: bool = False
    window_count_visible: int = Field(0, ge=0, le=20)
    window_openness: Literal["none", "small", "medium", "large"] = "none"
    overall_brightness: Literal["dark", "dim", "balanced", "bright", "very_bright"] = "balanced"
    artificial_light_sources_visible: int = Field(0, ge=0, le=20)
    light_distribution: Literal["uneven", "mixed", "even"] = "mixed"
    notes: str = Field("", max_length=600)


class VentilationObservations(BaseModel):
    openable_windows_visible: int = Field(0, ge=0, le=20)
    doors_or_openings_visible: int = Field(0, ge=0, le=20)
    cross_ventilation_possible: bool = False
    mechanical_ventilation_visible: bool = False
    room_openness: Literal["enclosed", "semi_open", "open"] = "semi_open"
    notes: str = Field("", max_length=600)


class SpaceObservations(BaseModel):
    furniture_density: Literal["sparse", "balanced", "busy", "overcrowded"] = "balanced"
    walking_clearance: Literal["blocked", "tight", "adequate", "generous"] = "adequate"
    clutter_level: Literal["none", "low", "moderate", "high"] = "low"
    layout_balance: Literal["poor", "fair", "good", "excellent"] = "good"
    vertical_storage_used: bool = False
    notes: str = Field("", max_length=600)


class RoomAnalysis(BaseModel):
    """Full structured description of a single room photograph."""

    room_type: RoomType
    primary_style: DesignStyle
    style_confidence: float = Field(..., ge=0, le=1)
    alternative_styles: list[AlternativeStyle] = Field(default_factory=list, max_length=3)
    style_evidence: list[str] = Field(default_factory=list, max_length=8)
    style_explanation: str = Field("", max_length=1600)

    furniture: list[FurnitureItem] = Field(default_factory=list, max_length=20)
    wall_color: str = Field("Not clearly visible", max_length=120)
    flooring: str = Field("Not clearly visible", max_length=120)
    materials: list[MaterialItem] = Field(default_factory=list, max_length=15)
    dominant_colors: list[DominantColor] = Field(default_factory=list, max_length=8)
    color_temperature: Literal["warm", "cool", "neutral", "mixed"] = "neutral"

    lighting_observations: LightingObservations = Field(default_factory=LightingObservations)
    ventilation_observations: VentilationObservations = Field(
        default_factory=VentilationObservations
    )
    space_utilization_observations: SpaceObservations = Field(default_factory=SpaceObservations)

    strengths: list[str] = Field(default_factory=list, max_length=8)
    weaknesses: list[str] = Field(default_factory=list, max_length=8)
    suggested_improvements: list[str] = Field(default_factory=list, max_length=10)
    detected_features: list[str] = Field(default_factory=list, max_length=15)
    uncertainty_notes: str = Field("", max_length=600)


class ModelMetadata(BaseModel):
    provider: str
    model: str
    duration_ms: int = 0
    image_width: int = 0
    image_height: int = 0


class Improvement(BaseModel):
    title: str = Field(..., max_length=120)
    category: Literal["quick", "lighting", "furniture", "color", "material", "decor"]
    reason: str = Field(..., max_length=600)
    expected_impact: str = Field(..., max_length=300)
    priority: Literal["high", "medium", "low"] = "medium"
    estimated_cost_inr: int | None = Field(None, ge=0, le=500000)


class ImprovementPlan(BaseModel):
    summary: str = Field(..., max_length=900)
    improvements: list[Improvement] = Field(default_factory=list, max_length=18)


class BudgetItem(BaseModel):
    name: str = Field(..., max_length=120)
    estimated_cost: int = Field(..., ge=0, le=500000)
    reason: str = Field(..., max_length=500)
    expected_impact: str = Field("", max_length=300)
    priority: Literal["high", "medium", "low"] = "medium"


class BudgetPlan(BaseModel):
    budget: int
    items: list[BudgetItem] = Field(default_factory=list, max_length=12)
    total_estimated_cost: int = 0
    remaining: int = 0
    notes: str = Field("", max_length=500)


class BudgetPlanSet(BaseModel):
    plans: list[BudgetPlan] = Field(default_factory=list, max_length=3)


class MakeoverPrompt(BaseModel):
    target_style: DesignStyle
    prompt: str = Field(..., max_length=1400)
    negative_prompt: str = Field("", max_length=600)
    palette: list[DominantColor] = Field(default_factory=list, max_length=6)
    furniture_changes: list[str] = Field(default_factory=list, max_length=8)
    lighting_changes: list[str] = Field(default_factory=list, max_length=6)
    decor_changes: list[str] = Field(default_factory=list, max_length=6)
    material_changes: list[str] = Field(default_factory=list, max_length=6)


class ReportNarrative(BaseModel):
    executive_summary: str = Field(..., max_length=1600)
    style_narrative: str = Field(..., max_length=1600)
    health_narrative: str = Field(..., max_length=1600)
    closing_note: str = Field("", max_length=800)
