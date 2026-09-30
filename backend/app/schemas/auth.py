"""Auth request/response contracts — source of truth for API validation."""
from __future__ import annotations

import re
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

PASSWORD_RULES = (
    "Passwords need at least 8 characters, one uppercase letter, one lowercase "
    "letter and one number."
)


def validate_password_strength(value: str) -> str:
    if len(value) < 8:
        raise ValueError(PASSWORD_RULES)
    if len(value) > 128:
        raise ValueError("Passwords must be 128 characters or fewer.")
    if not re.search(r"[A-Z]", value):
        raise ValueError(PASSWORD_RULES)
    if not re.search(r"[a-z]", value):
        raise ValueError(PASSWORD_RULES)
    if not re.search(r"\d", value):
        raise ValueError(PASSWORD_RULES)
    return value


class RegisterRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "full_name": "Akshay Patil",
                "email": "akshay@example.com",
                "password": "StrongPass123",
            }
        }
    )

    full_name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def _password(cls, value: str) -> str:
        return validate_password_strength(value)

    @field_validator("full_name")
    @classmethod
    def _name(cls, value: str) -> str:
        cleaned = " ".join(value.split())
        if not cleaned:
            raise ValueError("Please enter your name.")
        return cleaned


class LoginRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {"email": "akshay@example.com", "password": "StrongPass123"}
        }
    )
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(..., min_length=10)


class UpdateProfileRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=128)
    new_password: str

    @field_validator("new_password")
    @classmethod
    def _password(cls, value: str) -> str:
        return validate_password_strength(value)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str
    is_demo: bool
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class MessageResponse(BaseModel):
    message: str
