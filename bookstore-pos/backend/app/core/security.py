from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from cryptography.fernet import Fernet, InvalidToken
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def validate_password(password: str) -> None:
    if len(password) < settings.password_min_length:
        raise ValueError(f"Password debe tener al menos {settings.password_min_length} caracteres")
    if settings.password_require_upper and not any(c.isupper() for c in password):
        raise ValueError("Password debe incluir una mayuscula")
    if settings.password_require_lower and not any(c.islower() for c in password):
        raise ValueError("Password debe incluir una minuscula")
    if settings.password_require_digit and not any(c.isdigit() for c in password):
        raise ValueError("Password debe incluir un numero")


def generate_jti() -> str:
    return uuid4().hex


def create_access_token(subject: str, role: str, jti: str | None = None, expires_minutes: int | None = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes or settings.access_token_expire_minutes)
    to_encode: dict[str, Any] = {"sub": subject, "role": role, "exp": expire, "jti": jti or generate_jti()}
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
        return payload
    except JWTError as exc:
        raise ValueError("Invalid token") from exc


def _get_fernet() -> Fernet | None:
    if not settings.twofa_encryption_key:
        return None
    try:
        return Fernet(settings.twofa_encryption_key.encode())
    except Exception as exc:
        raise ValueError("2FA_ENCRYPTION_KEY invalida") from exc


def encrypt_2fa_secret(secret: str) -> str:
    if not secret:
        return ""
    if secret.startswith("enc:"):
        return secret
    fernet = _get_fernet()
    if not fernet:
        return secret
    token = fernet.encrypt(secret.encode()).decode()
    return f"enc:{token}"


def decrypt_2fa_secret(stored: str) -> str:
    if not stored:
        return ""
    if not stored.startswith("enc:"):
        return stored
    fernet = _get_fernet()
    if not fernet:
        raise ValueError("2FA_ENCRYPTION_KEY requerida para desencriptar")
    token = stored.removeprefix("enc:")
    try:
        return fernet.decrypt(token.encode()).decode()
    except InvalidToken as exc:
        raise ValueError("2FA secreto invalido") from exc
