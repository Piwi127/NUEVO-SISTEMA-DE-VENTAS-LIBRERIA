from contextlib import asynccontextmanager
import logging
from time import perf_counter
from uuid import uuid4
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse, Response

from app.core.config import settings
from app.core.metrics import (
    CONTENT_TYPE_LATEST,
    http_request_duration_seconds,
    http_requests_total,
    rate_limit_blocked_total,
    render_metrics,
)
from app.core.rate_limit import rate_limiter
from app.core.security import decode_token
from app.routers.auth import router as auth_router
from app.routers.admin import admin as admin_router
from app.routers.admin import permissions as permissions_router
from app.routers.admin import users as users_router
from app.routers.admin import audit as audit_router
from app.routers.admin import settings as settings_router
from app.routers.admin import document_templates as document_templates_router
from app.routers.catalog import products as products_router
from app.routers.catalog import customers as customers_router
from app.routers.catalog import suppliers as suppliers_router
from app.routers.catalog import price_lists as price_lists_router
from app.routers.catalog import promotions as promotions_router
from app.routers.catalog import pricing as pricing_router
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
import re


# Validar nombres de tablas para prevenir SQL injection
_TABLE_NAME_PATTERN = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]*$")


def _validate_table_name(table_name: str) -> str:
    """Valida que el nombre de la tabla solo contenga caracteres alfanuméricos y guiones bajos."""
    if not _TABLE_NAME_PATTERN.match(table_name):
        raise ValueError(f"Nombre de tabla invalido: {table_name}")
    return table_name


async def verify_schema_compatibility() -> None:
    async with AsyncSessionLocal() as session:
        dialect = session.bind.dialect.name if session.bind else ""
        async def table_columns(table_name: str) -> set[str]:
            # Validar nombre de tabla para prevenir SQL injection
            safe_table_name = _validate_table_name(table_name)
            if dialect == "sqlite":
                result = await session.execute(text(f"PRAGMA table_info({safe_table_name})"))
                return {row[1] for row in result.fetchall()}
            result = await session.execute(
                text("SELECT column_name FROM information_schema.columns WHERE table_name = :table_name"),
                {"table_name": safe_table_name},
            )
            return {row[0] for row in result.fetchall()}

        required_columns = {
            "products": {
                "tags",
                "sale_price",
                "cost_total",
                "cost_qty",
                "direct_costs_breakdown",
                "direct_costs_total",
                "desired_margin",
                "unit_cost",
            },
            "purchases": {"subtotal", "direct_costs_breakdown", "direct_costs_total"},
            "purchase_items": {"base_unit_cost", "direct_cost_allocated"},
            "stock_batches": {"unit_cost", "direct_cost_allocated", "source_type", "source_ref"},
            "sale_items": {"unit_cost_snapshot"},
            "customers": {"loyalty_points", "loyalty_total_earned", "loyalty_total_redeemed", "tax_id", "address", "email"},
            "sales": {"loyalty_discount", "loyalty_points_earned", "loyalty_points_redeemed", "document_type"},
            "system_settings": {"print_templates_enabled"},
            "user_sessions": {"family_id"},
            "refresh_tokens": {"family_id", "jti", "token_hash", "expires_at", "revoked_at"},
            "inventory_import_jobs": {"status", "filename", "file_type", "processed_rows", "success_rows", "error_rows"},
            "inventory_import_job_errors": {"job_id", "row_number", "detail"},
            "document_sequences": {"document_type", "series", "next_number"},
            "print_templates": {"name", "document_type"},
            "print_template_versions": {"template_id", "schema_json"},
            "sale_document_snapshots": {"sale_id", "document_number"},
        }

        for table_name, required in required_columns.items():
            columns = await table_columns(table_name)
            missing = sorted(required - columns)
            if missing:
                missing_str = ", ".join(missing)
                raise RuntimeError(
                    f"Esquema desactualizado: faltan columnas en {table_name}: {missing_str}. "
                    "Ejecute 'alembic upgrade head' antes de iniciar la API."
                )

@asynccontextmanager
async def lifespan(app: FastAPI):
    await verify_schema_compatibility()
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
    # JWT_SECRET ya es validado por el field_validator en config.py
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
    # Validar DATABASE_URL
    if not settings.database_url:
        raise RuntimeError("DATABASE_URL debe estar configurada")
    if not settings.database_url.startswith(("sqlite", "postgresql", "mysql")):
        raise RuntimeError("DATABASE_URL debe usar sqlite, postgresql o mysql")
    # Validar Redis URL si se proporciona
    if settings.redis_url and not settings.redis_url.startswith(("redis://", "rediss://")):
        raise RuntimeError("REDIS_URL debe comenzar con redis:// o rediss://")

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
        "base-uri 'self'; "
        "object-src 'none'; "
        "frame-ancestors 'none'; "
        "form-action 'self'; "
        "img-src 'self' data:; "
        "style-src 'self' 'unsafe-inline'; "
        "script-src 'self'; "
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
            except ValueError:
                pass
        limited = await rate_limiter.is_limited(
            key=key,
            limit=settings.rate_limit_per_minute,
            window_seconds=settings.rate_limit_window_seconds,
        )
        if limited:
            rate_limit_blocked_total.labels("global").inc()
            return Response(content="Rate limit exceeded", status_code=429)
        return await call_next(request)


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        header_name = settings.request_id_header_name
        incoming_id = request.headers.get(header_name)
        request_id = incoming_id.strip() if incoming_id else uuid4().hex
        request.state.request_id = request_id
        route_path = request.url.path
        start = perf_counter()
        response = await call_next(request)
        route = request.scope.get("route")
        if route is not None and hasattr(route, "path"):
            route_path = getattr(route, "path") or route_path
        elapsed_seconds = perf_counter() - start
        elapsed_ms = elapsed_seconds * 1000
        status = str(response.status_code)
        http_requests_total.labels(request.method, route_path, status).inc()
        http_request_duration_seconds.labels(request.method, route_path).observe(elapsed_seconds)
        response.headers[header_name] = request_id
        logger.info(
            "request_id=%s method=%s path=%s status=%s duration_ms=%.2f",
            request_id,
            request.method,
            route_path,
            status,
            elapsed_ms,
        )
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "same-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
        response.headers["Cross-Origin-Resource-Policy"] = "same-origin"
        response.headers["Content-Security-Policy"] = _build_csp()
        if settings.environment.lower() in {"prod", "production"} and settings.cookie_secure:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


class HealthGuardMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path in {"/health", "/healthz", "/health/ready"}:
            env = settings.environment.lower()
            if env in {"prod", "production"} and settings.health_allow_local_only:
                ip = request.client.host if request.client else ""
                if ip not in {"127.0.0.1", "::1", "localhost"}:
                    return Response(status_code=404)
        if request.url.path == "/metrics":
            env = settings.environment.lower()
            if env in {"prod", "production"} and settings.metrics_allow_local_only:
                ip = request.client.host if request.client else ""
                if ip not in {"127.0.0.1", "::1", "localhost"}:
                    return Response(status_code=404)
        return await call_next(request)

class CsrfMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            return await call_next(request)
        if request.url.path == "/auth/login":
            return await call_next(request)
        if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
            has_auth_header = bool(request.headers.get("authorization"))
            has_session_cookie = bool(
                request.cookies.get(settings.auth_cookie_name) or request.cookies.get(settings.refresh_cookie_name)
            )
            if not has_auth_header and has_session_cookie:
                csrf_cookie = request.cookies.get(settings.csrf_cookie_name)
                csrf_header = request.headers.get(settings.csrf_header_name)
                if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
                    return Response(content="CSRF token missing or invalid", status_code=403)
        return await call_next(request)
origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(CsrfMiddleware)
app.add_middleware(HealthGuardMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(RequestContextMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-CSRF-Token", "X-Request-ID"],
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
app.include_router(document_templates_router.router)
app.include_router(admin_router.router)
app.include_router(permissions_router.router)
app.include_router(audit_router.router)
app.include_router(warehouses_router.router)
app.include_router(price_lists_router.router)
app.include_router(promotions_router.router)
app.include_router(pricing_router.router)
app.include_router(returns_router.router)
app.include_router(purchasing_router.router)
app.include_router(printing_router.router)

def _error_response(request: Request, status_code: int, code: str, detail):
    request_id = getattr(request.state, "request_id", "-")
    payload = {
        "error": {
            "code": code,
            "detail": detail,
            "request_id": request_id,
        },
        "detail": detail,
    }
    return JSONResponse(status_code=status_code, content=payload)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    code = f"http_{exc.status_code}"
    detail = exc.detail if exc.detail is not None else "Request failed"
    return _error_response(request, exc.status_code, code, detail)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return _error_response(request, 422, "validation_error", exc.errors())


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", "-")
    logger.exception("Unhandled error request_id=%s", request_id, exc_info=exc)
    return _error_response(request, 500, "internal_error", "Internal server error")


@app.get("/")
async def root():
    return {"status": "ok"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.get("/health/ready")
async def health_ready():
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "ok", "checks": {"database": "ok"}}
    except Exception:
        return JSONResponse(status_code=503, content={"status": "degraded", "checks": {"database": "error"}})

@app.get("/metrics")
async def metrics():
    return Response(content=render_metrics(), media_type=CONTENT_TYPE_LATEST)
