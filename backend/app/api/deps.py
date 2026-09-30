"""Shared FastAPI dependencies."""
from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import TokenError
from app.db.session import get_db
from app.models import User
from app.services.analysis_service import AnalysisService
from app.services.auth_service import AuthService
from app.services.makeover_service import MakeoverService
from app.services.report_service import ReportService

bearer_scheme = HTTPBearer(auto_error=False, description="JWT access token")

DbSession = Annotated[AsyncSession, Depends(get_db)]


async def get_auth_service(session: DbSession) -> AsyncGenerator[AuthService, None]:
    yield AuthService(session)


async def get_analysis_service(session: DbSession) -> AsyncGenerator[AnalysisService, None]:
    yield AnalysisService(session)


async def get_makeover_service(session: DbSession) -> AsyncGenerator[MakeoverService, None]:
    yield MakeoverService(session)


async def get_report_service(session: DbSession) -> AsyncGenerator[ReportService, None]:
    yield ReportService(session)


async def get_current_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> User:
    if credentials is None or not credentials.credentials:
        raise TokenError("You need to sign in to access this resource.")
    user = await auth_service.user_from_access_token(credentials.credentials)
    request.state.user_id = str(user.id)
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]
AnalysisServiceDep = Annotated[AnalysisService, Depends(get_analysis_service)]
MakeoverServiceDep = Annotated[MakeoverService, Depends(get_makeover_service)]
ReportServiceDep = Annotated[ReportService, Depends(get_report_service)]
