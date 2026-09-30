"""Local filesystem storage with UUID keys and path-traversal protection."""
from __future__ import annotations

import logging
import uuid
from pathlib import Path

from app.core.config import settings
from app.core.errors import NotFoundError
from app.storage.base import StorageService, StoredFile

logger = logging.getLogger("app.storage")

BUCKETS = ("uploads", "reports", "generated")


class LocalStorageService(StorageService):
    def __init__(self) -> None:
        self._roots: dict[str, Path] = {
            "uploads": Path(settings.upload_dir).resolve(),
            "reports": Path(settings.report_dir).resolve(),
            "generated": Path(settings.generated_dir).resolve(),
        }
        for root in self._roots.values():
            root.mkdir(parents=True, exist_ok=True)

    def _root(self, bucket: str) -> Path:
        if bucket not in self._roots:
            raise ValueError(f"Unknown storage bucket: {bucket}")
        return self._roots[bucket]

    def _resolve(self, key: str) -> Path:
        """Resolve an opaque key to an absolute path, refusing escapes."""
        parts = key.replace("\\", "/").split("/")
        if len(parts) != 2:
            raise NotFoundError("File not found.")
        bucket, name = parts
        if bucket not in self._roots:
            raise NotFoundError("File not found.")
        if not name or name in {".", ".."} or "/" in name:
            raise NotFoundError("File not found.")

        root = self._root(bucket)
        candidate = (root / name).resolve()
        if root not in candidate.parents and candidate.parent != root:
            logger.warning("Blocked path traversal attempt for key=%s", key)
            raise NotFoundError("File not found.")
        return candidate

    def save(self, bucket: str, data: bytes, *, extension: str, mime_type: str) -> StoredFile:
        root = self._root(bucket)
        safe_ext = extension if extension.startswith(".") else f".{extension}"
        safe_ext = "".join(ch for ch in safe_ext if ch.isalnum() or ch == ".").lower()
        name = f"{uuid.uuid4().hex}{safe_ext}"
        path = root / name
        path.write_bytes(data)
        return StoredFile(key=f"{bucket}/{name}", size_bytes=len(data), mime_type=mime_type)

    def read(self, key: str) -> bytes:
        path = self._resolve(key)
        if not path.is_file():
            raise NotFoundError("File not found.")
        return path.read_bytes()

    def path_for(self, key: str) -> Path:
        path = self._resolve(key)
        if not path.is_file():
            raise NotFoundError("File not found.")
        return path

    def delete(self, key: str) -> None:
        try:
            path = self._resolve(key)
        except NotFoundError:
            return
        if path.is_file():
            path.unlink(missing_ok=True)

    def exists(self, key: str) -> bool:
        try:
            return self._resolve(key).is_file()
        except NotFoundError:
            return False


_storage: LocalStorageService | None = None


def get_storage() -> LocalStorageService:
    global _storage
    if _storage is None:
        _storage = LocalStorageService()
    return _storage
