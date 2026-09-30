from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Any

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import GUID, Base, JSONType, TimestampMixin, UUIDPrimaryKeyMixin, utcnow

if TYPE_CHECKING:
    from app.models.report import Report
    from app.models.user import User


class RoomAnalysis(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "room_analyses"
    __table_args__ = (
        Index("ix_room_analyses_user_created", "user_id", "created_at"),
        Index("ix_room_analyses_user_style", "user_id", "primary_style"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str | None] = mapped_column(String(160), nullable=True)
    room_type: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    primary_style: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    style_confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    overall_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    analysis_json: Mapped[dict[str, Any]] = mapped_column(JSONType, nullable=False)
    scores_json: Mapped[dict[str, Any]] = mapped_column(JSONType, nullable=False)
    model_name: Mapped[str | None] = mapped_column(String(80), nullable=True)

    user: Mapped[User] = relationship(back_populates="analyses")
    images: Mapped[list[AnalysisImage]] = relationship(
        back_populates="analysis", cascade="all, delete-orphan", lazy="selectin"
    )
    recommendations: Mapped[list[Recommendation]] = relationship(
        back_populates="analysis", cascade="all, delete-orphan", lazy="selectin"
    )
    makeovers: Mapped[list[MakeoverVisualization]] = relationship(
        back_populates="analysis", cascade="all, delete-orphan", lazy="selectin"
    )
    reports: Mapped[list[Report]] = relationship(
        back_populates="analysis", cascade="all, delete-orphan", lazy="selectin"
    )

    @property
    def original_image(self) -> AnalysisImage | None:
        return next((img for img in self.images if img.image_type == "original"), None)

    @property
    def thumbnail_image(self) -> AnalysisImage | None:
        return next((img for img in self.images if img.image_type == "thumbnail"), None)


class AnalysisImage(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "analysis_images"

    analysis_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("room_analyses.id", ondelete="CASCADE"), index=True, nullable=False
    )
    image_type: Mapped[str] = mapped_column(String(32), nullable=False)  # original|thumbnail|makeover
    storage_path: Mapped[str] = mapped_column(String(512), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(64), nullable=False)
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    analysis: Mapped[RoomAnalysis] = relationship(back_populates="images")


class Recommendation(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "recommendations"

    analysis_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("room_analyses.id", ondelete="CASCADE"), index=True, nullable=False
    )
    kind: Mapped[str] = mapped_column(String(32), nullable=False)  # improvement|budget
    payload: Mapped[dict[str, Any]] = mapped_column(JSONType, nullable=False)

    analysis: Mapped[RoomAnalysis] = relationship(back_populates="recommendations")


class MakeoverVisualization(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "makeover_visualizations"

    analysis_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("room_analyses.id", ondelete="CASCADE"), index=True, nullable=False
    )
    target_style: Mapped[str] = mapped_column(String(64), nullable=False)
    provider: Mapped[str] = mapped_column(String(64), nullable=False)
    kind: Mapped[str] = mapped_column(String(32), nullable=False)  # ai_concept|design_mockup
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    storage_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    mockup_json: Mapped[dict[str, Any]] = mapped_column(JSONType, nullable=False, default=dict)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    analysis: Mapped[RoomAnalysis] = relationship(back_populates="makeovers")
