from pydantic_settings import BaseSettings
from pydantic import ConfigDict


class Settings(BaseSettings):
    jwt_secret: str = "change_me_super_secret"
    database_url: str = "sqlite+aiosqlite:///./bookstore.db"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    access_token_expire_minutes: int = 480
    environment: str = "dev"
    auth_cookie_name: str = "access_token"
    csrf_cookie_name: str = "csrf_token"
    csrf_header_name: str = "x-csrf-token"
    cookie_secure: bool = False
    rate_limit_per_minute: int = 120

    model_config = ConfigDict(env_file=".env")


settings = Settings()
