"""Chain 6 — PDF report narrative preparation."""
from __future__ import annotations

import json
import logging

from app.ai.provider import VisionAnalysisProvider, get_vision_provider, load_prompt
from app.ai.schemas import ImprovementPlan, ReportNarrative, RoomAnalysis
from app.core.logging import log_event

logger = logging.getLogger("app.ai.chains")


class ReportNarrativeChain:
    def __init__(self, provider: VisionAnalysisProvider | None = None) -> None:
        self.provider = provider or get_vision_provider()
        self.template = load_prompt("report.txt")

    async def run(
        self, analysis: RoomAnalysis, scores: dict, plan: ImprovementPlan
    ) -> ReportNarrative:
        prompt = self.template.format(
            room_type=analysis.room_type,
            primary_style=analysis.primary_style,
            style_confidence=round(analysis.style_confidence, 2),
            alternative_styles=", ".join(
                f"{a.style} ({a.confidence_estimate:.2f})" for a in analysis.alternative_styles
            )
            or "none",
            style_evidence="; ".join(analysis.style_evidence) or "limited",
            scores=json.dumps({k: v["score"] for k, v in scores.items()}),
            score_reasons=json.dumps({k: v["summary"] for k, v in scores.items()}),
            improvements="; ".join(i.title for i in plan.improvements[:8]) or "none",
        )
        narrative = await self.provider.run_structured(prompt, ReportNarrative)
        log_event(logger, logging.INFO, "chain.report_narrative.completed")
        return narrative


def fallback_narrative(
    analysis: RoomAnalysis, scores: dict, plan: ImprovementPlan
) -> ReportNarrative:
    """Deterministic narrative used when the AI service is unavailable.

    The report must remain downloadable even if the provider is down; this uses
    only data that was already produced and persisted during the analysis.
    """
    top = plan.improvements[0].title if plan.improvements else "refining the lighting layers"
    weakest = min(
        ("lighting", "ventilation", "space_utilization"),
        key=lambda key: scores[key]["score"],
    )
    label = weakest.replace("_", " ")
    return ReportNarrative(
        executive_summary=(
            f"This {analysis.room_type.lower()} reads as a {analysis.primary_style} space, "
            f"with an overall visual room-health score of {scores['overall']['score']} out of 100. "
            f"{scores['overall']['summary']} The clearest opportunity for improvement sits in the "
            f"{label} dimension, and the highest-return single change is {top.lower()}."
        ),
        style_narrative=(
            f"The {analysis.primary_style} classification is supported by "
            f"{'; '.join(analysis.style_evidence[:4]) or 'the overall composition of the room'}. "
            "This assessment is based on one photograph, so it describes the visual language of "
            "the space rather than a definitive design classification."
        ),
        health_narrative=(
            f"Lighting scored {scores['lighting']['score']}. {scores['lighting']['summary']} "
            f"Ventilation scored {scores['ventilation']['score']}. {scores['ventilation']['summary']} "
            f"Space utilisation scored {scores['space_utilization']['score']}. "
            f"{scores['space_utilization']['summary']}"
        ),
        closing_note=(
            "Start with the high-priority items in the ₹5,000 package — they deliver the most "
            "visible change for the least spend. Re-photograph the room afterwards to see how "
            "the assessment shifts."
        ),
    )
