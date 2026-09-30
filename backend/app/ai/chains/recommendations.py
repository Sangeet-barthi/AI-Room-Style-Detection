"""Chains 2-4 — style explanation, improvement plan and budget packages."""
from __future__ import annotations

import json
import logging

from app.ai.provider import VisionAnalysisProvider, get_vision_provider, load_prompt
from app.ai.schemas import BudgetPlanSet, ImprovementPlan, RoomAnalysis
from app.core.logging import log_event
from app.services.budget import BUDGET_TIERS, validate_budget_plans

logger = logging.getLogger("app.ai.chains")


def _furniture_text(analysis: RoomAnalysis) -> str:
    if not analysis.furniture:
        return "no clearly identifiable furniture"
    return ", ".join(f"{f.name} ({f.description or f.evidence_type})" for f in analysis.furniture)


def _materials_text(analysis: RoomAnalysis) -> str:
    if not analysis.materials:
        return "no clearly identifiable materials"
    return ", ".join(f"{m.name} on {m.where_seen or 'unspecified surface'}" for m in analysis.materials)


def _colors_text(analysis: RoomAnalysis) -> str:
    if not analysis.dominant_colors:
        return "not reliably sampled"
    return ", ".join(f"{c.name} {c.hex} ({c.coverage})" for c in analysis.dominant_colors)


class RecommendationChain:
    """Generates the categorised improvement plan for a specific room."""

    def __init__(self, provider: VisionAnalysisProvider | None = None) -> None:
        self.provider = provider or get_vision_provider()
        self.template = load_prompt("recommendations.txt")

    async def run(self, analysis: RoomAnalysis, scores: dict) -> ImprovementPlan:
        prompt = self.template.format(
            room_type=analysis.room_type,
            primary_style=analysis.primary_style,
            style_confidence=round(analysis.style_confidence, 2),
            wall_color=analysis.wall_color,
            flooring=analysis.flooring,
            furniture=_furniture_text(analysis),
            materials=_materials_text(analysis),
            dominant_colors=_colors_text(analysis),
            color_temperature=analysis.color_temperature,
            strengths="; ".join(analysis.strengths) or "none recorded",
            weaknesses="; ".join(analysis.weaknesses) or "none recorded",
            scores=json.dumps(
                {
                    "lighting": scores["lighting"]["score"],
                    "ventilation": scores["ventilation"]["score"],
                    "space_utilization": scores["space_utilization"]["score"],
                    "overall": scores["overall"]["score"],
                }
            ),
            score_reasons=json.dumps(
                {key: value["summary"] for key, value in scores.items()}
            ),
        )
        plan = await self.provider.run_structured(prompt, ImprovementPlan)
        log_event(
            logger,
            logging.INFO,
            "chain.recommendations.completed",
            improvement_count=len(plan.improvements),
        )
        return plan


class BudgetRecommendationChain:
    """Generates the ₹5,000 / ₹20,000 / ₹50,000 makeover packages."""

    def __init__(self, provider: VisionAnalysisProvider | None = None) -> None:
        self.provider = provider or get_vision_provider()
        self.template = load_prompt("budget.txt")

    async def run(
        self, analysis: RoomAnalysis, scores: dict, plan: ImprovementPlan
    ) -> BudgetPlanSet:
        prompt = self.template.format(
            room_type=analysis.room_type,
            primary_style=analysis.primary_style,
            scores=json.dumps(
                {key: value["score"] for key, value in scores.items()}
            ),
            weaknesses="; ".join(analysis.weaknesses) or "none recorded",
            improvements="; ".join(
                f"{i.title} [{i.category}/{i.priority}]" for i in plan.improvements
            )
            or "none",
        )
        result = await self.provider.run_structured(prompt, BudgetPlanSet)

        # Deterministic validation: the LLM proposes, the backend enforces.
        validated = validate_budget_plans(result.plans, BUDGET_TIERS)
        log_event(
            logger,
            logging.INFO,
            "chain.budget.completed",
            tiers=[p.budget for p in validated],
            totals=[p.total_estimated_cost for p in validated],
        )
        return BudgetPlanSet(plans=validated)
