from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"

    database_url: str = "postgresql+asyncpg://rapidfinil:rapidfinil_dev_password@postgres:5432/rapidfinil"
    redis_url: str = "redis://redis:6379/0"

    # Matches any localhost port so the Vite dev server's auto-picked port
    # (3000, 3001, 3002, ...) always works without reconfiguring this.
    cors_allow_origin_regex: str = r"^http://localhost:\d+$"


@lru_cache
def get_settings() -> Settings:
    return Settings()
