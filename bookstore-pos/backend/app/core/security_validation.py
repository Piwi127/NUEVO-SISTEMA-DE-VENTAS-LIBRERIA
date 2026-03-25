"""Security validation utilities for production environment."""

from app.core.config import settings


def validate_security_settings() -> None:
    """Validate security settings for production deployment.

    Raises:
        RuntimeError: If any security setting is invalid for production.
    """
    env = settings.environment.lower()
    is_prod = env in {"prod", "production"}

    if is_prod and not settings.cookie_secure:
        raise RuntimeError("COOKIE_SECURE debe ser true en produccion")

    samesite = settings.cookie_samesite.lower()
    if samesite not in {"lax", "strict", "none"}:
        raise RuntimeError("COOKIE_SAMESITE debe ser lax, strict o none")

    if is_prod and samesite == "none" and not settings.cookie_secure:
        raise RuntimeError("COOKIE_SAMESITE=none requiere COOKIE_SECURE=true")

    if is_prod and not settings.twofa_encryption_key:
        raise RuntimeError("2FA_ENCRYPTION_KEY debe configurarse en produccion")

    if is_prod:
        origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
        if not origins:
            raise RuntimeError("CORS_ORIGINS debe definirse en produccion")
        if any("localhost" in o or "127.0.0.1" in o for o in origins):
            raise RuntimeError("CORS_ORIGINS no debe incluir localhost en produccion")

    if not settings.database_url:
        raise RuntimeError("DATABASE_URL debe estar configurada")

    if not settings.database_url.startswith(("sqlite", "postgresql", "mysql")):
        raise RuntimeError("DATABASE_URL debe usar sqlite, postgresql o mysql")

    if settings.redis_url and not settings.redis_url.startswith(
        ("redis://", "rediss://")
    ):
        raise RuntimeError("REDIS_URL debe comenzar con redis:// o rediss://")


def build_csp() -> str:
    """Build Content Security Policy header value.

    Returns:
        CSP header string.
    """
    origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
    connect_src = {"'self'"}

    for origin in origins:
        connect_src.add(origin)
        if origin.startswith("http://"):
            connect_src.add(origin.replace("http://", "ws://", 1))
        if origin.startswith("https://"):
            connect_src.add(origin.replace("https://", "wss://", 1))

    connect_src_value = " ".join(sorted(connect_src))

    return (
        "default-src 'self'; "
        "base-uri 'self'; "
        "object-src 'none'; "
        "frame-ancestors 'none'; "
        "form-action 'self'; "
        "img-src 'self' data:; "
        "style-src 'self' 'unsafe-inline'; "
        "script-src 'self'; "
        f"connect-src {connect_src_value}"
    )
