from pydantic_settings import BaseSettings
from typing import Optional
import os
from pathlib import Path

# Get the backend directory path (parent of app directory)
BACKEND_DIR = Path(__file__).parent.parent
ENV_FILE_PATH = BACKEND_DIR / ".env"

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
        env_file = str(ENV_FILE_PATH)
        env_file_encoding = 'utf-8'
        extra = "ignore"

settings = Settings()


# Debug: Print configuration loading
print(f"📁 Backend directory: {BACKEND_DIR}")
print(f"📄 ENV file path: {ENV_FILE_PATH}")
print(f"📄 ENV file exists: {ENV_FILE_PATH.exists()}")
print(f"🔧 DATABASE_URL: {settings.DATABASE_URL}")

# Fail fast in production if JWT secret is missing
ENV = (os.getenv("ENV") or os.getenv("ENVIRONMENT") or os.getenv("APP_ENV") or "development").lower()
IS_PRODUCTION = ENV in {"prod", "production"}
if IS_PRODUCTION and not settings.JWT_SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY is required in production environment")