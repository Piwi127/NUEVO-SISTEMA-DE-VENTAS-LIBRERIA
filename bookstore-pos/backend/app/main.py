from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from time import time

from app.core.config import settings
from app.routers import (
    auth,
    users,
    products,
    customers,
    suppliers,
    inventory,
    cash,
    sales,
    purchases,
    reports,
    display_ws,
    settings as settings_router,
    admin,
    permissions,
    audit,
    warehouses,
    price_lists,
    promotions,
    returns,
    purchasing,
    printing,
)
from app.seed import seed_admin
from app.db.session import AsyncSessionLocal


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with AsyncSessionLocal() as session:
        await seed_admin(session)
    yield


app = FastAPI(title="Bookstore POS API", lifespan=lifespan)

if settings.environment.lower() in {"prod", "production"} and settings.jwt_secret == "change_me_super_secret":
    raise RuntimeError("JWT_SECRET debe configurarse en producción")

_rate_state: dict[str, tuple[int, float]] = {}


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        ip = request.client.host if request.client else "unknown"
        now = time()
        count, start = _rate_state.get(ip, (0, now))
        if now - start >= 60:
            count, start = 0, now
        count += 1
        _rate_state[ip] = (count, start)
        if settings.rate_limit_per_minute > 0 and count > settings.rate_limit_per_minute:
            return Response(content="Rate limit exceeded", status_code=429)
        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "same-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        response.headers["Content-Security-Policy"] = "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' http://localhost:5173 http://127.0.0.1:5173"
        return response

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
app.add_middleware(RateLimitMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(products.router)
app.include_router(customers.router)
app.include_router(suppliers.router)
app.include_router(inventory.router)
app.include_router(cash.router)
app.include_router(sales.router)
app.include_router(purchases.router)
app.include_router(reports.router)
app.include_router(display_ws.router)
app.include_router(settings_router.router)
app.include_router(admin.router)
app.include_router(permissions.router)
app.include_router(audit.router)
app.include_router(warehouses.router)
app.include_router(price_lists.router)
app.include_router(promotions.router)
app.include_router(returns.router)
app.include_router(purchasing.router)
app.include_router(printing.router)


@app.get("/")
async def root():
    return {"status": "ok"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}
