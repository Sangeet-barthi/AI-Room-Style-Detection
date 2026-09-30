"""Deterministic room-health scoring.

The vision model supplies *observations*. This module — and only this module —
turns observations into numbers. Keeping the arithmetic here means the scores
are reproducible, explainable and testable, and the LLM is never the authority
on a number shown to the user.

All scores are 0-100 visual assessments derived from a single photograph.
They are not physical measurements.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.ai.schemas import (
    LightingObservations,
    RoomAnalysis,
    SpaceObservations,
    VentilationObservations,
)
from app.core.config import settings

DISCLAIMER = "Visual AI-assisted assessment"


@dataclass(frozen=True)
class ScoreWeights:
    lighting: float = 0.35
    ventilation: float = 0.25
    space: float = 0.40

    def normalised(self) -> ScoreWeights:
        total = self.lighting + self.ventilation + self.space
        if total <= 0:
            return ScoreWeights()
        return ScoreWeights(
            lighting=self.lighting / total,
            ventilation=self.ventilation / total,
            space=self.space / total,
        )


def default_weights() -> ScoreWeights:
    return ScoreWeights(
        lighting=settings.score_weight_lighting,
        ventilation=settings.score_weight_ventilation,
        space=settings.score_weight_space,
    ).normalised()


def _clamp(value: float, low: int = 0, high: int = 100) -> int:
    return int(round(min(max(value, low), high)))


def _band(score: int) -> str:
    if score >= 85:
        return "excellent"
    if score >= 70:
        return "good"
    if score >= 55:
        return "fair"
    if score >= 40:
        return "needs attention"
    return "poor"


# --------------------------------------------------------------------------
# Lighting — 35% by default
# --------------------------------------------------------------------------
_BRIGHTNESS_POINTS = {
    "dark": 4,
    "dim": 14,
    "balanced": 28,
    "bright": 32,
    "very_bright": 27,  # overexposed rooms lose a little: glare is a real problem
}
_OPENNESS_POINTS = {"none": 0, "small": 9, "medium": 18, "large": 25}
_DISTRIBUTION_POINTS = {"uneven": 3, "mixed": 10, "even": 17}


def score_lighting(obs: LightingObservations) -> dict[str, Any]:
    breakdown: dict[str, int] = {}

    breakdown["natural_light"] = 18 if obs.natural_light_visible else 0
    breakdown["window_openness"] = _OPENNESS_POINTS.get(obs.window_openness, 0)
    breakdown["brightness"] = _BRIGHTNESS_POINTS.get(obs.overall_brightness, 20)
    breakdown["artificial_sources"] = min(obs.artificial_light_sources_visible, 3) * 6
    breakdown["distribution"] = _DISTRIBUTION_POINTS.get(obs.light_distribution, 10)

    score = _clamp(sum(breakdown.values()))
    factors = []
    if obs.natural_light_visible:
        factors.append(
            f"natural light is visible through {obs.window_count_visible or 'at least one'} "
            f"window with a {obs.window_openness} glazed area"
        )
    else:
        factors.append("no natural light source is visible in the frame")
    factors.append(f"the scene reads as {obs.overall_brightness.replace('_', ' ')}")
    if obs.artificial_light_sources_visible:
        factors.append(
            f"{obs.artificial_light_sources_visible} artificial light source(s) are visible"
        )
    else:
        factors.append("no artificial light fixtures are visible")
    factors.append(f"light distribution appears {obs.light_distribution}")

    summary = _lighting_summary(score, obs)
    return {
        "score": score,
        "band": _band(score),
        "breakdown": breakdown,
        "factors": factors,
        "summary": summary,
        "disclaimer": DISCLAIMER,
    }


def _lighting_summary(score: int, obs: LightingObservations) -> str:
    if score >= 80:
        base = "Strong daylight and a well-distributed light scheme."
    elif score >= 60:
        base = "Serviceable daylight, though the lighting layers are incomplete."
    elif score >= 40:
        base = "The room reads as under-lit in the photograph."
    else:
        base = "Very little usable light is visible in this view."
    if obs.artificial_light_sources_visible < 2:
        base += " Adding a second light layer would improve evening usability."
    elif obs.light_distribution == "uneven":
        base += " Redistributing the existing fixtures would even out dark corners."
    return base


# --------------------------------------------------------------------------
# Ventilation — 25% by default
# --------------------------------------------------------------------------
_OPENNESS_ROOM_POINTS = {"enclosed": 4, "semi_open": 14, "open": 22}


def score_ventilation(obs: VentilationObservations) -> dict[str, Any]:
    breakdown: dict[str, int] = {}

    breakdown["openable_windows"] = min(obs.openable_windows_visible, 3) * 12
    breakdown["doors_and_openings"] = min(obs.doors_or_openings_visible, 2) * 9
    breakdown["cross_ventilation"] = 20 if obs.cross_ventilation_possible else 0
    breakdown["mechanical"] = 10 if obs.mechanical_ventilation_visible else 0
    breakdown["room_openness"] = _OPENNESS_ROOM_POINTS.get(obs.room_openness, 14)

    score = _clamp(sum(breakdown.values()))
    factors = [
        f"{obs.openable_windows_visible} openable window(s) visible",
        f"{obs.doors_or_openings_visible} door(s) or opening(s) visible",
        (
            "openings on more than one wall suggest cross-ventilation is possible"
            if obs.cross_ventilation_possible
            else "openings appear on a single wall in this view"
        ),
        f"the room reads as {obs.room_openness.replace('_', ' ')}",
    ]
    if obs.mechanical_ventilation_visible:
        factors.append("a fan or mechanical vent is visible")

    if score >= 80:
        summary = "Multiple visible openings suggest good airflow potential."
    elif score >= 60:
        summary = "Reasonable airflow potential, limited by a single opening direction."
    elif score >= 40:
        summary = "Airflow opportunities look restricted in this view."
    else:
        summary = "Very few openings are visible, which limits apparent airflow."
    summary += " This is an assessment of visible openings, not measured air quality."

    return {
        "score": score,
        "band": _band(score),
        "breakdown": breakdown,
        "factors": factors,
        "summary": summary,
        "disclaimer": DISCLAIMER,
    }


# --------------------------------------------------------------------------
# Space utilisation — 40% by default
# --------------------------------------------------------------------------
_DENSITY_POINTS = {"sparse": 20, "balanced": 32, "busy": 16, "overcrowded": 5}
_CLEARANCE_POINTS = {"blocked": 0, "tight": 10, "adequate": 22, "generous": 28}
_CLUTTER_POINTS = {"none": 20, "low": 16, "moderate": 9, "high": 2}
_BALANCE_POINTS = {"poor": 3, "fair": 8, "good": 13, "excellent": 17}


def score_space(obs: SpaceObservations) -> dict[str, Any]:
    breakdown: dict[str, int] = {}

    breakdown["furniture_density"] = _DENSITY_POINTS.get(obs.furniture_density, 24)
    breakdown["walking_clearance"] = _CLEARANCE_POINTS.get(obs.walking_clearance, 22)
    breakdown["clutter"] = _CLUTTER_POINTS.get(obs.clutter_level, 16)
    breakdown["layout_balance"] = _BALANCE_POINTS.get(obs.layout_balance, 13)
    breakdown["vertical_storage"] = 3 if obs.vertical_storage_used else 0

    score = _clamp(sum(breakdown.values()))
    factors = [
        f"furniture density reads as {obs.furniture_density}",
        f"walking clearance reads as {obs.walking_clearance}",
        f"visible clutter level is {obs.clutter_level}",
        f"layout balance is {obs.layout_balance}",
        (
            "vertical storage is being used"
            if obs.vertical_storage_used
            else "vertical wall space is largely unused"
        ),
    ]

    if score >= 80:
        summary = "The floor plan is well balanced with comfortable circulation."
    elif score >= 60:
        summary = "The layout works, but some circulation or surface space is compromised."
    elif score >= 40:
        summary = "Furniture placement is limiting comfortable movement through the room."
    else:
        summary = "The room reads as crowded, with circulation significantly obstructed."
    if not obs.vertical_storage_used:
        summary += " Using vertical storage would free up floor area."

    return {
        "score": score,
        "band": _band(score),
        "breakdown": breakdown,
        "factors": factors,
        "summary": summary,
        "disclaimer": DISCLAIMER,
    }


# --------------------------------------------------------------------------
# Overall
# --------------------------------------------------------------------------
def compute_scores(
    analysis: RoomAnalysis, weights: ScoreWeights | None = None
) -> dict[str, Any]:
    w = (weights or default_weights()).normalised()

    lighting = score_lighting(analysis.lighting_observations)
    ventilation = score_ventilation(analysis.ventilation_observations)
    space = score_space(analysis.space_utilization_observations)

    overall_value = (
        lighting["score"] * w.lighting
        + ventilation["score"] * w.ventilation
        + space["score"] * w.space
    )
    overall = _clamp(overall_value)

    ranked = sorted(
        [
            ("lighting", lighting["score"]),
            ("ventilation", ventilation["score"]),
            ("space utilisation", space["score"]),
        ],
        key=lambda pair: pair[1],
    )
    weakest, weakest_score = ranked[0]
    strongest, strongest_score = ranked[-1]

    summary = (
        f"This room scores {overall}/100 overall. Its strongest dimension is {strongest} "
        f"({strongest_score}/100); the biggest opportunity is {weakest} "
        f"({weakest_score}/100)."
    )

    return {
        "lighting": lighting,
        "ventilation": ventilation,
        "space_utilization": space,
        "overall": {
            "score": overall,
            "band": _band(overall),
            "weights": {
                "lighting": round(w.lighting, 4),
                "ventilation": round(w.ventilation, 4),
                "space_utilization": round(w.space, 4),
            },
            "formula": (
                "overall = lighting×{l} + ventilation×{v} + space×{s}".format(
                    l=round(w.lighting, 2), v=round(w.ventilation, 2), s=round(w.space, 2)
                )
            ),
            "weakest_dimension": weakest,
            "strongest_dimension": strongest,
            "summary": summary,
            "disclaimer": DISCLAIMER,
        },
    }
