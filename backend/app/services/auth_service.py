"""User registration and authentication."""
from __future__ import annotations

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AuthenticationError, ConflictError, TokenError
from app.core.logging import log_event
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models import User

logger = logging.getLogger("app.services.auth")


class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == email.strip().lower())
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        return await self.session.get(User, user_id)

    async def register(self, *, email: str, password: str, full_name: str) -> User:
        normalised_email = email.strip().lower()
        if await self.get_by_email(normalised_email):
            raise ConflictError("An account with this email already exists.")

        user = User(
            email=normalised_email,
            full_name=full_name.strip(),
            password_hash=hash_password(password),
        )
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)
        log_event(logger, logging.INFO, "auth.registered", user_id=str(user.id))
        return user

    async def authenticate(self, *, email: str, password: str) -> User:
        user = await self.get_by_email(email)
        # Generic message on purpose: never reveal whether the email exists.
        if user is None or not verify_password(password, user.password_hash):
            log_event(logger, logging.WARNING, "auth.login_failed")
            raise AuthenticationError()
        if not user.is_active:
            raise AuthenticationError("This account has been deactivated.")
        log_event(logger, logging.INFO, "auth.login_succeeded", user_id=str(user.id))
        return user

    async def user_from_access_token(self, token: str) -> User:
        payload = decode_token(token, "access")
        try:
            user_id = uuid.UUID(str(payload["sub"]))
        except ValueError as exc:
            raise TokenError("Invalid authentication token.") from exc

        user = await self.get_by_id(user_id)
        if user is None or not user.is_active:
            raise TokenError("Your account is no longer available.")
        return user

    async def refresh(self, refresh_token: str) -> tuple[User, str, str]:
        payload = decode_token(refresh_token, "refresh")
        try:
            user_id = uuid.UUID(str(payload["sub"]))
        except ValueError as exc:
            raise TokenError("Invalid refresh token.") from exc

        user = await self.get_by_id(user_id)
        if user is None or not user.is_active:
            raise TokenError("Your account is no longer available.")
        return user, create_access_token(str(user.id)), create_refresh_token(str(user.id))

    @staticmethod
    def issue_tokens(user: User) -> tuple[str, str]:
        return create_access_token(str(user.id)), create_refresh_token(str(user.id))

    async def update_profile(self, user: User, *, full_name: str) -> User:
        user.full_name = full_name.strip()
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def change_password(
        self, user: User, *, current_password: str, new_password: str
    ) -> User:
        if not verify_password(current_password, user.password_hash):
            raise AuthenticationError("Your current password is incorrect.")
        user.password_hash = hash_password(new_password)
        await self.session.commit()
        await self.session.refresh(user)
        log_event(logger, logging.INFO, "auth.password_changed", user_id=str(user.id))
        return user
