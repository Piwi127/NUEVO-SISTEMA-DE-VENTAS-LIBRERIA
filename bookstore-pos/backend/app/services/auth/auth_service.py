from datetime import datetime, timedelta, timezone

import pyotp
from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import log_event
from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    decrypt_2fa_secret,
    encrypt_2fa_secret,
    generate_jti,
    token_fingerprint,
    verify_password,
    verify_token_fingerprint,
)
from app.models.session import RefreshToken, UserSession
from app.models.user import User

LOCK_THRESHOLD = 5
LOCK_MINUTES = 15


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)

    @staticmethod
    def _as_utc(value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value

    def _verify_totp(self, secret: str, code: str) -> bool:
        if not code:
            return False
        normalized = code.strip().replace(" ", "")
        totp = pyotp.TOTP(secret)
        return bool(totp.verify(normalized, valid_window=1))

    async def _issue_tokens_for_user(
        self,
        user: User,
        *,
        ip: str | None,
        user_agent: str | None,
        family_id: str | None = None,
        parent_refresh_jti: str | None = None,
    ) -> dict[str, str]:
        now = self._now()
        session_family_id = family_id or generate_jti()
        access_jti = generate_jti()
        refresh_jti = generate_jti()
        access_token = create_access_token(subject=user.username, role=user.role, jti=access_jti)
        refresh_token = create_refresh_token(
            subject=user.username,
            role=user.role,
            jti=refresh_jti,
            family_id=session_family_id,
        )
        self.db.add(
            UserSession(
                user_id=user.id,
                family_id=session_family_id,
                jti=access_jti,
                created_at=now,
                expires_at=now + timedelta(minutes=settings.access_token_expire_minutes),
                revoked_at=None,
                ip=ip,
                user_agent=user_agent,
            )
        )
        self.db.add(
            RefreshToken(
                user_id=user.id,
                family_id=session_family_id,
                jti=refresh_jti,
                token_hash=token_fingerprint(refresh_token),
                parent_jti=parent_refresh_jti,
                replaced_by_jti=None,
                created_at=now,
                expires_at=now + timedelta(minutes=settings.refresh_token_expire_minutes),
                revoked_at=None,
            )
        )
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "role": user.role,
            "username": user.username,
            "family_id": session_family_id,
            "refresh_jti": refresh_jti,
        }

    async def _revoke_access_family(self, family_id: str, *, revoked_at: datetime) -> None:
        await self.db.execute(
            update(UserSession)
            .where(UserSession.family_id == family_id, UserSession.revoked_at.is_(None))
            .values(revoked_at=revoked_at)
        )

    async def _revoke_refresh_family(self, family_id: str, *, revoked_at: datetime) -> None:
        await self.db.execute(
            update(RefreshToken)
            .where(RefreshToken.family_id == family_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=revoked_at)
        )

    async def _revoke_family_tokens(self, family_id: str, *, revoked_at: datetime) -> None:
        await self._revoke_access_family(family_id, revoked_at=revoked_at)
        await self._revoke_refresh_family(family_id, revoked_at=revoked_at)

    async def login(self, data, ip: str | None = None, user_agent: str | None = None):
        result = await self.db.execute(select(User).where(User.username == data.username))
        user = result.scalar_one_or_none()
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales invalidas")

        locked_until = user.locked_until
        if locked_until and locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        if locked_until and locked_until > self._now():
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cuenta bloqueada. Intente mas tarde")

        if not verify_password(data.password, user.password_hash):
            user.failed_attempts += 1
            locked = False
            if user.failed_attempts >= LOCK_THRESHOLD:
                user.locked_until = self._now() + timedelta(minutes=LOCK_MINUTES)
                user.failed_attempts = 0
                locked = True
            await log_event(self.db, user.id, "login_failed", "user", str(user.id), "", ip=ip, user_agent=user_agent)
            if locked:
                await log_event(self.db, user.id, "user_locked", "user", str(user.id), "", ip=ip, user_agent=user_agent)
            await self.db.commit()
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales invalidas")

        if user.twofa_enabled:
            if not data.otp:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="2FA_REQUIRED")
            secret = decrypt_2fa_secret(user.twofa_secret)
            if not self._verify_totp(secret, data.otp or ""):
                user.failed_attempts += 1
                locked = False
                if user.failed_attempts >= LOCK_THRESHOLD:
                    user.locked_until = self._now() + timedelta(minutes=LOCK_MINUTES)
                    user.failed_attempts = 0
                    locked = True
                await log_event(self.db, user.id, "login_otp_failed", "user", str(user.id), "", ip=ip, user_agent=user_agent)
                if locked:
                    await log_event(self.db, user.id, "user_locked", "user", str(user.id), "", ip=ip, user_agent=user_agent)
                await self.db.commit()
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="OTP invalido")

        user.failed_attempts = 0
        user.locked_until = None

        tokens = await self._issue_tokens_for_user(user, ip=ip, user_agent=user_agent)
        await log_event(self.db, user.id, "login", "user", str(user.id), "", ip=ip, user_agent=user_agent)
        await self.db.commit()
        return tokens

    async def refresh(self, refresh_token: str, ip: str | None = None, user_agent: str | None = None):
        if not refresh_token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token invalido")
        try:
            payload = decode_token(refresh_token)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token invalido") from exc

        if payload.get("typ") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token invalido")

        username = payload.get("sub")
        jti = payload.get("jti")
        family_id = payload.get("family")
        if not username or not jti or not family_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token invalido")

        token_result = await self.db.execute(select(RefreshToken).where(RefreshToken.jti == jti))
        current_token = token_result.scalar_one_or_none()
        if not current_token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sesion expirada")

        now = self._now()
        token_expired = self._as_utc(current_token.expires_at) < now
        token_invalid = (
            current_token.family_id != family_id
            or current_token.revoked_at is not None
            or current_token.replaced_by_jti is not None
            or token_expired
            or not verify_token_fingerprint(refresh_token, current_token.token_hash)
        )
        if token_invalid:
            await self._revoke_family_tokens(current_token.family_id, revoked_at=now)
            await self.db.commit()
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sesion revocada")

        user = await self.db.get(User, current_token.user_id)
        if not user or not user.is_active or user.username != username:
            await self._revoke_family_tokens(current_token.family_id, revoked_at=now)
            await self.db.commit()
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario inactivo")

        current_token.revoked_at = now
        await self._revoke_access_family(current_token.family_id, revoked_at=now)
        rotated = await self._issue_tokens_for_user(
            user,
            ip=ip,
            user_agent=user_agent,
            family_id=current_token.family_id,
            parent_refresh_jti=current_token.jti,
        )
        current_token.replaced_by_jti = rotated["refresh_jti"]
        await log_event(self.db, user.id, "token_refresh", "user", str(user.id), "", ip=ip, user_agent=user_agent)
        await self.db.commit()
        return rotated

    async def setup_2fa(self, current_user):
        secret = pyotp.random_base32()
        current_user.twofa_secret = encrypt_2fa_secret(secret)
        current_user.twofa_enabled = False
        await self.db.commit()
        uri = pyotp.totp.TOTP(secret).provisioning_uri(name=current_user.username, issuer_name="Bookstore POS")
        return {"secret": secret, "otpauth": uri}

    async def confirm_2fa(self, current_user, code: str):
        if not current_user.twofa_secret:
            raise HTTPException(status_code=400, detail="2FA no configurado")
        secret = decrypt_2fa_secret(current_user.twofa_secret)
        if not self._verify_totp(secret, code):
            raise HTTPException(status_code=400, detail="Codigo invalido")
        current_user.twofa_enabled = True
        await self.db.commit()
        return {"ok": True}

    async def revoke_token(self, token: str, ip: str | None = None, user_agent: str | None = None) -> None:
        try:
            payload = decode_token(token)
        except ValueError:
            return

        jti = payload.get("jti")
        token_type = payload.get("typ")
        family_id = payload.get("family")
        if not jti:
            return

        now = self._now()
        user_id: int | None = None

        if token_type == "refresh":
            result = await self.db.execute(select(RefreshToken).where(RefreshToken.jti == jti))
            session_token = result.scalar_one_or_none()
            if session_token:
                family_id = session_token.family_id
                user_id = session_token.user_id
        else:
            result = await self.db.execute(select(UserSession).where(UserSession.jti == jti))
            session = result.scalar_one_or_none()
            if session:
                family_id = session.family_id
                user_id = session.user_id

        revoked_any = False
        if family_id:
            await self._revoke_family_tokens(family_id, revoked_at=now)
            revoked_any = True

        if user_id is not None:
            await log_event(self.db, user_id, "logout", "user", str(user_id), "", ip=ip, user_agent=user_agent)
            revoked_any = True
        if revoked_any:
            await self.db.commit()

    async def logout_all(self, user: User, ip: str | None = None, user_agent: str | None = None) -> None:
        now = self._now()
        await self.db.execute(
            update(UserSession)
            .where(UserSession.user_id == user.id, UserSession.revoked_at.is_(None))
            .values(revoked_at=now)
        )
        await self.db.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=now)
        )
        await log_event(self.db, user.id, "logout_all", "user", str(user.id), "", ip=ip, user_agent=user_agent)
        await self.db.commit()
