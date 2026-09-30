"""Storage abstraction so local disk can later be swapped for S3."""
from __future__ import annotations

import abc
from dataclasses import dataclass


@dataclass(frozen=True)
class StoredFile:
    key: str          # opaque relative key, e.g. "uploads/ab12....jpg"
    size_bytes: int
    mime_type: str


class StorageService(abc.ABC):
    @abc.abstractmethod
    def save(self, bucket: str, data: bytes, *, extension: str, mime_type: str) -> StoredFile: ...

    @abc.abstractmethod
    def read(self, key: str) -> bytes: ...

    @abc.abstractmethod
    def delete(self, key: str) -> None: ...

    @abc.abstractmethod
    def exists(self, key: str) -> bool: ...
