"""Initial schema: users, room analyses, images, recommendations, makeovers, reports

Revision ID: 0001
Revises:
Create Date: 2026-01-01
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

from app.db.base import GUID, JSONType

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", GUID(), primary_key=True, nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("full_name", sa.String(length=120), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("is_demo", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "room_analyses",
        sa.Column("id", GUID(), primary_key=True, nullable=False),
        sa.Column("user_id", GUID(), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=True),
        sa.Column("room_type", sa.String(length=64), nullable=False),
        sa.Column("primary_style", sa.String(length=64), nullable=False),
        sa.Column("style_confidence", sa.Float(), nullable=False, server_default="0"),
        sa.Column("overall_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("analysis_json", JSONType(), nullable=False),
        sa.Column("scores_json", JSONType(), nullable=False),
        sa.Column("model_name", sa.String(length=80), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_room_analyses_user_id", "room_analyses", ["user_id"])
    op.create_index("ix_room_analyses_room_type", "room_analyses", ["room_type"])
    op.create_index("ix_room_analyses_primary_style", "room_analyses", ["primary_style"])
    op.create_index(
        "ix_room_analyses_user_created", "room_analyses", ["user_id", "created_at"]
    )
    op.create_index(
        "ix_room_analyses_user_style", "room_analyses", ["user_id", "primary_style"]
    )

    op.create_table(
        "analysis_images",
        sa.Column("id", GUID(), primary_key=True, nullable=False),
        sa.Column("analysis_id", GUID(), nullable=False),
        sa.Column("image_type", sa.String(length=32), nullable=False),
        sa.Column("storage_path", sa.String(length=512), nullable=False),
        sa.Column("mime_type", sa.String(length=64), nullable=False),
        sa.Column("width", sa.Integer(), nullable=True),
        sa.Column("height", sa.Integer(), nullable=True),
        sa.Column("size_bytes", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["analysis_id"], ["room_analyses.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_analysis_images_analysis_id", "analysis_images", ["analysis_id"])

    op.create_table(
        "recommendations",
        sa.Column("id", GUID(), primary_key=True, nullable=False),
        sa.Column("analysis_id", GUID(), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("payload", JSONType(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["analysis_id"], ["room_analyses.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_recommendations_analysis_id", "recommendations", ["analysis_id"])

    op.create_table(
        "makeover_visualizations",
        sa.Column("id", GUID(), primary_key=True, nullable=False),
        sa.Column("analysis_id", GUID(), nullable=False),
        sa.Column("target_style", sa.String(length=64), nullable=False),
        sa.Column("provider", sa.String(length=64), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("storage_path", sa.String(length=512), nullable=True),
        sa.Column("mockup_json", JSONType(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["analysis_id"], ["room_analyses.id"], ondelete="CASCADE"),
    )
    op.create_index(
        "ix_makeover_visualizations_analysis_id", "makeover_visualizations", ["analysis_id"]
    )

    op.create_table(
        "reports",
        sa.Column("id", GUID(), primary_key=True, nullable=False),
        sa.Column("analysis_id", GUID(), nullable=False),
        sa.Column("file_path", sa.String(length=512), nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["analysis_id"], ["room_analyses.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_reports_analysis_id", "reports", ["analysis_id"])


def downgrade() -> None:
    op.drop_table("reports")
    op.drop_table("makeover_visualizations")
    op.drop_table("recommendations")
    op.drop_table("analysis_images")
    op.drop_table("room_analyses")
    op.drop_table("users")
