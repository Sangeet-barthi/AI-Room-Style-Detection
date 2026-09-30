"""Report orchestration: assemble persisted data, render PDF, persist file."""
from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.chains.report_content import ReportNarrativeChain, fallback_narrative
from app.ai.schemas import ImprovementPlan, RoomAnalysis as RoomAnalysisSchema
from app.core.errors import AIProviderError, NotFoundError
from app.core.logging import log_event
from app.models import MakeoverVisualization, Report, RoomAnalysis, User
from app.services.report_generator import ReportLabReportGenerator
from app.storage import get_storage

logger = logging.getLogger("app.services.report")


class ReportService:
    def __init__(
        self,
        session: AsyncSession,
        *,
        generator: ReportLabReportGenerator | None = None,
        narrative_chain: ReportNarrativeChain | None = None,
    ) -> None:
        self.session = session
        self.generator = generator or ReportLabReportGenerator()
        self._narrative_chain = narrative_chain
        self.storage = get_storage()

    @property
    def narrative_chain(self) -> ReportNarrativeChain:
        if self._narrative_chain is None:
            self._narrative_chain = ReportNarrativeChain()
        return self._narrative_chain

    async def generate(self, analysis: RoomAnalysis, user: User) -> Report:
        payload = dict(analysis.analysis_json)
        payload.pop("model_metadata", None)
        parsed = RoomAnalysisSchema.model_validate(payload)
        scores = analysis.scores_json

        improvements = next(
            (r.payload for r in analysis.recommendations if r.kind == "improvement"),
            {"summary": "", "improvements": []},
        )
        budgets = next(
            (r.payload.get("plans", []) for r in analysis.recommendations if r.kind == "budget"),
            [],
        )

        plan = ImprovementPlan.model_validate(improvements)
        try:
            narrative = await self.narrative_chain.run(parsed, scores, plan)
        except AIProviderError as exc:
            log_event(logger, logging.WARNING, "report.narrative_degraded", reason=exc.code)
            narrative = fallback_narrative(parsed, scores, plan)

        image_bytes = self._read_optional(
            analysis.original_image.storage_path if analysis.original_image else None
        )

        makeover_record = self._latest_makeover(analysis)
        makeover_context = None
        makeover_bytes = None
        if makeover_record is not None:
            makeover_context = {
                "target_style": makeover_record.target_style,
                "kind": makeover_record.kind,
                "mockup": makeover_record.mockup_json,
            }
            makeover_bytes = self._read_optional(makeover_record.storage_path)

        pdf_bytes = self.generator.build(
            {
                "analysis": analysis.analysis_json,
                "scores": scores,
                "improvements": improvements,
                "budgets": budgets,
                "narrative": narrative.model_dump(),
                "makeover": makeover_context,
                "makeover_image_bytes": makeover_bytes,
                "image_bytes": image_bytes,
                "user": {"full_name": user.full_name, "email": user.email},
            }
        )

        stored = self.storage.save(
            "reports", pdf_bytes, extension=".pdf", mime_type="application/pdf"
        )
        file_name = (
            f"RoomStyleAI_{analysis.room_type.replace(' ', '')}_"
            f"{analysis.primary_style}_{datetime.now(UTC).strftime('%Y%m%d')}.pdf"
        )
        report = Report(
            analysis_id=analysis.id,
            file_path=stored.key,
            file_name=file_name,
            size_bytes=stored.size_bytes,
        )
        self.session.add(report)
        await self.session.commit()
        await self.session.refresh(report)

        log_event(
            logger, logging.INFO, "report.created",
            report_id=str(report.id), analysis_id=str(analysis.id), size_bytes=stored.size_bytes,
        )
        return report

    @staticmethod
    def _latest_makeover(analysis: RoomAnalysis) -> MakeoverVisualization | None:
        if not analysis.makeovers:
            return None
        ai_first = sorted(
            analysis.makeovers,
            key=lambda m: (m.kind != "ai_concept", -m.created_at.timestamp()),
        )
        return ai_first[0]

    def _read_optional(self, key: str | None) -> bytes | None:
        if not key:
            return None
        try:
            return self.storage.read(key)
        except NotFoundError:
            return None

    async def get_owned(self, user: User, report_id: uuid.UUID) -> Report:
        stmt = (
            select(Report)
            .join(RoomAnalysis, Report.analysis_id == RoomAnalysis.id)
            .where(Report.id == report_id, RoomAnalysis.user_id == user.id)
        )
        report = (await self.session.execute(stmt)).scalar_one_or_none()
        if report is None:
            raise NotFoundError("Report not found.")
        return report

    async def list_for_user(self, user: User) -> list[tuple[Report, RoomAnalysis]]:
        stmt = (
            select(Report, RoomAnalysis)
            .join(RoomAnalysis, Report.analysis_id == RoomAnalysis.id)
            .where(RoomAnalysis.user_id == user.id)
            .order_by(Report.created_at.desc())
        )
        return [(row[0], row[1]) for row in (await self.session.execute(stmt)).all()]
