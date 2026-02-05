from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.core.config import settings
from app.core.rate_limit import rate_limiter
from app.core.security import decode_token
from app.routers.auth import router as auth_router
from app.routers.admin import admin as admin_router
from app.routers.admin import permissions as permissions_router
from app.routers.admin import users as users_router
from app.routers.admin import audit as audit_router
from app.routers.admin import settings as settings_router
from app.routers.catalog import products as products_router
from app.routers.catalog import customers as customers_router
from app.routers.catalog import suppliers as suppliers_router
from app.routers.catalog import price_lists as price_lists_router
from app.routers.catalog import promotions as promotions_router
from app.routers.inventory import inventory as inventory_router
from app.routers.inventory import purchases as purchases_router
from app.routers.inventory import purchasing as purchasing_router
from app.routers.inventory import warehouses as warehouses_router
from app.routers.pos import cash as cash_router
from app.routers.pos import sales as sales_router
from app.routers.pos import returns as returns_router
from app.routers.pos import display_ws as display_ws_router
from app.routers.pos import printing as printing_router
from app.routers.reports import reports as reports_router
from app.seed import seed_admin
from app.db.session import AsyncSessionLocal


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with AsyncSessionLocal() as session:
        await seed_admin(session)
    try:
        yield
    finally:
        await rate_limiter.close()


app = FastAPI(title="Bookstore POS API", lifespan=lifespan)
logger = logging.getLogger("bookstore")

def _validate_security_settings() -> None:
    env = settings.environment.lower()
    is_prod = env in {"prod", "production"}
    if not settings.jwt_secret or settings.jwt_secret == "change_me_super_secret":
        raise RuntimeError("JWT_SECRET debe configurarse y no usar valores por defecto")
    if is_prod and not settings.cookie_secure:
        raise RuntimeError("COOKIE_SECURE debe ser true en producción")
    if is_prod and not settings.twofa_encryption_key:
        raise RuntimeError("2FA_ENCRYPTION_KEY debe configurarse en producción")
    if is_prod:
        origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
        if not origins:
            raise RuntimeError("CORS_ORIGINS debe definirse en producción")
        if any("localhost" in o or "127.0.0.1" in o for o in origins):
            raise RuntimeError("CORS_ORIGINS no debe incluir localhost en producción")


_validate_security_settings()

def _build_csp() -> str:
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
        "img-src 'self' data:; "
        "style-src 'self' 'unsafe-inline'; "
        "script-src 'self' 'unsafe-inline'; "
        f"connect-src {connect_src_value}"
    )


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        ip = request.client.host if request.client else "unknown"
        key = f"ip:{ip}"
        auth_header = request.headers.get("authorization") or ""
        token = None
        if auth_header.lower().startswith("bearer "):
            token = auth_header.split(" ", 1)[1]
        if not token:
            token = request.cookies.get(settings.auth_cookie_name)
        if token:
            try:
                payload = decode_token(token)
                sub = payload.get("sub")
                if sub:
                    key = f"user:{sub}"
            except Exception:
                pass
        limited = await rate_limiter.is_limited(
            key=key,
            limit=settings.rate_limit_per_minute,
            window_seconds=settings.rate_limit_window_seconds,
        )
        if limited:
            return Response(content="Rate limit exceeded", status_code=429)
        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "same-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        response.headers["Content-Security-Policy"] = _build_csp()
        if settings.environment.lower() in {"prod", "production"} and settings.cookie_secure:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


class HealthGuardMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path in {"/health", "/healthz"}:
            env = settings.environment.lower()
            if env in {"prod", "production"} and settings.health_allow_local_only:
                ip = request.client.host if request.client else ""
                if ip not in {"127.0.0.1", "::1", "localhost"}:
                    return Response(status_code=404)
        return await call_next(request)

class CsrfMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            return await call_next(request)
        if request.url.path in {"/auth/login", "/auth/logout", "/auth/2fa/setup", "/auth/2fa/confirm"}:
            return await call_next(request)
        if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
            has_auth_header = bool(request.headers.get("authorization"))
            if not has_auth_header and request.cookies.get(settings.auth_cookie_name):
                csrf_cookie = request.cookies.get(settings.csrf_cookie_name)
                csrf_header = request.headers.get(settings.csrf_header_name)
                if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
                    return Response(content="CSRF token missing or invalid", status_code=403)
        return await call_next(request)
origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(CsrfMiddleware)
app.add_middleware(HealthGuardMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router.router)
app.include_router(products_router.router)
app.include_router(customers_router.router)
app.include_router(suppliers_router.router)
app.include_router(inventory_router.router)
app.include_router(cash_router.router)
app.include_router(sales_router.router)
app.include_router(purchases_router.router)
app.include_router(reports_router.router)
app.include_router(display_ws_router.router)
app.include_router(settings_router.router)
app.include_router(admin_router.router)
app.include_router(permissions_router.router)
app.include_router(audit_router.router)
app.include_router(warehouses_router.router)
app.include_router(price_lists_router.router)
app.include_router(promotions_router.router)
app.include_router(returns_router.router)
app.include_router(purchasing_router.router)
app.include_router(printing_router.router)

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error", exc_info=exc)
    return Response(content="Internal server error", status_code=500)


@app.get("/")
async def root():
    return {"status": "ok"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

