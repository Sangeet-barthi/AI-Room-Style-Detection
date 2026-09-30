"""Chain 1 — room image analysis."""
from __future__ import annotations

import logging
import time

from app.ai.provider import VisionAnalysisProvider, get_vision_provider
from app.ai.schemas import ModelMetadata, RoomAnalysis
from app.core.logging import log_event

logger = logging.getLogger("app.ai.chains")


class RoomAnalysisChain:
    """Sends a normalised room image to the vision provider and validates output."""

    def __init__(self, provider: VisionAnalysisProvider | None = None) -> None:
        self.provider = provider or get_vision_provider()

    async def run(
        self, image_bytes: bytes, mime_type: str, width: int, height: int
    ) -> tuple[RoomAnalysis, ModelMetadata]:
        started = time.perf_counter()
        analysis = await self.provider.analyse_room(image_bytes, mime_type)
        duration_ms = int((time.perf_counter() - started) * 1000)

        analysis = self._post_process(analysis)
        metadata = self.provider.metadata(duration_ms, width, height)

        log_event(
            logger,
            logging.INFO,
            "chain.room_analysis.completed",
            room_type=analysis.room_type,
            primary_style=analysis.primary_style,
            duration_ms=duration_ms,
        )
        return analysis, metadata

    @staticmethod
    def _post_process(analysis: RoomAnalysis) -> RoomAnalysis:
        """Guardrails the model is asked for but must not be trusted to enforce."""
        # A single photograph never justifies absolute certainty.
        analysis.style_confidence = min(max(analysis.style_confidence, 0.35), 0.95)

        # Alternatives must not outrank the primary style, nor duplicate it.
        cleaned = []
        seen = {analysis.primary_style}
        for alt in analysis.alternative_styles:
            if alt.style in seen:
                continue
            seen.add(alt.style)
            alt.confidence_estimate = min(
                max(alt.confidence_estimate, 0.05), analysis.style_confidence - 0.01
            )
            cleaned.append(alt)
        analysis.alternative_styles = sorted(
            cleaned, key=lambda a: a.confidence_estimate, reverse=True
        )[:3]

        if not analysis.dominant_colors:
            analysis.uncertainty_notes = (
                analysis.uncertainty_notes
                or "Colour sampling was limited by the lighting in the photograph."
            )
        return analysis
