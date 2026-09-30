"""Makeover visualization service.

AI image generation is optional and explicit. If it is disabled or fails, the
deterministic design mockup is produced instead and the request still succeeds.
"""
from __future__ import annotations

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.chains.makeover import MakeoverPromptChain
from app.ai.image_gen import (
    STYLE_MOCKUP_DEFAULTS,
    STYLE_PALETTES,
    get_fallback_provider,
    get_image_generation_provider,
)
from app.ai.schemas import MakeoverPrompt, RoomAnalysis as RoomAnalysisSchema
from app.core.errors import AIProviderError, ValidationError
from app.core.logging import log_event
from app.models import MakeoverVisualization, RoomAnalysis
from app.storage import get_storage

logger = logging.getLogger("app.services.makeover")

VALID_STYLES = tuple(STYLE_PALETTES.keys())


def _deterministic_prompt(
    analysis: RoomAnalysisSchema, target_style: str
) -> MakeoverPrompt:
    """Used when the text model is unavailable — keeps the mockup path alive."""
    defaults = STYLE_MOCKUP_DEFAULTS.get(target_style, STYLE_MOCKUP_DEFAULTS["Modern"])
    palette = STYLE_PALETTES.get(target_style, STYLE_PALETTES["Modern"])
    from app.ai.schemas import DominantColor

    return MakeoverPrompt(
        target_style=target_style,  # type: ignore[arg-type]
        prompt=(
            f"Interior design photograph of a {analysis.room_type.lower()} restyled in a "
            f"{target_style.lower()} direction, preserving the existing window and door "
            "positions, room proportions and wide-angle camera viewpoint, natural "
            "daylight, photorealistic architectural view."
        ),
        negative_prompt="text, watermark, people, distorted furniture, warped perspective",
        palette=[DominantColor(name=c["name"], hex=c["hex"], coverage="secondary") for c in palette],
        furniture_changes=defaults["furniture"],
        lighting_changes=defaults["lighting"],
        decor_changes=defaults["decor"],
        material_changes=defaults["materials"],
    )


class MakeoverService:
    def __init__(
        self, session: AsyncSession, *, prompt_chain: MakeoverPromptChain | None = None
    ) -> None:
        self.session = session
        self._prompt_chain = prompt_chain
        self.storage = get_storage()

    @property
    def prompt_chain(self) -> MakeoverPromptChain:
        if self._prompt_chain is None:
            self._prompt_chain = MakeoverPromptChain()
        return self._prompt_chain

    async def list_for_analysis(
        self, analysis_id: uuid.UUID
    ) -> list[MakeoverVisualization]:
        stmt = (
            select(MakeoverVisualization)
            .where(MakeoverVisualization.analysis_id == analysis_id)
            .order_by(MakeoverVisualization.created_at.desc())
        )
        return list((await self.session.execute(stmt)).scalars().all())

    async def get_cached(
        self, analysis_id: uuid.UUID, target_style: str
    ) -> MakeoverVisualization | None:
        stmt = (
            select(MakeoverVisualization)
            .where(
                MakeoverVisualization.analysis_id == analysis_id,
                MakeoverVisualization.target_style == target_style,
                MakeoverVisualization.kind == "ai_concept",
            )
            .order_by(MakeoverVisualization.created_at.desc())
            .limit(1)
        )
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def generate(
        self, analysis: RoomAnalysis, target_style: str, *, force: bool = False
    ) -> MakeoverVisualization:
        if target_style not in VALID_STYLES:
            raise ValidationError(
                f"'{target_style}' is not a supported target style.",
                code="invalid_style",
                details={"supported": list(VALID_STYLES)},
            )

        # Cost control: never regenerate an existing AI concept unless asked.
        if not force:
            cached = await self.get_cached(analysis.id, target_style)
            if cached is not None:
                log_event(
                    logger, logging.INFO, "makeover.cache_hit",
                    analysis_id=str(analysis.id), target_style=target_style,
                )
                return cached

        parsed = RoomAnalysisSchema.model_validate(
            {k: v for k, v in analysis.analysis_json.items() if k != "model_metadata"}
        )

        try:
            spec = await self.prompt_chain.run(parsed, target_style)
        except AIProviderError as exc:
            log_event(
                logger, logging.WARNING, "makeover.prompt_degraded", reason=exc.code
            )
            spec = _deterministic_prompt(parsed, target_style)

        provider = get_image_generation_provider()
        result = await provider.generate(spec)

        if not result.success:
            fallback = get_fallback_provider()
            mockup_result = await fallback.generate(spec)
            record = MakeoverVisualization(
                analysis_id=analysis.id,
                target_style=target_style,
                provider=fallback.name,
                kind="design_mockup",
                prompt=spec.prompt,
                storage_path=None,
                mockup_json=mockup_result.mockup,
                note=result.note or mockup_result.note,
            )
        else:
            storage_path = None
            if result.image_bytes:
                stored = self.storage.save(
                    "generated",
                    result.image_bytes,
                    extension=".png",
                    mime_type=result.mime_type,
                )
                storage_path = stored.key

            mockup = (await get_fallback_provider().generate(spec)).mockup
            record = MakeoverVisualization(
                analysis_id=analysis.id,
                target_style=target_style,
                provider=result.provider,
                kind=result.kind,
                prompt=spec.prompt,
                storage_path=storage_path,
                mockup_json=mockup,
                note="AI Concept Visualization",
            )

        self.session.add(record)
        await self.session.commit()
        await self.session.refresh(record)
        log_event(
            logger, logging.INFO, "makeover.created",
            analysis_id=str(analysis.id), kind=record.kind, provider=record.provider,
        )
        return record
