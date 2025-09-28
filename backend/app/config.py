from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./test.db"
    AWS_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    JWT_SECRET_KEY: Optional[str] = None
    JWT_ALGORITHM: str = "HS256"
    ALLOWED_ORIGINS: list[str] = ["*"]  # Update with your frontend URL in production
    SES_FROM_EMAIL: Optional[str] = None

    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'
        extra = "ignore"

settings = Settings()

# Fail fast in production if JWT secret is missing
ENV = (os.getenv("ENV") or os.getenv("ENVIRONMENT") or os.getenv("APP_ENV") or "development").lower()
IS_PRODUCTION = ENV in {"prod", "production"}
if IS_PRODUCTION and not settings.JWT_SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY is required in production environment")