from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, MeResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    data_out = await service.login(data)
    return TokenResponse(**data_out)


@router.get("/me", response_model=MeResponse)
async def me(current_user: User = Depends(get_current_user)):
    return MeResponse(username=current_user.username, role=current_user.role)


@router.post("/2fa/setup")
async def setup_2fa(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    return await service.setup_2fa(current_user)


@router.post("/2fa/confirm")
async def confirm_2fa(code: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    return await service.confirm_2fa(current_user, code)
