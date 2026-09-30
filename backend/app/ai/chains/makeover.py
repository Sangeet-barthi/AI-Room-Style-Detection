"""Chain 5 — makeover prompt generation for the target style."""
from __future__ import annotations

import logging

from app.ai.provider import VisionAnalysisProvider, get_vision_provider, load_prompt
from app.ai.schemas import MakeoverPrompt, RoomAnalysis
from app.core.logging import log_event

logger = logging.getLogger("app.ai.chains")


def _architecture_summary(analysis: RoomAnalysis) -> str:
    lighting = analysis.lighting_observations
    ventilation = analysis.ventilation_observations
    parts = [
        f"{lighting.window_count_visible} visible window(s) with "
        f"{lighting.window_openness} glazed area",
        f"{ventilation.doors_or_openings_visible} visible door(s) or opening(s)",
        f"room reads as {ventilation.room_openness}",
        f"current flooring: {analysis.flooring}",
        f"current wall finish: {analysis.wall_color}",
    ]
    if analysis.detected_features:
        parts.append("features: " + ", ".join(analysis.detected_features[:6]))
    return "; ".join(parts)


class MakeoverPromptChain:
    def __init__(self, provider: VisionAnalysisProvider | None = None) -> None:
        self.provider = provider or get_vision_provider()
        self.template = load_prompt("makeover.txt")

    async def run(self, analysis: RoomAnalysis, target_style: str) -> MakeoverPrompt:
        prompt = self.template.format(
            room_type=analysis.room_type,
            primary_style=analysis.primary_style,
            target_style=target_style,
            wall_color=analysis.wall_color,
            flooring=analysis.flooring,
            furniture=", ".join(f.name for f in analysis.furniture) or "none identified",
            dominant_colors=", ".join(
                f"{c.name} {c.hex}" for c in analysis.dominant_colors
            )
            or "not sampled",
            architecture=_architecture_summary(analysis),
        )
        result = await self.provider.run_structured(prompt, MakeoverPrompt)
        result.target_style = target_style  # type: ignore[assignment]
        log_event(
            logger,
            logging.INFO,
            "chain.makeover_prompt.completed",
            target_style=target_style,
            prompt_length=len(result.prompt),
        )
        return result
