"""Health, readiness, capabilities, error shape and secret hygiene."""
import pytest

from app.ai.provider import classify_provider_error

pytestmark = pytest.mark.asyncio


async def test_health_and_ready(client):
    assert (await client.get("/health")).json()["status"] == "ok"
    ready = await client.get("/ready")
    assert ready.json()["database"] is True


async def test_capabilities_never_leak_secrets(client):
    body = (await client.get("/capabilities")).json()
    serialised = str(body)
    assert "test-key" not in serialised
    assert body["supported_styles"] == [
        "Modern", "Minimalist", "Luxury", "Classic", "Traditional", "Rustic", "Coastal",
    ]
    assert body["budget_tiers"] == [5000, 20000, 50000]


async def test_error_envelope_is_consistent(client):
    body = (await client.get("/api/v1/analyses/not-a-uuid")).json()
    assert set(body["error"]) == {"code", "message", "details"}


async def test_security_headers_present(client):
    response = await client.get("/health")
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["X-Request-ID"]


def test_provider_errors_are_classified_without_leaking_details():
    quota = classify_provider_error(Exception("429 RESOURCE_EXHAUSTED: quota exceeded"))
    assert quota.code == "ai_quota_exceeded"

    auth = classify_provider_error(Exception("API key not valid. 401"))
    assert auth.code == "ai_auth_failed"

    model = classify_provider_error(Exception("models/foo is not found for API version"))
    assert model.code == "ai_model_unavailable"

    unknown = classify_provider_error(Exception("socket hang up"))
    assert unknown.code == "ai_unavailable"
    assert "temporarily unavailable" in unknown.message


def test_rate_limiter_blocks_after_limit():
    from app.core.rate_limit import SlidingWindowLimiter

    limiter = SlidingWindowLimiter()
    assert limiter.check("k", 2, 60) == 0
    assert limiter.check("k", 2, 60) == 0
    assert limiter.check("k", 2, 60) > 0
    assert limiter.check("other", 2, 60) == 0
