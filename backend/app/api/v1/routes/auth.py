"""Authentication endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.api.deps import AuthServiceDep, CurrentUser
from app.core.config import settings
from app.core.rate_limit import auth_rate_limit
from app.schemas.analysis import ErrorResponse
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    MessageResponse,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

_ERRORS = {
    401: {"model": ErrorResponse, "description": "Invalid credentials or expired session"},
    409: {"model": ErrorResponse, "description": "Email already registered"},
    422: {"model": ErrorResponse, "description": "Validation failed"},
    429: {"model": ErrorResponse, "description": "Too many attempts"},
}


def _token_response(user, access: str, refresh: str) -> TokenResponse:  # type: ignore[no-untyped-def]
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        expires_in=settings.access_token_expire_minutes * 60,
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    responses=_ERRORS,
    summary="Create an account",
    description=(
        "Registers a new account with an email address and password. Passwords are "
        "hashed with Argon2 and never stored in plain text. Returns an access token "
        "and a refresh token so the client can sign in immediately."
    ),
    dependencies=[Depends(auth_rate_limit)],
)
async def register(payload: RegisterRequest, auth: AuthServiceDep) -> TokenResponse:
    user = await auth.register(
        email=payload.email, password=payload.password, full_name=payload.full_name
    )
    access, refresh = auth.issue_tokens(user)
    return _token_response(user, access, refresh)


@router.post(
    "/login",
    response_model=TokenResponse,
    responses=_ERRORS,
    summary="Sign in",
    description=(
        "Exchanges an email and password for a JWT access token and refresh token. "
        "Failed attempts return a deliberately generic message so the endpoint cannot "
        "be used to discover which email addresses are registered."
    ),
    dependencies=[Depends(auth_rate_limit)],
)
async def login(payload: LoginRequest, auth: AuthServiceDep) -> TokenResponse:
    user = await auth.authenticate(email=payload.email, password=payload.password)
    access, refresh = auth.issue_tokens(user)
    return _token_response(user, access, refresh)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    responses=_ERRORS,
    summary="Rotate tokens",
    description="Exchanges a valid refresh token for a new access/refresh token pair.",
)
async def refresh(payload: RefreshRequest, auth: AuthServiceDep) -> TokenResponse:
    user, access, new_refresh = await auth.refresh(payload.refresh_token)
    return _token_response(user, access, new_refresh)


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Sign out",
    description=(
        "Acknowledges sign-out. Tokens are stateless, so the client is responsible for "
        "discarding them; this endpoint exists so the frontend has a single place to "
        "trigger session teardown."
    ),
)
async def logout(_: CurrentUser) -> MessageResponse:
    return MessageResponse(message="Signed out successfully.")


@router.get(
    "/me",
    response_model=UserResponse,
    responses=_ERRORS,
    summary="Current user",
    description="Returns the profile of the authenticated user.",
)
async def me(user: CurrentUser) -> UserResponse:
    return UserResponse.model_validate(user)


@router.patch(
    "/me",
    response_model=UserResponse,
    responses=_ERRORS,
    summary="Update profile",
    description="Updates the display name of the authenticated user.",
)
async def update_me(
    payload: UpdateProfileRequest, user: CurrentUser, auth: AuthServiceDep
) -> UserResponse:
    updated = await auth.update_profile(user, full_name=payload.full_name)
    return UserResponse.model_validate(updated)


@router.post(
    "/change-password",
    response_model=MessageResponse,
    responses=_ERRORS,
    summary="Change password",
    description="Replaces the account password after verifying the current one.",
    dependencies=[Depends(auth_rate_limit)],
)
async def change_password(
    payload: ChangePasswordRequest, user: CurrentUser, auth: AuthServiceDep
) -> MessageResponse:
    await auth.change_password(
        user,
        current_password=payload.current_password,
        new_password=payload.new_password,
    )
    return MessageResponse(message="Your password has been updated.")
