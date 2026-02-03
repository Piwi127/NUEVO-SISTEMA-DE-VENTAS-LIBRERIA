from pydantic_settings import BaseSettings
from pydantic import ConfigDict


class Settings(BaseSettings):
    jwt_secret: str = "change_me_super_secret"
    database_url: str = "sqlite+aiosqlite:///./bookstore.db"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    access_token_expire_minutes: int = 480

    model_config = ConfigDict(env_file=".env")


settings = Settings()
