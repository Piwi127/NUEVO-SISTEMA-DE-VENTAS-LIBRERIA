from pathlib import Path

from pydantic_settings import BaseSettings
from pydantic import ConfigDict, field_validator


BACKEND_DIR = Path(__file__).resolve().parents[2]
ROOT_DIR = BACKEND_DIR.parent
DEFAULT_DB_PATH = (BACKEND_DIR / "bookstore.db").as_posix()
ENV_FILES = (
    str(BACKEND_DIR / ".env"),
    str(ROOT_DIR / ".env"),
    ".env",
)


class Settings(BaseSettings):
    # Seguridad y autenticación
    # JWT_SECRET: Clave secreta para firmar tokens JWT. Debe ser única y segura en producción.
    jwt_secret: str = ""
    # DATABASE_URL: URL de conexión a la base de datos (ej: sqlite+aiosqlite:///./bookstore.db)
    database_url: str = f"sqlite+aiosqlite:///{DEFAULT_DB_PATH}"
    # CORS_ORIGINS: Orígenes permitidos para CORS, separados por comas
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    # ACCESS_TOKEN_EXPIRE_MINUTES: Duración del token de acceso en minutos
    access_token_expire_minutes: int = 45
    # REFRESH_TOKEN_EXPIRE_MINUTES: Duración del token de refresco en minutos (default: 14 días)
    refresh_token_expire_minutes: int = 60 * 24 * 14
    # ENVIRONMENT: Entorno de ejecución (dev, prod, production)
    environment: str = "dev"
    # AUTH_COOKIE_NAME: Nombre de la cookie para el token de acceso
    auth_cookie_name: str = "access_token"
    # REFRESH_COOKIE_NAME: Nombre de la cookie para el token de refresco
    refresh_cookie_name: str = "refresh_token"
    # CSRF_COOKIE_NAME: Nombre de la cookie para el token CSRF
    csrf_cookie_name: str = "csrf_token"
    # CSRF_HEADER_NAME: Nombre del header para el token CSRF
    csrf_header_name: str = "x-csrf-token"
    # REQUEST_ID_HEADER_NAME: Nombre del header para el ID de request
    request_id_header_name: str = "x-request-id"
    # COOKIE_SAMESITE: Política SameSite para cookies (lax, strict, none)
    cookie_samesite: str = "lax"
    # COOKIE_DOMAIN: Dominio para las cookies (vacío = dominio actual)
    cookie_domain: str = ""
    # COOKIE_SECURE: Si true, las cookies solo se envían por HTTPS
    cookie_secure: bool = False
    # RATE_LIMIT_PER_MINUTE: Número máximo de peticiones por minuto
    rate_limit_per_minute: int = 120
    # RATE_LIMIT_WINDOW_SECONDS: Ventana de tiempo para rate limiting en segundos
    rate_limit_window_seconds: int = 60
    # AUTH_LOGIN_RATE_LIMIT_COUNT: Máximo de intentos de login por ventana
    auth_login_rate_limit_count: int = 10
    # AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS: Ventana de tiempo para intentos de login
    auth_login_rate_limit_window_seconds: int = 300
    # REDIS_URL: URL de conexión a Redis (opcional, para rate limiting distribuido)
    redis_url: str = ""
    # PASSWORD_MIN_LENGTH: Longitud mínima de contraseñas
    password_min_length: int = 10
    # PASSWORD_REQUIRE_UPPER: Requiere mayúsculas en contraseñas
    password_require_upper: bool = True
    # PASSWORD_REQUIRE_LOWER: Requiere minúsculas en contraseñas
    password_require_lower: bool = True
    # PASSWORD_REQUIRE_DIGIT: Requiere dígitos en contraseñas
    password_require_digit: bool = True
    # TWOFA_ENCRYPTION_KEY: Clave para encriptar secretos 2FA (requerida en producción)
    twofa_encryption_key: str = ""
    # HEALTH_ALLOW_LOCAL_ONLY: Si true, /health solo responde desde localhost en producción
    health_allow_local_only: bool = True
    # METRICS_ALLOW_LOCAL_ONLY: Si true, /metrics solo responde desde localhost en producción
    metrics_allow_local_only: bool = True
    # BOOTSTRAP_DEV_ADMIN: Si true, crea admin por defecto en desarrollo
    bootstrap_dev_admin: bool = False
    # BOOTSTRAP_ADMIN_USERNAME: Username del admin inicial
    bootstrap_admin_username: str = ""
    # BOOTSTRAP_ADMIN_USERNAMES: Usernames del admin inicial, separados por comas
    bootstrap_admin_usernames: str = ""
    # BOOTSTRAP_ADMIN_PASSWORD: Password del admin inicial
    bootstrap_admin_password: str = ""
    # INVENTORY_IMPORT_MAX_FILE_SIZE_MB: Tamaño máximo de archivos de importación
    inventory_import_max_file_size_mb: int = 25
    # INVENTORY_IMPORT_DEFAULT_BATCH_SIZE: Tamaño de lote por defecto para imports
    inventory_import_default_batch_size: int = 200
    # INVENTORY_IMPORT_MAX_BATCH_SIZE: Tamaño máximo de lote para imports
    inventory_import_max_batch_size: int = 1000
    # LOYALTY_POINTS_PER_CURRENCY_UNIT: Puntos de lealtad por unidad monetaria
    loyalty_points_per_currency_unit: float = 1.0
    # LOYALTY_POINT_VALUE: Valor de cada punto de lealtad en moneda
    loyalty_point_value: float = 0.05
    # LOYALTY_MIN_REDEEM_POINTS: Puntos mínimos para redimir
    loyalty_min_redeem_points: int = 50
    # ACCOUNT_LOCK_THRESHOLD: Intentos fallidos antes de bloquear cuenta
    account_lock_threshold: int = 5
    # ACCOUNT_LOCK_MINUTES: Minutos de bloqueo tras intentos fallidos
    account_lock_minutes: int = 15

    model_config = ConfigDict(env_file=ENV_FILES, env_file_encoding="utf-8", extra="ignore")

    @field_validator("jwt_secret")
    @classmethod
    def validate_jwt_secret(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError(
                "JWT_SECRET es requerido. Debe configurarse en .env o variable de ambiente. "
                "Use un valor seguro y único (mínimo 32 caracteres recomendados)."
            )
        v = v.strip()
        if len(v) < 32:
            raise ValueError(
                f"JWT_SECRET debe tener al menos 32 caracteres (actual: {len(v)}). "
                "Genere uno seguro con: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
            )
        return v


settings = Settings()
