"""Storage service: UUID filenames and path-traversal protection."""
import pytest

from app.core.errors import NotFoundError
from app.storage import get_storage


def test_saved_files_get_uuid_names_not_original_names():
    storage = get_storage()
    stored = storage.save("uploads", b"data", extension=".jpg", mime_type="image/jpeg")
    assert stored.key.startswith("uploads/")
    name = stored.key.split("/")[1]
    assert name.endswith(".jpg")
    assert len(name) == 36  # 32 hex chars + ".jpg"
    assert storage.read(stored.key) == b"data"


@pytest.mark.parametrize(
    "key",
    [
        "uploads/../../etc/passwd",
        "../etc/passwd",
        "uploads/",
        "/etc/passwd",
        "reports/..%2f..%2fetc",
        "uploads/sub/dir.jpg",
    ],
)
def test_path_traversal_is_blocked(key):
    with pytest.raises(NotFoundError):
        get_storage().read(key)


def test_delete_is_idempotent_and_safe():
    storage = get_storage()
    stored = storage.save("reports", b"pdf", extension=".pdf", mime_type="application/pdf")
    storage.delete(stored.key)
    storage.delete(stored.key)
    assert not storage.exists(stored.key)


def test_unknown_bucket_rejected():
    with pytest.raises(ValueError):
        get_storage().save("secrets", b"x", extension=".txt", mime_type="text/plain")
