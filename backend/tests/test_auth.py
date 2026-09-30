"""Registration, login, JWT and route protection."""
import pytest

from app.core.security import create_access_token, hash_password, verify_password

pytestmark = pytest.mark.asyncio

REGISTER = "/api/v1/auth/register"
LOGIN = "/api/v1/auth/login"


async def test_register_accepts_valid_payload(client):
    response = await client.post(
        REGISTER,
        json={
            "full_name": "Akshay Patil",
            "email": "akshay@example.com",
            "password": "StrongPass123",
        },
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["user"]["email"] == "akshay@example.com"


async def test_register_returns_tokens_and_user(client):
    response = await client.post(
        REGISTER,
        json={"full_name": "Aarti Rao", "email": "Aarti@Example.com", "password": "StrongPass123"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["access_token"] and body["refresh_token"]
    assert body["user"]["email"] == "aarti@example.com"
    assert "password" not in body["user"]


async def test_duplicate_email_conflicts(client):
    payload = {"full_name": "Aarti Rao", "email": "dup@example.com", "password": "StrongPass123"}
    assert (await client.post(REGISTER, json=payload)).status_code == 201
    response = await client.post(REGISTER, json=payload)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "conflict"


@pytest.mark.parametrize(
    "password", ["short1A", "alllowercase1", "ALLUPPERCASE1", "NoDigitsHere"]
)
async def test_weak_passwords_rejected(client, password):
    response = await client.post(
        REGISTER,
        json={"full_name": "Weak Pass", "email": "weak@example.com", "password": password},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


async def test_login_succeeds_and_rejects_bad_password(client):
    await client.post(
        REGISTER,
        json={"full_name": "Li Wei", "email": "li@example.com", "password": "StrongPass123"},
    )
    ok = await client.post(LOGIN, json={"email": "li@example.com", "password": "StrongPass123"})
    assert ok.status_code == 200

    bad = await client.post(LOGIN, json={"email": "li@example.com", "password": "WrongPass123"})
    assert bad.status_code == 401
    # Generic message: must not reveal whether the account exists.
    assert bad.json()["error"]["message"] == "Invalid email or password."

    unknown = await client.post(
        LOGIN, json={"email": "nobody@example.com", "password": "StrongPass123"}
    )
    assert unknown.json()["error"]["message"] == bad.json()["error"]["message"]


async def test_password_is_hashed_not_stored_plaintext():
    hashed = hash_password("StrongPass123")
    assert hashed != "StrongPass123"
    assert hashed.startswith("$argon2")
    assert verify_password("StrongPass123", hashed)
    assert not verify_password("WrongPass123", hashed)


async def test_me_requires_valid_token(client, auth_headers):
    assert (await client.get("/api/v1/auth/me")).status_code == 401
    assert (
        await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer nonsense"})
    ).status_code == 401
    ok = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert ok.status_code == 200
    assert ok.json()["email"] == "tester@example.com"


async def test_refresh_token_rotation(client):
    registered = await client.post(
        REGISTER,
        json={"full_name": "Rot Ate", "email": "rot@example.com", "password": "StrongPass123"},
    )
    refresh_token = registered.json()["refresh_token"]
    response = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == 200
    assert response.json()["access_token"] != registered.json()["access_token"]


async def test_access_token_cannot_be_used_as_refresh_token(client):
    registered = await client.post(
        REGISTER,
        json={"full_name": "Mix Up", "email": "mix@example.com", "password": "StrongPass123"},
    )
    response = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": registered.json()["access_token"]}
    )
    assert response.status_code == 401


async def test_token_for_unknown_user_is_rejected(client):
    import uuid

    token = create_access_token(str(uuid.uuid4()))
    response = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


async def test_change_password(client, auth_headers):
    response = await client.post(
        "/api/v1/auth/change-password",
        headers=auth_headers,
        json={"current_password": "StrongPass123", "new_password": "EvenStronger456"},
    )
    assert response.status_code == 200
    assert (
        await client.post(
            LOGIN, json={"email": "tester@example.com", "password": "EvenStronger456"}
        )
    ).status_code == 200
