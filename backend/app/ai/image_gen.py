"""Image generation provider abstraction.

Two implementations ship with the project:

* ``PixazoImageGenerationProvider`` — calls a configurable free/fair-use
  text-to-image endpoint. Disabled by default; enable it explicitly.
* ``LocalVisualizationProvider`` — always available. It renders a deterministic
  "Design Mockup" specification (palette + change list) that the frontend draws
  next to the original photo. No network, no cost, no AI.

The analysis flow never depends on image generation succeeding.
"""
from __future__ import annotations

import abc
import base64
import binascii
import logging
from dataclasses import dataclass, field
from typing import Any

import httpx

from app.ai.schemas import MakeoverPrompt
from app.core.config import settings
from app.core.logging import log_event

logger = logging.getLogger("app.ai.imagegen")

# Fallback palettes used when the model does not return one.
STYLE_PALETTES: dict[str, list[dict[str, str]]] = {
    "Modern": [
        {"name": "Soft Charcoal", "hex": "#2F3134"},
        {"name": "Warm White", "hex": "#F5F3EF"},
        {"name": "Stone Grey", "hex": "#B7B2AA"},
        {"name": "Brushed Brass", "hex": "#B08D57"},
    ],
    "Minimalist": [
        {"name": "Paper White", "hex": "#F8F7F4"},
        {"name": "Pale Oak", "hex": "#D9CDBB"},
        {"name": "Slate Line", "hex": "#4A4A48"},
        {"name": "Quiet Sand", "hex": "#E6DFD4"},
    ],
    "Luxury": [
        {"name": "Deep Espresso", "hex": "#3B2F2A"},
        {"name": "Carrara", "hex": "#EFECE6"},
        {"name": "Antique Gold", "hex": "#C6A15B"},
        {"name": "Midnight Velvet", "hex": "#26313C"},
    ],
    "Classic": [
        {"name": "Ivory Panel", "hex": "#F1EADD"},
        {"name": "Muted Sage", "hex": "#9FAB94"},
        {"name": "Walnut", "hex": "#6B4A32"},
        {"name": "Soft Gold", "hex": "#CBB185"},
    ],
    "Traditional": [
        {"name": "Terracotta", "hex": "#B5643C"},
        {"name": "Turmeric", "hex": "#D9A441"},
        {"name": "Deep Teak", "hex": "#5A3A24"},
        {"name": "Cream Khadi", "hex": "#EFE3CD"},
    ],
    "Rustic": [
        {"name": "Barn Wood", "hex": "#7A5C42"},
        {"name": "Clay", "hex": "#A8755A"},
        {"name": "Moss", "hex": "#6E7355"},
        {"name": "Oat Linen", "hex": "#E3D8C5"},
    ],
    "Coastal": [
        {"name": "Sea Salt", "hex": "#F4F7F7"},
        {"name": "Harbour Blue", "hex": "#4E7B96"},
        {"name": "Driftwood", "hex": "#C6B7A2"},
        {"name": "Pale Sky", "hex": "#BFD6E0"},
    ],
}

STYLE_MOCKUP_DEFAULTS: dict[str, dict[str, list[str]]] = {
    "Modern": {
        "furniture": ["Low-profile seating with clean horizontal lines",
                      "Slim metal-frame side tables"],
        "lighting": ["Recessed ceiling spots plus one sculptural floor lamp"],
        "decor": ["A single large-scale abstract artwork instead of many small frames"],
        "materials": ["Matte laminate, clear glass and powder-coated metal"],
    },
    "Minimalist": {
        "furniture": ["Reduce to essential pieces only", "Closed storage to hide clutter"],
        "lighting": ["Even, diffused ceiling light with no visible clutter of fixtures"],
        "decor": ["One considered object per surface"],
        "materials": ["Pale oak, matte white paint, natural cotton"],
    },
    "Luxury": {
        "furniture": ["A statement upholstered piece in a rich texture"],
        "lighting": ["Three lighting layers: ambient, task and accent"],
        "decor": ["Framed mirror with a substantial profile"],
        "materials": ["Marble or engineered stone surface, velvet, polished metal"],
    },
    "Classic": {
        "furniture": ["Symmetrically paired seating around a clear focal point"],
        "lighting": ["A central fixture balanced by matched table lamps"],
        "decor": ["Restrained moulding or panelling on the feature wall"],
        "materials": ["Walnut, linen and brushed brass"],
    },
    "Traditional": {
        "furniture": ["Carved or heritage-profile wooden pieces"],
        "lighting": ["Warm-toned pendant with a patterned shade"],
        "decor": ["Layered textiles with regional patterns"],
        "materials": ["Teak, brass and handloom cotton"],
    },
    "Rustic": {
        "furniture": ["Solid wood table with visible grain"],
        "lighting": ["Warm filament-style bulbs in simple fixtures"],
        "decor": ["Woven baskets and handmade ceramics"],
        "materials": ["Reclaimed wood, jute and unglazed terracotta"],
    },
    "Coastal": {
        "furniture": ["Light slipcovered seating and rattan accents"],
        "lighting": ["Maximise daylight; sheer window treatment"],
        "decor": ["Natural-fibre rug and simple blue-and-white textiles"],
        "materials": ["Whitewashed wood, linen, rattan and jute"],
    },
}


@dataclass
class GeneratedImage:
    """Result of an image-generation attempt."""

    success: bool
    provider: str
    kind: str  # "ai_concept" | "design_mockup"
    image_bytes: bytes | None = None
    mime_type: str = "image/png"
    note: str = ""
    mockup: dict[str, Any] = field(default_factory=dict)


class ImageGenerationProvider(abc.ABC):
    name: str = "abstract"
    enabled: bool = False

    @abc.abstractmethod
    async def generate(self, spec: MakeoverPrompt) -> GeneratedImage: ...


class LocalVisualizationProvider(ImageGenerationProvider):
    """Deterministic, always-available design mockup specification."""

    name = "local"
    enabled = True

    async def generate(self, spec: MakeoverPrompt) -> GeneratedImage:
        style = spec.target_style
        defaults = STYLE_MOCKUP_DEFAULTS.get(style, STYLE_MOCKUP_DEFAULTS["Modern"])
        palette = (
            [{"name": c.name, "hex": c.hex} for c in spec.palette]
            or STYLE_PALETTES.get(style, STYLE_PALETTES["Modern"])
        )
        mockup = {
            "target_style": style,
            "palette": palette,
            "furniture_changes": spec.furniture_changes or defaults["furniture"],
            "lighting_changes": spec.lighting_changes or defaults["lighting"],
            "decor_changes": spec.decor_changes or defaults["decor"],
            "material_changes": spec.material_changes or defaults["materials"],
        }
        return GeneratedImage(
            success=True,
            provider=self.name,
            kind="design_mockup",
            mockup=mockup,
            note="Deterministic design mockup — no image generation was used.",
        )


class PixazoImageGenerationProvider(ImageGenerationProvider):
    """Free/fair-use text-to-image provider, configured entirely via environment.

    The endpoint, model and key all come from settings so the project can point
    at whatever free tier is currently advertised without code changes.
    """

    name = "pixazo"

    def __init__(self) -> None:
        self.enabled = settings.pixazo_image_provider_enabled and bool(settings.pixazo_api_key)
        self.base_url = settings.pixazo_base_url.rstrip("/")
        self.model = settings.pixazo_model

    async def generate(self, spec: MakeoverPrompt) -> GeneratedImage:
        if not self.enabled:
            return GeneratedImage(
                success=False,
                provider=self.name,
                kind="design_mockup",
                note=(
                    "AI image generation is not configured. Set "
                    "PIXAZO_IMAGE_PROVIDER_ENABLED=true and PIXAZO_API_KEY to enable it."
                ),
            )

        payload = {
            "model": self.model,
            "prompt": spec.prompt,
            "negative_prompt": spec.negative_prompt,
            "width": 1024,
            "height": 768,
            "num_images": 1,
            "response_format": "b64_json",
        }
        headers = {
            "Authorization": f"Bearer {settings.pixazo_api_key}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=settings.pixazo_timeout_seconds) as client:
                response = await client.post(
                    f"{self.base_url}/images/generations", json=payload, headers=headers
                )
        except httpx.HTTPError as exc:
            log_event(
                logger, logging.WARNING, "imagegen.network_error",
                provider=self.name, error_type=type(exc).__name__,
            )
            return self._failure("The image generation service could not be reached.")

        if response.status_code in (401, 403):
            return self._failure("The image generation API key was rejected.")
        if response.status_code == 429:
            return self._failure(
                "The image generation free-tier limit has been reached. Showing the "
                "design mockup instead."
            )
        if response.status_code == 402:
            return self._failure("The image generation provider requires billing for this model.")
        if response.status_code >= 400:
            log_event(
                logger, logging.WARNING, "imagegen.http_error",
                provider=self.name, status_code=response.status_code,
            )
            return self._failure("The image generation service returned an error.")

        image_bytes = self._extract_image(response)
        if image_bytes is None:
            return self._failure("The image generation response could not be decoded.")

        log_event(
            logger, logging.INFO, "imagegen.completed",
            provider=self.name, model=self.model, bytes=len(image_bytes),
        )
        return GeneratedImage(
            success=True,
            provider=self.name,
            kind="ai_concept",
            image_bytes=image_bytes,
            mime_type="image/png",
            note="AI Concept Visualization",
        )

    @staticmethod
    def _extract_image(response: httpx.Response) -> bytes | None:
        try:
            body = response.json()
        except ValueError:
            return None

        candidates: list[str] = []
        data = body.get("data") or body.get("images") or body.get("output") or []
        if isinstance(data, list):
            for entry in data:
                if isinstance(entry, str):
                    candidates.append(entry)
                elif isinstance(entry, dict):
                    for key in ("b64_json", "base64", "image", "url"):
                        if entry.get(key):
                            candidates.append(str(entry[key]))
                            break
        elif isinstance(data, str):
            candidates.append(data)

        for candidate in candidates:
            if candidate.startswith("http"):
                continue  # URL responses are not downloaded to avoid SSRF surface
            payload = candidate.split(",", 1)[-1]
            try:
                return base64.b64decode(payload, validate=True)
            except (binascii.Error, ValueError):
                continue
        return None

    def _failure(self, note: str) -> GeneratedImage:
        return GeneratedImage(
            success=False, provider=self.name, kind="design_mockup", note=note
        )


def get_image_generation_provider() -> ImageGenerationProvider:
    provider = settings.image_generation_provider.strip().lower()
    if provider == "pixazo":
        return PixazoImageGenerationProvider()
    return LocalVisualizationProvider()


def get_fallback_provider() -> LocalVisualizationProvider:
    return LocalVisualizationProvider()
