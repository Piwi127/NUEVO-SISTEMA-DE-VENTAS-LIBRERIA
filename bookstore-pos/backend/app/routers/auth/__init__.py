from fastapi import APIRouter, Depends, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, MeResponse
from app.core.config import settings
import secrets
from app.services.auth.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    data_out = await service.login(data, ip=ip, user_agent=user_agent)
    csrf_token = secrets.token_urlsafe(32)
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=data_out["access_token"],
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        domain=settings.cookie_domain or None,
        max_age=settings.access_token_expire_minutes * 60,
    )
    response.set_cookie(
        key=settings.csrf_cookie_name,
        value=csrf_token,
        httponly=False,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        domain=settings.cookie_domain or None,
        max_age=settings.access_token_expire_minutes * 60,
    )
    return TokenResponse(role=data_out["role"], username=data_out["username"], csrf_token=csrf_token)


@router.get("/me", response_model=MeResponse)
async def me(current_user: User = Depends(get_current_user)):
    return MeResponse(username=current_user.username, role=current_user.role)


@router.post("/logout")
async def logout(response: Response, request: Request, db: AsyncSession = Depends(get_db)):
    token = None
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1]
    if not token:
        token = request.cookies.get(settings.auth_cookie_name)
    if token:
        service = AuthService(db)
        ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        await service.revoke_token(token, ip=ip, user_agent=user_agent)
    response.delete_cookie(
        key=settings.auth_cookie_name,
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
    return {"ok": True}

@router.post("/2fa/setup")
async def setup_2fa(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    return await service.setup_2fa(current_user)


@router.post("/2fa/confirm")
async def confirm_2fa(code: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    return await service.confirm_2fa(current_user, code)
