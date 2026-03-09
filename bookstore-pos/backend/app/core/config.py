from pydantic_settings import BaseSettings
from pydantic import ConfigDict


class Settings(BaseSettings):
    jwt_secret: str = "dev_local_secret_change_this"
    database_url: str = "sqlite+aiosqlite:///./bookstore.db"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    access_token_expire_minutes: int = 45
    refresh_token_expire_minutes: int = 60 * 24 * 14
    environment: str = "dev"
    auth_cookie_name: str = "access_token"
    refresh_cookie_name: str = "refresh_token"
    csrf_cookie_name: str = "csrf_token"
    csrf_header_name: str = "x-csrf-token"
    request_id_header_name: str = "x-request-id"
    cookie_samesite: str = "lax"
    cookie_domain: str = ""
    cookie_secure: bool = False
    rate_limit_per_minute: int = 120
    rate_limit_window_seconds: int = 60
    auth_login_rate_limit_count: int = 10
    auth_login_rate_limit_window_seconds: int = 300
    redis_url: str = ""
    password_min_length: int = 10
    password_require_upper: bool = True
    password_require_lower: bool = True
    password_require_digit: bool = True
    twofa_encryption_key: str = ""
    health_allow_local_only: bool = True
    metrics_allow_local_only: bool = True
    bootstrap_dev_admin: bool = False
    bootstrap_admin_username: str = ""
    bootstrap_admin_password: str = ""
    inventory_import_max_file_size_mb: int = 25
    inventory_import_default_batch_size: int = 200
    inventory_import_max_batch_size: int = 1000
    loyalty_points_per_currency_unit: float = 1.0
    loyalty_point_value: float = 0.05
    loyalty_min_redeem_points: int = 50

    model_config = ConfigDict(env_file=".env")


settings = Settings()
