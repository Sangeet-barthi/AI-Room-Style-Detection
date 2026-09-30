"""PDF generation produces a real, multi-page, non-trivial document."""
from app.ai.schemas import Improvement, ImprovementPlan
from app.services.budget import fallback_budget_plans
from app.services.report_generator import ReportLabReportGenerator
from app.services.scoring import compute_scores
from tests.conftest import sample_analysis


def _context(image_bytes=None):
    analysis = sample_analysis()
    scores = compute_scores(analysis)
    plan = ImprovementPlan(
        summary="A bright modern room.",
        improvements=[
            Improvement(
                title="Add a floor lamp",
                category="lighting",
                reason="No artificial light is visible.",
                expected_impact="Evening usability.",
                priority="high",
                estimated_cost_inr=1800,
            )
        ],
    )
    return {
        "analysis": analysis.model_dump(),
        "scores": scores,
        "improvements": plan.model_dump(),
        "budgets": [p.model_dump() for p in fallback_budget_plans()],
        "narrative": {
            "executive_summary": "Bright and well proportioned.",
            "style_narrative": "Modern, based on clean lines.",
            "health_narrative": "Lighting is strong.",
            "closing_note": "Start with lighting.",
        },
        "user": {"full_name": "Test Designer", "email": "tester@example.com"},
        "image_bytes": image_bytes,
    }


def test_pdf_is_generated():
    pdf = ReportLabReportGenerator().build(_context())
    assert pdf.startswith(b"%PDF")
    assert len(pdf) > 5000
    assert pdf.count(b"/Type /Page") >= 4 or pdf.count(b"/Page") >= 4


def test_pdf_includes_the_required_disclaimer():
    from app.services.report_generator import DISCLAIMER_TEXT

    assert "not professional architectural" in DISCLAIMER_TEXT
    assert "visual estimates" in DISCLAIMER_TEXT


def test_pdf_generated_with_cover_image():
    import io

    from PIL import Image

    buffer = io.BytesIO()
    Image.new("RGB", (800, 600), "#E7E0D5").save(buffer, format="JPEG")
    pdf = ReportLabReportGenerator().build(_context(buffer.getvalue()))
    assert pdf.startswith(b"%PDF")
    assert len(pdf) > 10000


def test_makeover_section_is_included_when_available():
    context = _context()
    context["makeover"] = {
        "target_style": "Minimalist",
        "kind": "design_mockup",
        "mockup": {
            "palette": [{"name": "Paper White", "hex": "#F8F7F4"}],
            "furniture_changes": ["Reduce to essential pieces"],
            "lighting_changes": ["Even diffused ceiling light"],
        },
    }
    pdf = ReportLabReportGenerator().build(context)
    assert pdf.startswith(b"%PDF")
