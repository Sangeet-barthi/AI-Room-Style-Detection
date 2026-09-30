"""Upload validation: format, size, dimensions and corrupted files."""
import io

import pytest
from PIL import Image

from app.core.errors import PayloadTooLargeError, UnsupportedMediaError, ValidationError
from app.services.image_validation import validate_and_normalise


def _image(size=(900, 600), fmt="JPEG"):
    buffer = io.BytesIO()
    Image.new("RGB", size, "#DDD").save(buffer, format=fmt)
    return buffer.getvalue()


def test_valid_jpeg_is_normalised():
    result = validate_and_normalise(_image(), filename="room.jpg", declared_mime="image/jpeg")
    assert result.width == 900 and result.height == 600
    assert result.analysis_bytes and result.thumbnail_bytes
    assert result.original_mime == "image/jpeg"
    with Image.open(io.BytesIO(result.thumbnail_bytes)) as thumb:
        assert max(thumb.size) <= 480


def test_png_and_webp_are_accepted():
    for fmt, name in (("PNG", "room.png"), ("WEBP", "room.webp")):
        result = validate_and_normalise(_image(fmt=fmt), filename=name, declared_mime=None)
        assert result.analysis_bytes


def test_empty_file_rejected():
    with pytest.raises(ValidationError):
        validate_and_normalise(b"", filename="room.jpg", declared_mime="image/jpeg")


def test_oversized_file_rejected(monkeypatch):
    from app.services import image_validation

    monkeypatch.setattr(image_validation.settings, "max_upload_mb", 0)
    with pytest.raises(PayloadTooLargeError):
        validate_and_normalise(_image(), filename="room.jpg", declared_mime="image/jpeg")


def test_disallowed_extension_rejected():
    with pytest.raises(UnsupportedMediaError):
        validate_and_normalise(_image(), filename="payload.svg", declared_mime="image/jpeg")


def test_executable_disguised_as_image_rejected():
    fake = b"MZ\x90\x00\x03" + b"\x00" * 500  # PE header, not an image
    with pytest.raises(ValidationError):
        validate_and_normalise(fake, filename="room.jpg", declared_mime="image/jpeg")


def test_truncated_image_rejected():
    data = _image()[: len(_image()) // 3]
    with pytest.raises(ValidationError):
        validate_and_normalise(data, filename="room.jpg", declared_mime="image/jpeg")


def test_tiny_image_rejected():
    with pytest.raises(ValidationError) as exc:
        validate_and_normalise(_image((80, 60)), filename="room.jpg", declared_mime="image/jpeg")
    assert exc.value.code == "image_too_small"


def test_mime_type_is_not_blindly_trusted():
    # Declared as PNG but actually a JPEG — Pillow decides, and JPEG is allowed.
    result = validate_and_normalise(_image(), filename="room.png", declared_mime="image/png")
    assert result.original_mime == "image/jpeg"
