"""
Módulo de seguridad y autenticación.

Proporciona funciones para:
- Hash y verificación de contraseñas
- Creación y decodificación de tokens JWT
- Cifrado de secretos 2FA
- Validación de contraseñas
"""

from datetime import datetime, timedelta, timezone
from hashlib import sha256
from hmac import compare_digest
from typing import Any
from uuid import uuid4

from cryptography.fernet import Fernet, InvalidToken
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# Contexto de hash de contraseñas usando bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# Algoritmo para JWT
ALGORITHM = "HS256"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica si una contraseña plana coincide con su hash.

    Args:
        plain_password: Contraseña en texto plano.
        hashed_password: Hash de contraseña almacenado.

    Returns:
        True si la contraseña es correcta, False en caso contrario.
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Genera un hash bcrypt de la contraseña.

    Args:
        password: Contraseña a hashear.

    Returns:
        Hash de la contraseña.
    """
    return pwd_context.hash(password)


def validate_password(password: str) -> None:
    """
    Valida que la contraseña cumpla con los requisitos de seguridad.

    Args:
        password: Contraseña a validar.

    Raises:
        ValueError: Si la contraseña no cumple los requisitos.
    """
    if len(password) < settings.password_min_length:
        raise ValueError(
            f"Password debe tener al menos {settings.password_min_length} caracteres"
        )
    if settings.password_require_upper and not any(c.isupper() for c in password):
        raise ValueError("Password debe incluir una mayuscula")
    if settings.password_require_lower and not any(c.islower() for c in password):
        raise ValueError("Password debe incluir una minuscula")
    if settings.password_require_digit and not any(c.isdigit() for c in password):
        raise ValueError("Password debe incluir un numero")


def generate_jti() -> str:
    """
    Genera un identificador único (JWT ID) para tokens.

    Returns:
        UUID hexadecimal único.
    """
    return uuid4().hex


def create_access_token(
    subject: str, role: str, jti: str | None = None, expires_minutes: int | None = None
) -> str:
    """
    Crea un token JWT de acceso.

    Args:
        subject: Nombre de usuario/subject del token.
        role: Rol del usuario.
        jti: JWT ID opcional (generado si no se proporciona).
        expires_minutes: Minutos de expiración (usa configuración por defecto si no se proporciona).

    Returns:
        Token JWT codificado.
    """
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes or settings.access_token_expire_minutes
    )
    to_encode: dict[str, Any] = {
        "sub": subject,
        "role": role,
        "typ": "access",
        "exp": expire,
        "jti": jti or generate_jti(),
    }
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=ALGORITHM)


def create_refresh_token(
    subject: str,
    role: str,
    jti: str | None = None,
    family_id: str | None = None,
    expires_minutes: int | None = None,
) -> str:
    """
    Crea un token JWT de refresh.

    Args:
        subject: Nombre de usuario/subject del token.
        role: Rol del usuario.
        jti: JWT ID opcional.
        family_id: ID de familia de tokens (para invalidar todos los tokens relacionados).
        expires_minutes: Minutos de expiración.

    Returns:
        Token JWT de refresh codificado.
    """
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes or settings.refresh_token_expire_minutes
    )
    to_encode: dict[str, Any] = {
        "sub": subject,
        "role": role,
        "typ": "refresh",
        "exp": expire,
        "jti": jti or generate_jti(),
        "family": family_id or generate_jti(),
    }
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    """
    Decodifica y valida un token JWT.

    Args:
        token: Token JWT a decodificar.

    Returns:
        Payload del token decodificado.

    Raises:
        ValueError: Si el token es inválido o expirado.
    """
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
        return payload
    except JWTError as exc:
        raise ValueError("Invalid token") from exc


def token_fingerprint(token: str) -> str:
    """
    Genera una huella digital (hash) del token para almacenamiento seguro.

    Args:
        token: Token a generar huella.

    Returns:
        Hash SHA-256 del token en formato hexadecimal.
    """
    return sha256(token.encode("utf-8")).hexdigest()


def verify_token_fingerprint(token: str, fingerprint: str) -> bool:
    """
    Verifica si la huella digital del token coincide.

    Args:
        token: Token a verificar.
        fingerprint: Huella digital almacenada.

    Returns:
        True si coinciden, False en caso contrario.
    """
    return compare_digest(token_fingerprint(token), fingerprint)


def _get_fernet() -> Fernet | None:
    """
    Obtiene instancia de Fernet para cifrado 2FA.

    Returns:
        Instancia de Fernet o None si no hay clave configurada.
    """
    if not settings.twofa_encryption_key:
        return None
    try:
        return Fernet(settings.twofa_encryption_key.encode())
    except Exception as exc:
        raise ValueError("2FA_ENCRYPTION_KEY invalida") from exc


def encrypt_2fa_secret(secret: str) -> str:
    """
    Cifra el secreto de 2FA para almacenamiento seguro.

    Args:
        secret: Secreto TOTP en texto plano.

    Returns:
        Secreto cifrado con prefijo 'enc:' o texto plano si no hay clave.
    """
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
    """
    Descifra el secreto de 2FA almacenado.

    Args:
        stored: Secreto cifrado almacenado.

    Returns:
        Secreto TOTP en texto plano.

    Raises:
        ValueError: Si no hay clave de cifrado o el secreto es inválido.
    """
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
