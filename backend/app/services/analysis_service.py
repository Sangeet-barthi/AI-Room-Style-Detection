"""Analysis orchestration — the full pipeline in one place.

Pipeline:
    validate/normalise image
    -> Google GenAI room analysis chain (Gemini vision)
      -> deterministic scoring engine
    -> Google GenAI recommendation call
    -> Google GenAI budget call (+ deterministic validator)
      -> persist analysis, images, recommendations
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from typing import Any

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.chains.recommendations import BudgetRecommendationChain, RecommendationChain
from app.ai.chains.room_analysis import RoomAnalysisChain
from app.ai.schemas import BudgetPlan, ImprovementPlan, RoomAnalysis as RoomAnalysisSchema
from app.core.errors import AIProviderError, NotFoundError
from app.core.logging import log_event
from app.models import AnalysisImage, Recommendation, RoomAnalysis, User
from app.services.budget import fallback_budget_plans
from app.services.image_validation import NormalisedImage, validate_and_normalise
from app.services.scoring import compute_scores
from app.storage import get_storage

logger = logging.getLogger("app.services.analysis")
OPTIONAL_AI_TIMEOUT_SECONDS = 20


class AnalysisService:
    def __init__(
        self,
        session: AsyncSession,
        *,
        analysis_chain: RoomAnalysisChain | None = None,
        recommendation_chain: RecommendationChain | None = None,
        budget_chain: BudgetRecommendationChain | None = None,
    ) -> None:
        self.session = session
        self._analysis_chain = analysis_chain
        self._recommendation_chain = recommendation_chain
        self._budget_chain = budget_chain
        self.storage = get_storage()

    # -- lazily built so the provider is only constructed when actually needed
    @property
    def analysis_chain(self) -> RoomAnalysisChain:
        if self._analysis_chain is None:
            self._analysis_chain = RoomAnalysisChain()
        return self._analysis_chain

    @property
    def recommendation_chain(self) -> RecommendationChain:
        if self._recommendation_chain is None:
            self._recommendation_chain = RecommendationChain()
        return self._recommendation_chain

    @property
    def budget_chain(self) -> BudgetRecommendationChain:
        if self._budget_chain is None:
            self._budget_chain = BudgetRecommendationChain()
        return self._budget_chain

    # ------------------------------------------------------------------
    # Create
    # ------------------------------------------------------------------
    async def create_analysis(
        self,
        user: User,
        raw_image: bytes,
        *,
        filename: str | None,
        declared_mime: str | None,
        title: str | None = None,
    ) -> RoomAnalysis:
        normalised = validate_and_normalise(
            raw_image, filename=filename, declared_mime=declared_mime
        )

        analysis, metadata = await self.analysis_chain.run(
            normalised.analysis_bytes,
            normalised.analysis_mime,
            normalised.width,
            normalised.height,
        )

        scores = compute_scores(analysis)

        plan = await self._safe_improvements(analysis, scores)
        budget_plans = await self._safe_budgets(analysis, scores, plan)

        record = await self._persist(
            user=user,
            normalised=normalised,
            analysis=analysis,
            metadata=metadata.model_dump(),
            scores=scores,
            plan=plan,
            budget_plans=budget_plans,
            title=title,
        )
        log_event(
            logger,
            logging.INFO,
            "analysis.created",
            analysis_id=str(record.id),
            user_id=str(user.id),
            room_type=record.room_type,
            primary_style=record.primary_style,
            overall_score=record.overall_score,
        )
        return record

    async def _safe_improvements(
        self, analysis: RoomAnalysisSchema, scores: dict[str, Any]
    ) -> ImprovementPlan:
        """The room analysis already succeeded — do not lose it if this step fails."""
        try:
            return await asyncio.wait_for(
                self.recommendation_chain.run(analysis, scores),
                timeout=OPTIONAL_AI_TIMEOUT_SECONDS,
            )
        except (AIProviderError, asyncio.TimeoutError) as exc:
            log_event(
                logger, logging.WARNING, "analysis.recommendations_degraded",
                reason=getattr(exc, "code", "timeout"),
            )
            from app.ai.schemas import Improvement

            return ImprovementPlan(
                summary=scores["overall"]["summary"],
                improvements=[
                    Improvement(
                        title=item,
                        category="quick",
                        reason="Derived from the visual analysis of this room.",
                        expected_impact="Improves the weakest dimension of the room score.",
                        priority="medium",
                    )
                    for item in analysis.suggested_improvements[:8]
                ],
            )

    async def _safe_budgets(
        self,
        analysis: RoomAnalysisSchema,
        scores: dict[str, Any],
        plan: ImprovementPlan,
    ) -> list[BudgetPlan]:
        try:
            result = await asyncio.wait_for(
                self.budget_chain.run(analysis, scores, plan),
                timeout=OPTIONAL_AI_TIMEOUT_SECONDS,
            )
            return result.plans
        except (AIProviderError, asyncio.TimeoutError) as exc:
            log_event(
                logger,
                logging.WARNING,
                "analysis.budgets_degraded",
                reason=getattr(exc, "code", "timeout"),
            )
            return fallback_budget_plans()

    async def _persist(
        self,
        *,
        user: User,
        normalised: NormalisedImage,
        analysis: RoomAnalysisSchema,
        metadata: dict[str, Any],
        scores: dict[str, Any],
        plan: ImprovementPlan,
        budget_plans: list[BudgetPlan],
        title: str | None,
    ) -> RoomAnalysis:
        original = self.storage.save(
            "uploads", normalised.original_bytes, extension=".jpg", mime_type="image/jpeg"
        )
        thumbnail = self.storage.save(
            "uploads", normalised.thumbnail_bytes, extension=".jpg", mime_type="image/jpeg"
        )

        payload = analysis.model_dump()
        payload["model_metadata"] = metadata

        record = RoomAnalysis(
            user_id=user.id,
            title=title or f"{analysis.room_type} · {analysis.primary_style}",
            room_type=analysis.room_type,
            primary_style=analysis.primary_style,
            style_confidence=analysis.style_confidence,
            overall_score=scores["overall"]["score"],
            analysis_json=payload,
            scores_json=scores,
            model_name=metadata.get("model"),
        )
        record.images.append(
            AnalysisImage(
                image_type="original",
                storage_path=original.key,
                mime_type=original.mime_type,
                width=normalised.width,
                height=normalised.height,
                size_bytes=normalised.size_bytes,
            )
        )
        record.images.append(
            AnalysisImage(
                image_type="thumbnail",
                storage_path=thumbnail.key,
                mime_type=thumbnail.mime_type,
                size_bytes=thumbnail.size_bytes,
            )
        )
        record.recommendations.append(
            Recommendation(kind="improvement", payload=plan.model_dump())
        )
        record.recommendations.append(
            Recommendation(
                kind="budget",
                payload={"plans": [p.model_dump() for p in budget_plans]},
            )
        )

        self.session.add(record)
        await self.session.commit()
        await self.session.refresh(record)
        return record

    # ------------------------------------------------------------------
    # Read / delete — always ownership-scoped
    # ------------------------------------------------------------------
    async def get_owned(self, user: User, analysis_id: uuid.UUID) -> RoomAnalysis:
        stmt = select(RoomAnalysis).where(
            RoomAnalysis.id == analysis_id, RoomAnalysis.user_id == user.id
        )
        record = (await self.session.execute(stmt)).scalar_one_or_none()
        if record is None:
            # Same response whether it does not exist or belongs to someone else.
            raise NotFoundError("Analysis not found.")
        return record

    async def list_for_user(
        self,
        user: User,
        *,
        page: int = 1,
        page_size: int = 12,
        room_type: str | None = None,
        style: str | None = None,
        search: str | None = None,
    ) -> tuple[list[RoomAnalysis], int]:
        conditions = [RoomAnalysis.user_id == user.id]
        if room_type:
            conditions.append(RoomAnalysis.room_type == room_type)
        if style:
            conditions.append(RoomAnalysis.primary_style == style)
        if search:
            like = f"%{search.lower()}%"
            conditions.append(
                func.lower(func.coalesce(RoomAnalysis.title, "")).like(like)
            )

        total = (
            await self.session.execute(
                select(func.count()).select_from(RoomAnalysis).where(*conditions)
            )
        ).scalar_one()

        stmt = (
            select(RoomAnalysis)
            .where(*conditions)
            .order_by(RoomAnalysis.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        rows = list((await self.session.execute(stmt)).scalars().all())
        return rows, int(total)

    async def delete_analysis(self, user: User, analysis_id: uuid.UUID) -> None:
        record = await self.get_owned(user, analysis_id)
        keys = [image.storage_path for image in record.images]
        keys += [m.storage_path for m in record.makeovers if m.storage_path]
        keys += [r.file_path for r in record.reports]

        await self.session.execute(
            delete(RoomAnalysis).where(RoomAnalysis.id == record.id)
        )
        await self.session.commit()

        for key in keys:
            self.storage.delete(key)

    async def stats_for_user(self, user: User) -> dict[str, Any]:
        base = select(RoomAnalysis).where(RoomAnalysis.user_id == user.id)

        total = (
            await self.session.execute(
                select(func.count()).select_from(RoomAnalysis).where(
                    RoomAnalysis.user_id == user.id
                )
            )
        ).scalar_one()

        avg_score = (
            await self.session.execute(
                select(func.avg(RoomAnalysis.overall_score)).where(
                    RoomAnalysis.user_id == user.id
                )
            )
        ).scalar_one()

        style_rows = (
            await self.session.execute(
                select(RoomAnalysis.primary_style, func.count())
                .where(RoomAnalysis.user_id == user.id)
                .group_by(RoomAnalysis.primary_style)
            )
        ).all()

        room_rows = (
            await self.session.execute(
                select(RoomAnalysis.room_type, func.count())
                .where(RoomAnalysis.user_id == user.id)
                .group_by(RoomAnalysis.room_type)
            )
        ).all()

        latest = (
            await self.session.execute(base.order_by(RoomAnalysis.created_at.desc()).limit(5))
        ).scalars().all()

        from app.models import Report

        report_count = (
            await self.session.execute(
                select(func.count())
                .select_from(Report)
                .join(RoomAnalysis, Report.analysis_id == RoomAnalysis.id)
                .where(RoomAnalysis.user_id == user.id)
            )
        ).scalar_one()

        return {
            "total_analyses": int(total),
            "average_health_score": int(round(avg_score)) if avg_score else 0,
            "reports_created": int(report_count),
            "style_distribution": [
                {"style": style, "count": int(count)} for style, count in style_rows
            ],
            "room_type_distribution": [
                {"room_type": room, "count": int(count)} for room, count in room_rows
            ],
            "score_trend": [
                {
                    "id": str(item.id),
                    "label": item.created_at.strftime("%d %b"),
                    "score": item.overall_score,
                    "style": item.primary_style,
                }
                for item in reversed(list(latest))
            ],
        }
