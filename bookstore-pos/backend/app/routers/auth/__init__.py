import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user, get_db
from app.core.metrics import rate_limit_blocked_total
from app.core.rate_limit import rate_limiter, rate_limit
from app.models.user import User
from app.schemas.auth import LoginRequest, LogoutResponse, MeResponse, RefreshResponse, TokenResponse
from app.services.auth.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookies(
    response: Response,
    *,
    access_token: str,
    refresh_token: str | None,
    csrf_token: str,
) -> None:
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=access_token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        domain=settings.cookie_domain or None,
        max_age=settings.access_token_expire_minutes * 60,
    )
    if refresh_token:
        response.set_cookie(
            key=settings.refresh_cookie_name,
            value=refresh_token,
            httponly=True,
            secure=settings.cookie_secure,
            samesite=settings.cookie_samesite,
            domain=settings.cookie_domain or None,
            max_age=settings.refresh_token_expire_minutes * 60,
        )
    response.set_cookie(
        key=settings.csrf_cookie_name,
        value=csrf_token,
        httponly=False,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        domain=settings.cookie_domain or None,
        max_age=settings.refresh_token_expire_minutes * 60,
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(
        key=settings.auth_cookie_name,
        samesite=settings.cookie_samesite,
        secure=settings.cookie_secure,
        domain=settings.cookie_domain or None,
    )
    response.delete_cookie(
        key=settings.refresh_cookie_name,
        samesite=settings.cookie_samesite,
        secure=settings.cookie_secure,
        domain=settings.cookie_domain or None,
    )
    response.delete_cookie(
        key=settings.csrf_cookie_name,
        samesite=settings.cookie_samesite,
        secure=settings.cookie_secure,
        domain=settings.cookie_domain or None,
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    ip = request.client.host if request.client else "unknown"
    username_key = (data.username or "").strip().lower() or "unknown"
    limited = await rate_limiter.is_limited(
        key=f"login:{ip}:{username_key}",
        limit=settings.auth_login_rate_limit_count,
        window_seconds=settings.auth_login_rate_limit_window_seconds,
    )
    if limited:
        rate_limit_blocked_total.labels("login").inc()
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Demasiados intentos de login")

    service = AuthService(db)
    ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    data_out = await service.login(data, ip=ip, user_agent=user_agent)
    csrf_token = secrets.token_urlsafe(32)
    _set_auth_cookies(
        response,
        access_token=data_out["access_token"],
        refresh_token=data_out["refresh_token"],
        csrf_token=csrf_token,
    )
    return TokenResponse(role=data_out["role"], username=data_out["username"], csrf_token=csrf_token)


@router.post("/refresh", response_model=RefreshResponse)
async def refresh(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    token = None
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1]
    if not token:
        token = request.cookies.get(settings.refresh_cookie_name)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token invalido")

    service = AuthService(db)
    ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    data_out = await service.refresh(token, ip=ip, user_agent=user_agent)
    csrf_token = secrets.token_urlsafe(32)
    _set_auth_cookies(
        response,
        access_token=data_out["access_token"],
        refresh_token=data_out["refresh_token"],
        csrf_token=csrf_token,
    )
    return RefreshResponse(role=data_out["role"], username=data_out["username"], csrf_token=csrf_token)


@router.get("/me", response_model=MeResponse)
async def me(current_user: User = Depends(get_current_user)):
    return MeResponse(username=current_user.username, role=current_user.role)


@router.post("/logout", response_model=LogoutResponse)
async def logout(response: Response, request: Request, db: AsyncSession = Depends(get_db)):
    token = None
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1]
    if not token:
        token = request.cookies.get(settings.auth_cookie_name) or request.cookies.get(settings.refresh_cookie_name)
    if token:
        service = AuthService(db)
        ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        await service.revoke_token(token, ip=ip, user_agent=user_agent)
    _clear_auth_cookies(response)
    return LogoutResponse()


@router.post("/logout-all", response_model=LogoutResponse)
async def logout_all(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    await service.logout_all(current_user, ip=ip, user_agent=user_agent)
    _clear_auth_cookies(response)
    return LogoutResponse()


@router.post("/2fa/setup")
@rate_limit(limit=5, window_seconds=300, key_prefix="2fa_setup")
async def setup_2fa(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    return await service.setup_2fa(current_user)


@router.post("/2fa/confirm")
@rate_limit(limit=10, window_seconds=300, key_prefix="2fa_confirm")
async def confirm_2fa(code: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    return await service.confirm_2fa(current_user, code)
