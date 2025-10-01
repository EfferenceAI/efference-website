from pydantic_settings import BaseSettings
from typing import Optional
import os
from pathlib import Path

# Get the backend directory path (parent of app directory)
BACKEND_DIR = Path(__file__).parent.parent
ENV_FILE_PATH = BACKEND_DIR / ".env"

class Settings(BaseSettings):
    # Environment
    ENV: str = "development"
    
    # Database
    DATABASE_URL: str = "sqlite:///./test.db"
    
    # AWS Configuration
    AWS_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    
    # JWT Configuration
    JWT_SECRET_KEY: Optional[str] = None
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS Configuration
    ALLOWED_ORIGINS: list[str] = ["*"]  # Update with your frontend URL in production
    
    # Email Configuration
    SES_FROM_EMAIL: Optional[str] = None
    
    # Application Configuration
    APP_NAME: str = "Efference Video Training Platform API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    class Config:
        env_file = str(ENV_FILE_PATH) if ENV_FILE_PATH.exists() else None
        env_file_encoding = 'utf-8'
        extra = "ignore"
        
    @property
    def is_production(self) -> bool:
        return self.ENV.lower() in {"prod", "production"}
    
    @property
    def is_development(self) -> bool:
        return self.ENV.lower() in {"dev", "development", "local"}

settings = Settings()

# Determine environment
ENV = settings.ENV.lower()
IS_PRODUCTION = settings.is_production
IS_DEVELOPMENT = settings.is_development

# Debug: Print configuration loading (only in development)
if IS_DEVELOPMENT:
    print(f" Backend directory: {BACKEND_DIR}")
    print(f" ENV file path: {ENV_FILE_PATH}")
    print(f" ENV file exists: {ENV_FILE_PATH.exists()}")
    print(f" DATABASE_URL: {settings.DATABASE_URL}")
    print(f" Environment: {ENV}")

# Validation for production
if IS_PRODUCTION:
    if not settings.JWT_SECRET_KEY:
        raise RuntimeError("JWT_SECRET_KEY is required in production environment")
    if not settings.DATABASE_URL or "sqlite" in settings.DATABASE_URL.lower():
        raise RuntimeError("Production database URL is required (PostgreSQL recommended)")
    if settings.DEBUG:
        print("⚠️  Warning: DEBUG mode is enabled in production")

# Export commonly used settings
DATABASE_URL = settings.DATABASE_URL
JWT_SECRET_KEY = settings.JWT_SECRET_KEY
ALLOWED_ORIGINS = settings.ALLOWED_ORIGINS