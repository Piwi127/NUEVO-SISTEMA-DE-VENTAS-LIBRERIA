from datetime import datetime, timedelta
import pyotp
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, verify_password
from app.core.deps import get_db, get_current_user
from app.core.audit import log_event
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, MeResponse

router = APIRouter(prefix="/auth", tags=["auth"])

LOCK_THRESHOLD = 5
LOCK_MINUTES = 15


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == data.username))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales invalidas")

    if user.locked_until and user.locked_until > datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cuenta bloqueada. Intente mas tarde")

    if not verify_password(data.password, user.password_hash):
        user.failed_attempts += 1
        if user.failed_attempts >= LOCK_THRESHOLD:
            user.locked_until = datetime.utcnow() + timedelta(minutes=LOCK_MINUTES)
            user.failed_attempts = 0
        await db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales invalidas")

    if user.twofa_enabled:
        if not data.otp:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="2FA_REQUIRED")
        totp = pyotp.TOTP(user.twofa_secret)
        if not totp.verify(data.otp):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="OTP invalido")

    user.failed_attempts = 0
    user.locked_until = None
    await db.commit()

    token = create_access_token(subject=user.username, role=user.role)
    await log_event(db, user.id, "login", "user", str(user.id), "")
    return TokenResponse(access_token=token, role=user.role, username=user.username)


@router.get("/me", response_model=MeResponse)
async def me(current_user: User = Depends(get_current_user)):
    return MeResponse(username=current_user.username, role=current_user.role)


@router.post("/2fa/setup")
async def setup_2fa(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    secret = pyotp.random_base32()
    current_user.twofa_secret = secret
    current_user.twofa_enabled = False
    await db.commit()
    uri = pyotp.totp.TOTP(secret).provisioning_uri(name=current_user.username, issuer_name="Bookstore POS")
    return {"secret": secret, "otpauth": uri}


@router.post("/2fa/confirm")
async def confirm_2fa(code: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not current_user.twofa_secret:
        raise HTTPException(status_code=400, detail="2FA no configurado")
    totp = pyotp.TOTP(current_user.twofa_secret)
    if not totp.verify(code):
        raise HTTPException(status_code=400, detail="Codigo invalido")
    current_user.twofa_enabled = True
    await db.commit()
    return {"ok": True}
