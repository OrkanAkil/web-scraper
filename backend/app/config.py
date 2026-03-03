from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://scrapepilot:scrapepilot_secret@localhost:5432/scrapepilot"
    SYNC_DATABASE_URL: str = "postgresql://scrapepilot:scrapepilot_secret@localhost:5432/scrapepilot"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"

    # Security
    SECRET_KEY: str = "change-me-in-production-super-secret-key"

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # Logging
    LOG_LEVEL: str = "info"

    # Scraping defaults
    DEFAULT_RATE_LIMIT_MS: int = 1000
    DEFAULT_MAX_RETRIES: int = 3
    DEFAULT_TIMEOUT_SECONDS: int = 30
    DEFAULT_MAX_PAGES: int = 100
    DEFAULT_USER_AGENT: str = "ScrapePilot/1.0 (+https://github.com/scrapepilot)"
    MAX_CONCURRENT_PER_DOMAIN: int = 2
    JOB_TIMEOUT_SECONDS: int = 3600

    # Share link
    DEFAULT_SHARE_TTL_DAYS: int = 30

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
