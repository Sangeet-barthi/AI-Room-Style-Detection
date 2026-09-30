"""Pytest fixtures: SQLite test database, HTTP client, stub AI provider."""
from __future__ import annotations

import io
import os
import tempfile
from collections.abc import AsyncGenerator
from pathlib import Path

import pytest

TEST_DIR = Path(tempfile.mkdtemp(prefix="roomstyle-tests-"))
os.environ.update(
    {
        "APP_ENV": "test",
        "DEBUG": "false",
        "DATABASE_URL": f"sqlite+aiosqlite:///{TEST_DIR / 'test.db'}",
        "JWT_SECRET_KEY": "test-secret-key-that-is-long-enough-for-tests",
        "ACCESS_TOKEN_EXPIRE_MINUTES": "30",
        "UPLOAD_DIR": str(TEST_DIR / "uploads"),
        "REPORT_DIR": str(TEST_DIR / "reports"),
        "GENERATED_DIR": str(TEST_DIR / "generated"),
        "GEMINI_API_KEY": "test-key",
        "RATE_LIMIT_ENABLED": "false",
        "MAX_UPLOAD_MB": "2",
        "PIXAZO_IMAGE_PROVIDER_ENABLED": "false",
    }
)

from httpx import ASGITransport, AsyncClient  # noqa: E402
from PIL import Image  # noqa: E402

from app.ai.schemas import (  # noqa: E402
    AlternativeStyle,
    BudgetItem,
    BudgetPlan,
    BudgetPlanSet,
    DominantColor,
    FurnitureItem,
    Improvement,
    ImprovementPlan,
    LightingObservations,
    MakeoverPrompt,
    MaterialItem,
    ModelMetadata,
    ReportNarrative,
    RoomAnalysis,
    SpaceObservations,
    VentilationObservations,
)
from app.ai.provider import VisionAnalysisProvider  # noqa: E402
from app.core.rate_limit import limiter  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.session import engine  # noqa: E402
from app.main import app  # noqa: E402


def sample_analysis() -> RoomAnalysis:
    return RoomAnalysis(
        room_type="Living Room",
        primary_style="Modern",
        style_confidence=0.88,
        alternative_styles=[
            AlternativeStyle(
                style="Minimalist",
                confidence_estimate=0.55,
                supporting_evidence=["sparse decoration"],
            )
        ],
        style_evidence=["clean lines", "neutral palette"],
        style_explanation="Clean lines and a neutral palette dominate the room.",
        furniture=[FurnitureItem(name="Sofa", description="Low neutral sofa")],
        wall_color="Warm off-white",
        flooring="Light wood",
        materials=[MaterialItem(name="Wood", where_seen="flooring")],
        dominant_colors=[DominantColor(name="Off White", hex="#EFEAE2", coverage="dominant")],
        color_temperature="warm",
        lighting_observations=LightingObservations(
            natural_light_visible=True,
            window_count_visible=1,
            window_openness="large",
            overall_brightness="bright",
            artificial_light_sources_visible=1,
            light_distribution="even",
        ),
        ventilation_observations=VentilationObservations(
            openable_windows_visible=1,
            doors_or_openings_visible=1,
            cross_ventilation_possible=False,
            room_openness="semi_open",
        ),
        space_utilization_observations=SpaceObservations(
            furniture_density="balanced",
            walking_clearance="generous",
            clutter_level="low",
            layout_balance="good",
            vertical_storage_used=False,
        ),
        strengths=["bright"],
        weaknesses=["no evening lighting"],
        suggested_improvements=["Add a floor lamp"],
        detected_features=["large window"],
    )


class StubVisionProvider(VisionAnalysisProvider):
    """Deterministic in-memory provider so tests never hit the network."""

    name = "stub"

    def __init__(self) -> None:
        self.calls: list[str] = []
        self.fail_with: Exception | None = None

    async def analyse_room(self, image_bytes: bytes, mime_type: str) -> RoomAnalysis:
        self.calls.append("analyse_room")
        if self.fail_with:
            raise self.fail_with
        return sample_analysis()

    async def run_structured(self, prompt: str, schema, *, system=None):  # type: ignore[no-untyped-def]
        self.calls.append(schema.__name__)
        if self.fail_with:
            raise self.fail_with
        if schema is ImprovementPlan:
            return ImprovementPlan(
                summary="A bright modern room that needs an evening lighting layer.",
                improvements=[
                    Improvement(
                        title="Add a warm floor lamp",
                        category="lighting",
                        reason="No artificial light source is visible.",
                        expected_impact="Usable evening ambience.",
                        priority="high",
                        estimated_cost_inr=1800,
                    )
                ],
            )
        if schema is BudgetPlanSet:
            return BudgetPlanSet(
                plans=[
                    BudgetPlan(
                        budget=5000,
                        items=[
                            BudgetItem(
                                name="Floor lamp",
                                estimated_cost=1800,
                                reason="Adds an evening light layer.",
                                priority="high",
                            ),
                            BudgetItem(
                                name="Cushion set",
                                estimated_cost=1200,
                                reason="Resolves the palette.",
                                priority="low",
                            ),
                        ],
                        total_estimated_cost=3000,
                        remaining=2000,
                    ),
                    BudgetPlan(
                        budget=20000,
                        items=[
                            BudgetItem(
                                name="Area rug",
                                estimated_cost=6500,
                                reason="Defines the seating zone.",
                                priority="high",
                            )
                        ],
                        total_estimated_cost=6500,
                        remaining=13500,
                    ),
                    BudgetPlan(
                        budget=50000,
                        items=[
                            BudgetItem(
                                name="Replacement sofa",
                                estimated_cost=22000,
                                reason="Sets the style of the whole room.",
                                priority="high",
                            )
                        ],
                        total_estimated_cost=22000,
                        remaining=28000,
                    ),
                ]
            )
        if schema is MakeoverPrompt:
            return MakeoverPrompt(
                target_style="Minimalist",
                prompt="Interior design photograph of a minimalist living room.",
                negative_prompt="text, watermark",
                palette=[DominantColor(name="Paper White", hex="#F8F7F4")],
                furniture_changes=["Reduce to essential pieces"],
                lighting_changes=["Even diffused ceiling light"],
                decor_changes=["One object per surface"],
                material_changes=["Pale oak and matte white"],
            )
        if schema is ReportNarrative:
            return ReportNarrative(
                executive_summary="A bright modern living room.",
                style_narrative="Modern was chosen for its clean lines.",
                health_narrative="Lighting is strong; ventilation is limited.",
                closing_note="Start with the lighting layer.",
            )
        raise AssertionError(f"Unexpected schema requested: {schema}")

    def metadata(self, duration_ms: int, width: int, height: int) -> ModelMetadata:
        return ModelMetadata(
            provider=self.name,
            model="stub-model",
            duration_ms=duration_ms,
            image_width=width,
            image_height=height,
        )


@pytest.fixture(autouse=True)
async def _database() -> AsyncGenerator[None, None]:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    limiter.reset()
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
def stub_provider(monkeypatch) -> StubVisionProvider:  # type: ignore[no-untyped-def]
    provider = StubVisionProvider()
    import app.ai.chains.makeover as makeover_chain
    import app.ai.chains.recommendations as rec_chain
    import app.ai.chains.report_content as report_chain
    import app.ai.chains.room_analysis as analysis_chain
    import app.ai.provider as provider_module

    monkeypatch.setattr(provider_module, "get_vision_provider", lambda: provider)
    for module in (analysis_chain, rec_chain, report_chain, makeover_chain):
        monkeypatch.setattr(module, "get_vision_provider", lambda: provider, raising=False)
    return provider


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def room_image() -> bytes:
    image = Image.new("RGB", (900, 600), "#E7E0D5")
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=85)
    return buffer.getvalue()


@pytest.fixture
async def auth_headers(client) -> dict[str, str]:  # type: ignore[no-untyped-def]
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Test Designer",
            "email": "tester@example.com",
            "password": "StrongPass123",
        },
    )
    assert response.status_code == 201, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}
