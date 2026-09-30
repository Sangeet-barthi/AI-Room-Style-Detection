"""Seed script: python -m app.db.seed

Creates a demo user (credentials come from the environment, never from source
control) plus one fully-formed sample analysis so the dashboard, history,
recommendations, budgets and report pages all have something to show before the
first real upload.

The sample analysis is clearly labelled as sample data and is only created when
DEMO_MODE=true.
"""
from __future__ import annotations

import asyncio
import io
import secrets
import sys

from PIL import Image, ImageDraw
from sqlalchemy import select

from app.ai.schemas import (
    AlternativeStyle,
    DominantColor,
    FurnitureItem,
    Improvement,
    ImprovementPlan,
    LightingObservations,
    MaterialItem,
    RoomAnalysis as RoomAnalysisSchema,
    SpaceObservations,
    VentilationObservations,
)
from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import AnalysisImage, Recommendation, RoomAnalysis, User
from app.services.budget import fallback_budget_plans
from app.services.scoring import compute_scores
from app.storage import get_storage


def _sample_room_image() -> bytes:
    """A generated placeholder room graphic — no third-party asset required."""
    width, height = 1200, 800
    image = Image.new("RGB", (width, height), "#EFE9E0")
    draw = ImageDraw.Draw(image)

    draw.rectangle([0, 0, width, 470], fill="#E7E0D5")          # wall
    draw.rectangle([0, 470, width, height], fill="#C9B79C")     # floor
    draw.rectangle([120, 90, 470, 420], fill="#DCE8EE", outline="#B9AE9C", width=6)
    draw.line([295, 90, 295, 420], fill="#B9AE9C", width=6)     # window
    draw.rectangle([620, 300, 1080, 470], fill="#8E8272")       # sofa body
    draw.rectangle([620, 250, 1080, 320], fill="#9D907E")       # sofa back
    draw.rectangle([700, 500, 1000, 560], fill="#6E6152")       # table
    draw.ellipse([180, 520, 300, 640], fill="#7E8B6C")          # plant
    draw.rectangle([230, 600, 250, 680], fill="#6E6152")

    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=88)
    return buffer.getvalue()


def _sample_analysis() -> RoomAnalysisSchema:
    return RoomAnalysisSchema(
        room_type="Living Room",
        primary_style="Modern",
        style_confidence=0.88,
        alternative_styles=[
            AlternativeStyle(
                style="Minimalist",
                confidence_estimate=0.62,
                supporting_evidence=[
                    "restrained decorative objects",
                    "largely uninterrupted wall surfaces",
                ],
            ),
            AlternativeStyle(
                style="Coastal",
                confidence_estimate=0.31,
                supporting_evidence=["light neutral palette", "generous daylight"],
            ),
        ],
        style_evidence=[
            "low-profile neutral sofa with clean horizontal lines",
            "large uncovered window along the left wall",
            "matte wall finish with no mouldings or panelling",
            "uncluttered floor plane with a single low table",
        ],
        style_explanation=(
            "The room reads as Modern because the seating is low, linear and neutral, the "
            "walls are flat and unornamented, and the arrangement is deliberately "
            "uncluttered. Minimalist was the closest alternative, but the layered "
            "textiles and the presence of decorative greenery place it just outside a "
            "strictly minimalist reading. The palette stays within warm neutrals, which "
            "reinforces the contemporary rather than traditional character."
        ),
        furniture=[
            FurnitureItem(
                name="Three-seat sofa",
                description="Low-back fabric sofa in a warm taupe tone",
                evidence_type="observed",
            ),
            FurnitureItem(
                name="Low coffee table",
                description="Rectangular wooden table with a flat top",
                evidence_type="observed",
            ),
            FurnitureItem(
                name="Floor plant",
                description="Large-leaf plant in a floor-standing pot",
                evidence_type="observed",
            ),
        ],
        wall_color="Warm off-white with a matte finish",
        flooring="Light wood-toned flooring",
        materials=[
            MaterialItem(name="Wood", where_seen="coffee table and flooring"),
            MaterialItem(name="Glass", where_seen="window glazing"),
            MaterialItem(name="Fabric", where_seen="sofa upholstery"),
        ],
        dominant_colors=[
            DominantColor(name="Warm Off-White", hex="#E7E0D5", coverage="dominant"),
            DominantColor(name="Sand", hex="#C9B79C", coverage="dominant"),
            DominantColor(name="Taupe", hex="#8E8272", coverage="secondary"),
            DominantColor(name="Sage", hex="#7E8B6C", coverage="accent"),
        ],
        color_temperature="warm",
        lighting_observations=LightingObservations(
            natural_light_visible=True,
            window_count_visible=1,
            window_openness="large",
            overall_brightness="bright",
            artificial_light_sources_visible=0,
            light_distribution="mixed",
            notes="Daylight enters from a single large window on the left wall.",
        ),
        ventilation_observations=VentilationObservations(
            openable_windows_visible=1,
            doors_or_openings_visible=1,
            cross_ventilation_possible=False,
            mechanical_ventilation_visible=False,
            room_openness="semi_open",
            notes="Openings appear on one wall only in this view.",
        ),
        space_utilization_observations=SpaceObservations(
            furniture_density="balanced",
            walking_clearance="generous",
            clutter_level="low",
            layout_balance="good",
            vertical_storage_used=False,
            notes="The floor plane is clear and circulation is unobstructed.",
        ),
        strengths=[
            "strong daylight from a large window",
            "clear circulation around the seating",
            "coherent warm neutral palette",
        ],
        weaknesses=[
            "no visible artificial lighting for evening use",
            "vertical wall area is entirely unused",
            "single opening limits apparent airflow",
        ],
        suggested_improvements=[
            "Add a floor lamp beside the sofa to create an evening light layer",
            "Introduce a wall-mounted shelf above the sofa to use vertical space",
            "Layer a textured rug under the coffee table to define the seating zone",
            "Add sheer window treatment to soften midday glare",
        ],
        detected_features=[
            "large window",
            "open floor plane",
            "single seating cluster",
            "unadorned walls",
        ],
        uncertainty_notes=(
            "This is sample data generated by the seed script, not a real photograph."
        ),
    )


async def seed() -> None:
    email = settings.demo_user_email.strip().lower()
    password = settings.demo_user_password

    if not password:
        password = secrets.token_urlsafe(12)
        print(
            "DEMO_USER_PASSWORD is not set. A random password was generated for this "
            "run — set it in .env to get a stable demo login."
        )

    async with SessionLocal() as session:
        existing = (
            await session.execute(select(User).where(User.email == email))
        ).scalar_one_or_none()

        if existing:
            user = existing
            print(f"Demo user already exists: {email}")
        else:
            user = User(
                email=email,
                full_name="Demo Designer",
                password_hash=hash_password(password),
                is_demo=True,
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
            print(f"Created demo user: {email}")
            print(f"Password: {password}")

        if not settings.demo_mode:
            print("DEMO_MODE is false — skipping the sample analysis.")
            return

        already = (
            await session.execute(
                select(RoomAnalysis).where(RoomAnalysis.user_id == user.id)
            )
        ).scalars().first()
        if already:
            print("Sample analysis already present — nothing else to seed.")
            return

        analysis = _sample_analysis()
        scores = compute_scores(analysis)

        storage = get_storage()
        image_bytes = _sample_room_image()
        original = storage.save(
            "uploads", image_bytes, extension=".jpg", mime_type="image/jpeg"
        )

        with Image.open(io.BytesIO(image_bytes)) as img:
            thumb = img.copy()
            thumb.thumbnail((480, 480))
            thumb_buffer = io.BytesIO()
            thumb.save(thumb_buffer, format="JPEG", quality=78)
        thumbnail = storage.save(
            "uploads", thumb_buffer.getvalue(), extension=".jpg", mime_type="image/jpeg"
        )

        payload = analysis.model_dump()
        payload["model_metadata"] = {
            "provider": "seed",
            "model": "sample-data",
            "duration_ms": 0,
            "image_width": 1200,
            "image_height": 800,
        }

        record = RoomAnalysis(
            user_id=user.id,
            title="Sample · Living Room · Modern",
            room_type=analysis.room_type,
            primary_style=analysis.primary_style,
            style_confidence=analysis.style_confidence,
            overall_score=scores["overall"]["score"],
            analysis_json=payload,
            scores_json=scores,
            model_name="sample-data",
        )
        record.images.append(
            AnalysisImage(
                image_type="original",
                storage_path=original.key,
                mime_type="image/jpeg",
                width=1200,
                height=800,
                size_bytes=original.size_bytes,
            )
        )
        record.images.append(
            AnalysisImage(
                image_type="thumbnail",
                storage_path=thumbnail.key,
                mime_type="image/jpeg",
                size_bytes=thumbnail.size_bytes,
            )
        )

        plan = ImprovementPlan(
            summary=(
                "A bright, well-proportioned living room with a coherent modern palette. "
                "The two clear gaps are evening lighting and unused vertical wall area; "
                "both are inexpensive to address."
            ),
            improvements=[
                Improvement(
                    title="Reposition the plant to the window corner",
                    category="quick",
                    reason="It currently sits away from the daylight source.",
                    expected_impact="Healthier greenery and a clearer sightline to the window.",
                    priority="medium",
                ),
                Improvement(
                    title="Add a warm-toned floor lamp beside the sofa",
                    category="lighting",
                    reason="No artificial light source is visible, so the room is daylight-only.",
                    expected_impact="A usable evening ambience and a second light layer.",
                    priority="high",
                    estimated_cost_inr=1800,
                ),
                Improvement(
                    title="Mount a slim shelf above the sofa",
                    category="furniture",
                    reason="Vertical wall area is entirely unused above the seating.",
                    expected_impact="Storage and display without consuming floor area.",
                    priority="high",
                    estimated_cost_inr=3200,
                ),
                Improvement(
                    title="Layer a low-pile rug under the coffee table",
                    category="material",
                    reason="The floor plane is visually flat and the seating zone is undefined.",
                    expected_impact="A defined seating zone and added textural depth.",
                    priority="medium",
                    estimated_cost_inr=5500,
                ),
                Improvement(
                    title="Introduce two accent cushions in sage",
                    category="color",
                    reason="The palette is warm-neutral with only one cool accent.",
                    expected_impact="A more resolved colour story tying the plant to the sofa.",
                    priority="low",
                    estimated_cost_inr=1200,
                ),
            ],
        )
        record.recommendations.append(
            Recommendation(kind="improvement", payload=plan.model_dump())
        )
        record.recommendations.append(
            Recommendation(
                kind="budget",
                payload={"plans": [p.model_dump() for p in fallback_budget_plans()]},
            )
        )

        session.add(record)
        await session.commit()
        print("Created sample analysis with recommendations and budget packages.")


def main() -> int:
    asyncio.run(seed())
    return 0


if __name__ == "__main__":
    sys.exit(main())
