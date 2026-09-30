"""End-to-end analysis, ownership, makeover and report flows."""
import io

import pytest
from PIL import Image

from app.core.errors import AIProviderError

pytestmark = pytest.mark.asyncio

ANALYSES = "/api/v1/analyses"


async def _create_analysis(client, headers, room_image):
    return await client.post(
        ANALYSES,
        headers=headers,
        files={"image": ("room.jpg", room_image, "image/jpeg")},
        data={"title": "My living room"},
    )


async def test_analysis_requires_authentication(client, room_image):
    response = await client.post(
        ANALYSES, files={"image": ("room.jpg", room_image, "image/jpeg")}
    )
    assert response.status_code == 401


async def test_full_analysis_is_created_and_persisted(
    client, auth_headers, room_image, stub_provider
):
    response = await _create_analysis(client, auth_headers, room_image)
    assert response.status_code == 201, response.text
    body = response.json()

    assert body["room_type"] == "Living Room"
    assert body["primary_style"] == "Modern"
    assert 0 <= body["overall_score"] <= 100
    assert body["scores"]["overall"]["disclaimer"] == "Visual AI-assisted assessment"
    assert body["improvements"]["improvements"]
    assert [p["budget"] for p in body["budget_plans"]] == [5000, 20000, 50000]
    for plan in body["budget_plans"]:
        assert plan["total_estimated_cost"] <= plan["budget"]
    assert len(body["images"]) == 2


async def test_reopening_an_analysis_does_not_call_the_model_again(
    client, auth_headers, room_image, stub_provider
):
    created = await _create_analysis(client, auth_headers, room_image)
    calls_after_create = len(stub_provider.calls)

    analysis_id = created.json()["id"]
    fetched = await client.get(f"{ANALYSES}/{analysis_id}", headers=auth_headers)
    assert fetched.status_code == 200
    assert len(stub_provider.calls) == calls_after_create


async def test_users_cannot_read_another_users_analysis(
    client, auth_headers, room_image, stub_provider
):
    created = await _create_analysis(client, auth_headers, room_image)
    analysis_id = created.json()["id"]

    other = await client.post(
        "/api/v1/auth/register",
        json={"full_name": "Other User", "email": "other@example.com", "password": "StrongPass123"},
    )
    other_headers = {"Authorization": f"Bearer {other.json()['access_token']}"}

    assert (
        await client.get(f"{ANALYSES}/{analysis_id}", headers=other_headers)
    ).status_code == 404
    assert (
        await client.delete(f"{ANALYSES}/{analysis_id}", headers=other_headers)
    ).status_code == 404
    assert (
        await client.get(f"{ANALYSES}/{analysis_id}", headers=auth_headers)
    ).status_code == 200


async def test_invalid_image_returns_422_not_500(client, auth_headers, stub_provider):
    response = await client.post(
        ANALYSES,
        headers=auth_headers,
        files={"image": ("room.jpg", b"not-an-image-at-all", "image/jpeg")},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "corrupt_image"


async def test_oversized_upload_returns_413(client, auth_headers, stub_provider):
    buffer = io.BytesIO()
    Image.new("RGB", (4000, 3000), "#ABCDEF").save(buffer, format="PNG")
    payload = buffer.getvalue() + b"\x00" * (3 * 1024 * 1024)
    response = await client.post(
        ANALYSES, headers=auth_headers, files={"image": ("big.png", payload, "image/png")}
    )
    assert response.status_code == 413


async def test_ai_failure_returns_503_with_actionable_message(
    client, auth_headers, room_image, stub_provider
):
    stub_provider.fail_with = AIProviderError(
        "The AI free-tier quota has been reached.", code="ai_quota_exceeded"
    )
    response = await _create_analysis(client, auth_headers, room_image)
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "ai_quota_exceeded"


async def test_history_listing_and_filtering(
    client, auth_headers, room_image, stub_provider
):
    await _create_analysis(client, auth_headers, room_image)
    await _create_analysis(client, auth_headers, room_image)

    listing = await client.get(ANALYSES, headers=auth_headers, params={"page_size": 1})
    body = listing.json()
    assert body["total"] == 2
    assert len(body["items"]) == 1
    assert body["has_more"] is True

    filtered = await client.get(
        ANALYSES, headers=auth_headers, params={"style": "Minimalist"}
    )
    assert filtered.json()["total"] == 0


async def test_dashboard_stats(client, auth_headers, room_image, stub_provider):
    await _create_analysis(client, auth_headers, room_image)
    stats = await client.get(f"{ANALYSES}/stats", headers=auth_headers)
    body = stats.json()
    assert body["total_analyses"] == 1
    assert body["average_health_score"] > 0
    assert body["style_distribution"][0]["style"] == "Modern"
    assert body["latest"]["room_type"] == "Living Room"


async def test_images_are_ownership_protected(
    client, auth_headers, room_image, stub_provider
):
    created = await _create_analysis(client, auth_headers, room_image)
    detail = created.json()
    image_url = detail["images"][0]["url"]

    assert (await client.get(image_url)).status_code == 401
    ok = await client.get(image_url, headers=auth_headers)
    assert ok.status_code == 200
    assert ok.headers["content-type"].startswith("image/")


async def test_makeover_falls_back_to_design_mockup_when_generation_disabled(
    client, auth_headers, room_image, stub_provider
):
    created = await _create_analysis(client, auth_headers, room_image)
    analysis_id = created.json()["id"]

    response = await client.post(
        f"{ANALYSES}/{analysis_id}/makeover",
        headers=auth_headers,
        json={"target_style": "Minimalist", "force": False},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["kind"] == "design_mockup"
    assert body["label"] == "Design Mockup"
    assert body["image_url"] is None
    assert body["mockup"]["palette"]
    assert body["mockup"]["furniture_changes"]


async def test_makeover_rejects_unknown_style(
    client, auth_headers, room_image, stub_provider
):
    created = await _create_analysis(client, auth_headers, room_image)
    response = await client.post(
        f"{ANALYSES}/{created.json()['id']}/makeover",
        headers=auth_headers,
        json={"target_style": "Brutalist"},
    )
    assert response.status_code == 422


async def test_report_generation_and_ownership_protected_download(
    client, auth_headers, room_image, stub_provider
):
    created = await _create_analysis(client, auth_headers, room_image)
    analysis_id = created.json()["id"]

    generated = await client.post(
        f"{ANALYSES}/{analysis_id}/report", headers=auth_headers
    )
    assert generated.status_code == 201
    report = generated.json()
    assert report["file_name"].endswith(".pdf")
    assert report["size_bytes"] > 1000

    download = await client.get(report["download_url"], headers=auth_headers)
    assert download.status_code == 200
    assert download.headers["content-type"] == "application/pdf"
    assert download.content.startswith(b"%PDF")
    assert "attachment" in download.headers["content-disposition"]

    other = await client.post(
        "/api/v1/auth/register",
        json={"full_name": "Nosy User", "email": "nosy@example.com", "password": "StrongPass123"},
    )
    other_headers = {"Authorization": f"Bearer {other.json()['access_token']}"}
    assert (
        await client.get(report["download_url"], headers=other_headers)
    ).status_code == 404


async def test_report_still_generates_when_ai_narrative_fails(
    client, auth_headers, room_image, stub_provider
):
    created = await _create_analysis(client, auth_headers, room_image)
    stub_provider.fail_with = AIProviderError("quota", code="ai_quota_exceeded")
    response = await client.post(
        f"{ANALYSES}/{created.json()['id']}/report", headers=auth_headers
    )
    assert response.status_code == 201


async def test_delete_removes_analysis(client, auth_headers, room_image, stub_provider):
    created = await _create_analysis(client, auth_headers, room_image)
    analysis_id = created.json()["id"]
    assert (
        await client.delete(f"{ANALYSES}/{analysis_id}", headers=auth_headers)
    ).status_code == 204
    assert (
        await client.get(f"{ANALYSES}/{analysis_id}", headers=auth_headers)
    ).status_code == 404
