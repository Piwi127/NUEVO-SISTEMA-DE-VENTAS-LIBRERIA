import pyotp
from contextlib import asynccontextmanager

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import log_event
from app.core.security import get_password_hash, validate_password, encrypt_2fa_secret, decrypt_2fa_secret
from app.models.user import User


class UsersService:
    def __init__(self, db: AsyncSession, current_user):
        self.db = db
        self.user = current_user

    @asynccontextmanager
    async def _transaction(self):
        if self.db.in_transaction():
            try:
                yield
                await self.db.commit()
            except Exception:
                await self.db.rollback()
                raise
        else:
            async with self.db.begin():
                yield

    async def create_user(self, data):
        exists = await self.db.execute(select(User).where(User.username == data.username))
        if exists.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username duplicado")
        validate_password(data.password)
        async with self._transaction():
            user = User(
                username=data.username,
                password_hash=get_password_hash(data.password),
                role=data.role,
                is_active=data.is_active,
            )
            self.db.add(user)
            await self.db.flush()
            await log_event(self.db, self.user.id, "user_create", "user", str(user.id), user.username)
            await self.db.refresh(user)
            return user

    async def update_user(self, user_id: int, data):
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        if user.username != data.username:
            exists = await self.db.execute(select(User).where(User.username == data.username))
            if exists.scalar_one_or_none():
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username duplicado")
        async with self._transaction():
            user.username = data.username
            user.role = data.role
            user.is_active = data.is_active
            await log_event(self.db, self.user.id, "user_update", "user", str(user.id), user.username)
            await self.db.refresh(user)
            return user

    async def update_password(self, user_id: int, data):
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        validate_password(data.password)
        async with self._transaction():
            user.password_hash = get_password_hash(data.password)
            await log_event(self.db, self.user.id, "user_password", "user", str(user.id), "")
        return {"ok": True}

    async def update_status(self, user_id: int, data):
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        async with self._transaction():
            user.is_active = data.is_active
            await log_event(self.db, self.user.id, "user_status", "user", str(user.id), f"active={data.is_active}")
        return {"ok": True}

    async def unlock_user(self, user_id: int):
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        async with self._transaction():
            user.failed_attempts = 0
            user.locked_until = None
            await log_event(self.db, self.user.id, "user_unlock", "user", str(user.id), "")
        return {"ok": True}

    async def setup_user_2fa(self, user_id: int):
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        secret = pyotp.random_base32()
        async with self._transaction():
            user.twofa_secret = encrypt_2fa_secret(secret)
            user.twofa_enabled = False
            uri = pyotp.totp.TOTP(secret).provisioning_uri(name=user.username, issuer_name="Bookstore POS")
            await log_event(self.db, self.user.id, "user_2fa_setup", "user", str(user.id), "")
            return {"secret": secret, "otpauth": uri}

    async def confirm_user_2fa(self, user_id: int, data):
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        if not user.twofa_secret:
            raise HTTPException(status_code=400, detail="2FA no configurado")
        secret = decrypt_2fa_secret(user.twofa_secret)
        totp = pyotp.TOTP(secret)
        if not totp.verify(data.code):
            raise HTTPException(status_code=400, detail="Codigo invalido")
        async with self._transaction():
            user.twofa_enabled = True
            await log_event(self.db, self.user.id, "user_2fa_confirm", "user", str(user.id), "")
        return {"ok": True}

    async def reset_user_2fa(self, user_id: int):
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        async with self._transaction():
            user.twofa_enabled = False
            user.twofa_secret = ""
            await log_event(self.db, self.user.id, "user_2fa_reset", "user", str(user.id), "")
        return {"ok": True}
