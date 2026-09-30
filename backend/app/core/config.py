"""Application configuration loaded from environment variables."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(BASE_DIR / ".env", BASE_DIR.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # ---- Application ----
    app_env: str = "development"
    app_name: str = "RoomStyleAI"
    api_v1_prefix: str = "/api/v1"
    debug: bool = True

    # ---- Database ----
    database_url: str = "sqlite+aiosqlite:///./roomai.db"

    # ---- Security ----
    jwt_secret_key: str = "change-me-in-production-please-use-a-long-random-value"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 14

    # ---- CORS ----
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://localhost:4173"]
    )

    # ---- AI: vision ----
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.6-flash"
    gemini_temperature: float = 0.2
    gemini_timeout_seconds: int = 90

    # ---- AI: image generation ----
    image_generation_provider: str = "pixazo"
    pixazo_api_key: str = ""
    pixazo_image_provider_enabled: bool = False
    pixazo_base_url: str = "https://api.pixazo.com/v1"
    pixazo_model: str = "flux-schnell-free"
    pixazo_timeout_seconds: int = 120

    # ---- Uploads / storage ----
    max_upload_mb: int = 10
    min_image_dimension: int = 200
    max_image_dimension: int = 6000
    upload_dir: Path = BASE_DIR / "storage_data" / "uploads"
    report_dir: Path = BASE_DIR / "storage_data" / "reports"
    generated_dir: Path = BASE_DIR / "storage_data" / "generated"

    # ---- Scoring weights (configurable, must sum to 1.0) ----
    score_weight_lighting: float = 0.35
    score_weight_ventilation: float = 0.25
    score_weight_space: float = 0.40

    # ---- Rate limiting (requests / window seconds) ----
    rate_limit_enabled: bool = True
    rate_limit_auth: str = "10/60"
    rate_limit_analysis: str = "12/3600"
    rate_limit_makeover: str = "8/3600"
    rate_limit_report: str = "20/3600"

    # ---- Demo ----
    demo_mode: bool = False
    demo_user_email: str = "demo@roomstyle.ai"
    demo_user_password: str = ""

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() in {"production", "prod"}

    @property
    def vision_enabled(self) -> bool:
        return bool(self.gemini_api_key)

    def ensure_directories(self) -> None:
        for directory in (self.upload_dir, self.report_dir, self.generated_dir):
            Path(directory).mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.ensure_directories()
    return settings


settings = get_settings()
