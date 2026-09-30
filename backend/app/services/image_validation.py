"""Server-side image validation and normalisation.

Client-supplied MIME types and filenames are never trusted. Every upload is
decoded with Pillow, re-encoded, and given a UUID filename. Re-encoding strips
EXIF payloads and any appended non-image data.
"""
from __future__ import annotations

import io
from dataclasses import dataclass

from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.config import settings
from app.core.errors import PayloadTooLargeError, UnsupportedMediaError, ValidationError

ALLOWED_MIME_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
PILLOW_FORMATS = {"JPEG", "PNG", "WEBP"}

MAX_ANALYSIS_DIMENSION = 1600
THUMBNAIL_DIMENSION = 480


@dataclass
class NormalisedImage:
    original_bytes: bytes
    original_mime: str
    analysis_bytes: bytes
    analysis_mime: str
    thumbnail_bytes: bytes
    thumbnail_mime: str
    width: int
    height: int
    size_bytes: int


def _extension_of(filename: str | None) -> str:
    if not filename or "." not in filename:
        return ""
    return "." + filename.rsplit(".", 1)[-1].lower()


def validate_and_normalise(
    raw: bytes, *, filename: str | None, declared_mime: str | None
) -> NormalisedImage:
    if not raw:
        raise ValidationError("The uploaded file is empty.", code="empty_file")

    if len(raw) > settings.max_upload_bytes:
        raise PayloadTooLargeError(
            f"Images must be {settings.max_upload_mb} MB or smaller. "
            f"This file is {len(raw) / (1024 * 1024):.1f} MB."
        )

    extension = _extension_of(filename)
    if extension and extension not in ALLOWED_EXTENSIONS:
        raise UnsupportedMediaError(
            f"'{extension}' files are not supported. Upload a JPEG, PNG or WEBP image."
        )
    if declared_mime and declared_mime.lower() not in ALLOWED_MIME_TYPES:
        raise UnsupportedMediaError()

    # Authoritative check: can Pillow actually decode this as a supported image?
    try:
        with Image.open(io.BytesIO(raw)) as probe:
            probe.verify()
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise ValidationError(
            "That file could not be read as an image. It may be corrupted or "
            "renamed from another format.",
            code="corrupt_image",
        ) from exc

    with Image.open(io.BytesIO(raw)) as image:
        detected_format = (image.format or "").upper()
        if detected_format not in PILLOW_FORMATS:
            raise UnsupportedMediaError(
                f"Detected image format '{detected_format or 'unknown'}' is not supported."
            )

        try:
            image = ImageOps.exif_transpose(image)
        except (OSError, ValueError) as exc:
            raise ValidationError(
                "That file could not be read as an image. It may be corrupted or "
                "renamed from another format.",
                code="corrupt_image",
            ) from exc
        width, height = image.size

        if min(width, height) < settings.min_image_dimension:
            raise ValidationError(
                "This image is too small to analyse reliably. Use a photo at least "
                f"{settings.min_image_dimension}px on the shorter side.",
                code="image_too_small",
            )
        if max(width, height) > settings.max_image_dimension:
            raise ValidationError(
                "This image is unusually large. Please upload a photo no larger than "
                f"{settings.max_image_dimension}px on the longer side.",
                code="image_too_large",
            )

        rgb = image.convert("RGB")

        original_buffer = io.BytesIO()
        rgb.save(original_buffer, format="JPEG", quality=90, optimize=True)

        analysis_image = rgb.copy()
        analysis_image.thumbnail(
            (MAX_ANALYSIS_DIMENSION, MAX_ANALYSIS_DIMENSION), Image.LANCZOS
        )
        analysis_buffer = io.BytesIO()
        analysis_image.save(analysis_buffer, format="JPEG", quality=85, optimize=True)

        thumb = rgb.copy()
        thumb.thumbnail((THUMBNAIL_DIMENSION, THUMBNAIL_DIMENSION), Image.LANCZOS)
        thumb_buffer = io.BytesIO()
        thumb.save(thumb_buffer, format="JPEG", quality=78, optimize=True)

    original_bytes = original_buffer.getvalue()
    return NormalisedImage(
        original_bytes=original_bytes,
        original_mime="image/jpeg",
        analysis_bytes=analysis_buffer.getvalue(),
        analysis_mime="image/jpeg",
        thumbnail_bytes=thumb_buffer.getvalue(),
        thumbnail_mime="image/jpeg",
        width=width,
        height=height,
        size_bytes=len(original_bytes),
    )
