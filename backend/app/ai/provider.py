"""Vision provider abstraction and the Google GenAI Gemini implementation.

Design notes
------------
* ``VisionAnalysisProvider`` is the swappable interface. Nothing outside this
  module knows that Gemini exists.
* The current ``google-genai`` SDK is used directly so the deprecated Google
    Generative AI SDK is never imported.
* Every upstream failure mode (401/403/429/quota/billing/bad model) is mapped to
  ``AIProviderError`` so routes never leak provider internals or stack traces.
"""
from __future__ import annotations

import abc
import asyncio
import base64
import json
import logging
import time
from functools import lru_cache
from pathlib import Path
from typing import Any, TypeVar

from google import genai
from google.genai import types
from pydantic import BaseModel

from app.ai.schemas import ModelMetadata, RoomAnalysis
from app.core.config import settings
from app.core.errors import AIProviderError
from app.core.logging import log_event

logger = logging.getLogger("app.ai")

T = TypeVar("T", bound=BaseModel)

PROMPT_DIR = Path(__file__).parent / "prompts"

_QUOTA_MARKERS = (
    "quota",
    "rate limit",
    "429",
    "resource_exhausted",
    "resource exhausted",
    "billing",
    "exceeded",
)
_AUTH_MARKERS = (
    "api key",
    "api_key",
    "unauthenticated",
    "permission denied",
    "permission_denied",
    "401",
    "403",
    "invalid credential",
)
_MODEL_MARKERS = ("not found", "unsupported", "404", "is not supported", "invalid model")


def load_prompt(name: str) -> str:
    path = PROMPT_DIR / name
    if not path.exists():
        raise FileNotFoundError(f"Prompt template missing: {path}")
    return path.read_text(encoding="utf-8")


def classify_provider_error(exc: Exception) -> AIProviderError:
    """Map an arbitrary provider exception to a friendly AIProviderError."""
    text = f"{type(exc).__name__}: {exc}".lower()

    if any(marker in text for marker in _QUOTA_MARKERS):
        return AIProviderError(
            "The AI free-tier quota has been reached. Please wait for the quota to "
            "reset or configure a different API key.",
            code="ai_quota_exceeded",
        )
    if any(marker in text for marker in _AUTH_MARKERS):
        return AIProviderError(
            "The AI service rejected the configured API key. Please verify "
            "GEMINI_API_KEY in your environment configuration.",
            code="ai_auth_failed",
        )
    if any(marker in text for marker in _MODEL_MARKERS):
        return AIProviderError(
            f"The configured model '{settings.gemini_model}' is not available for this "
            "API key. Update GEMINI_MODEL to a model your account can access.",
            code="ai_model_unavailable",
        )
    return AIProviderError(
        "AI analysis is temporarily unavailable. Please check your API configuration "
        "or quota.",
        code="ai_unavailable",
    )


class VisionAnalysisProvider(abc.ABC):
    """Interface for any multimodal model that can analyse a room photograph."""

    name: str = "abstract"

    @abc.abstractmethod
    async def analyse_room(self, image_bytes: bytes, mime_type: str) -> RoomAnalysis: ...

    @abc.abstractmethod
    async def run_structured(
        self, prompt: str, schema: type[T], *, system: str | None = None
    ) -> T: ...

    @abc.abstractmethod
    def metadata(self, duration_ms: int, width: int, height: int) -> ModelMetadata: ...


class GeminiVisionProvider(VisionAnalysisProvider):
    """Google GenAI multimodal provider with Pydantic structured responses."""

    name = "gemini"

    def __init__(self, api_key: str, model: str) -> None:
        if not api_key:
            raise AIProviderError(
                "GEMINI_API_KEY is not configured. Add it to your .env file to enable "
                "room analysis.",
                code="ai_not_configured",
            )
        self._api_key = api_key
        self._model_name = model
        self._client: genai.Client | None = None

    # -- model construction -------------------------------------------------
    def _client_instance(self) -> genai.Client:
        if self._client is None:
            self._client = genai.Client(
                api_key=self._api_key,
                http_options=types.HttpOptions(
                    timeout=settings.gemini_timeout_seconds * 1000
                ),
            )
        return self._client

    # -- public API ---------------------------------------------------------
    async def analyse_room(self, image_bytes: bytes, mime_type: str) -> RoomAnalysis:
        system_prompt = load_prompt("room_analysis.txt")
        contents = [
            types.Part.from_text(
                text=(
                    "Analyse this room photograph and return the structured assessment. "
                    "Ground every field in visible evidence."
                )
            ),
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
        ]
        return await self._invoke(
            contents, RoomAnalysis, label="room_analysis", system=system_prompt
        )

    async def run_structured(
        self, prompt: str, schema: type[T], *, system: str | None = None
    ) -> T:
        return await self._invoke(prompt, schema, label=schema.__name__, system=system)

    async def _invoke(
        self,
        contents: Any,
        schema: type[T],
        *,
        label: str,
        system: str | None = None,
    ) -> T:
        started = time.perf_counter()
        try:
            result = await asyncio.wait_for(
                self._client_instance().aio.models.generate_content(
                    model=self._model_name,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        system_instruction=system,
                        temperature=settings.gemini_temperature,
                        response_mime_type="application/json",
                        response_schema=schema,
                    ),
                ),
                timeout=settings.gemini_timeout_seconds + 15,
            )
        except Exception as exc:  # noqa: BLE001 - deliberate provider boundary
            duration_ms = int((time.perf_counter() - started) * 1000)
            log_event(
                logger,
                logging.ERROR,
                "ai.call.failed",
                chain=label,
                provider=self.name,
                model=self._model_name,
                duration_ms=duration_ms,
                error_type=type(exc).__name__,
            )
            raise classify_provider_error(exc) from exc

        duration_ms = int((time.perf_counter() - started) * 1000)
        log_event(
            logger,
            logging.INFO,
            "ai.call.completed",
            chain=label,
            provider=self.name,
            model=self._model_name,
            duration_ms=duration_ms,
        )
        parsed = getattr(result, "parsed", None)
        if isinstance(parsed, schema):
            return parsed
        if isinstance(parsed, dict):
            return schema.model_validate(parsed)
        text = getattr(result, "text", None)
        if text:
            return schema.model_validate(json.loads(text))
        raise AIProviderError(
            "The AI response could not be parsed into the expected structure.",
            code="ai_invalid_response",
        )

    def metadata(self, duration_ms: int, width: int, height: int) -> ModelMetadata:
        return ModelMetadata(
            provider=self.name,
            model=self._model_name,
            duration_ms=duration_ms,
            image_width=width,
            image_height=height,
        )


@lru_cache
def get_vision_provider() -> VisionAnalysisProvider:
    """Factory used by the service layer. Replace here to swap providers."""
    return GeminiVisionProvider(settings.gemini_api_key, settings.gemini_model)
