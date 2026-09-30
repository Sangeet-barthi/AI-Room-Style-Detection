"""Lightweight in-process sliding-window rate limiter.

Dependency-free on purpose: a college deployment runs a single backend
container. Swap for Redis-backed limiting when running multiple replicas.
"""
from __future__ import annotations

import threading
import time
from collections import defaultdict, deque

from fastapi import Request

from app.core.config import settings
from app.core.errors import RateLimitError


def parse_rule(rule: str) -> tuple[int, int]:
    limit, _, window = rule.partition("/")
    return int(limit), int(window or 60)


class SlidingWindowLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key: str, limit: int, window_seconds: int) -> int:
        now = time.monotonic()
        with self._lock:
            bucket = self._hits[key]
            cutoff = now - window_seconds
            while bucket and bucket[0] < cutoff:
                bucket.popleft()
            if len(bucket) >= limit:
                return int(window_seconds - (now - bucket[0])) + 1
            bucket.append(now)
            return 0

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


limiter = SlidingWindowLimiter()


def _client_key(request: Request, scope: str) -> str:
    forwarded = request.headers.get("X-Forwarded-For", "")
    ip = forwarded.split(",")[0].strip() if forwarded else (
        request.client.host if request.client else "unknown"
    )
    user_id = getattr(request.state, "user_id", None)
    return f"{scope}:{user_id or ip}"


class RateLimit:
    """FastAPI dependency enforcing a named rate-limit rule."""

    def __init__(self, scope: str, rule: str) -> None:
        self.scope = scope
        self.rule = rule

    def __call__(self, request: Request) -> None:
        if not settings.rate_limit_enabled:
            return
        limit, window = parse_rule(self.rule)
        retry_after = limiter.check(_client_key(request, self.scope), limit, window)
        if retry_after:
            raise RateLimitError(
                "Too many requests. Please try again in "
                f"{retry_after} second{'s' if retry_after != 1 else ''}.",
                details={"retry_after_seconds": retry_after},
            )


def _build_dependency(scope: str, rule: str):
    rate_limit = RateLimit(scope, rule)

    def dependency(request: Request) -> None:
        rate_limit(request)

    return dependency


auth_rate_limit = _build_dependency("auth", settings.rate_limit_auth)
analysis_rate_limit = _build_dependency("analysis", settings.rate_limit_analysis)
makeover_rate_limit = _build_dependency("makeover", settings.rate_limit_makeover)
report_rate_limit = _build_dependency("report", settings.rate_limit_report)
