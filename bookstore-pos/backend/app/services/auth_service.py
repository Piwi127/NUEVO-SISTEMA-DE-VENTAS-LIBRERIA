from datetime import datetime, timedelta, timezone

import pyotp
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import log_event
from app.core.security import create_access_token, verify_password
from app.models.user import User

LOCK_THRESHOLD = 5
LOCK_MINUTES = 15


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def login(self, data):
        result = await self.db.execute(select(User).where(User.username == data.username))
        user = result.scalar_one_or_none()
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales invalidas")

        if user.locked_until and user.locked_until > datetime.now(timezone.utc):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cuenta bloqueada. Intente mas tarde")

        if not verify_password(data.password, user.password_hash):
            user.failed_attempts += 1
            if user.failed_attempts >= LOCK_THRESHOLD:
                user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=LOCK_MINUTES)
                user.failed_attempts = 0
            await self.db.commit()
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales invalidas")

        if user.twofa_enabled:
            if not data.otp:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="2FA_REQUIRED")
            totp = pyotp.TOTP(user.twofa_secret)
            if not totp.verify(data.otp):
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="OTP invalido")

        user.failed_attempts = 0
        user.locked_until = None
        await self.db.commit()

        token = create_access_token(subject=user.username, role=user.role)
        await log_event(self.db, user.id, "login", "user", str(user.id), "")
        return {"access_token": token, "role": user.role, "username": user.username}

    async def setup_2fa(self, current_user):
        secret = pyotp.random_base32()
        current_user.twofa_secret = secret
        current_user.twofa_enabled = False
        await self.db.commit()
        uri = pyotp.totp.TOTP(secret).provisioning_uri(name=current_user.username, issuer_name="Bookstore POS")
        return {"secret": secret, "otpauth": uri}

    async def confirm_2fa(self, current_user, code: str):
        if not current_user.twofa_secret:
            raise HTTPException(status_code=400, detail="2FA no configurado")
        totp = pyotp.TOTP(current_user.twofa_secret)
        if not totp.verify(code):
            raise HTTPException(status_code=400, detail="Codigo invalido")
        current_user.twofa_enabled = True
        await self.db.commit()
        return {"ok": True}
