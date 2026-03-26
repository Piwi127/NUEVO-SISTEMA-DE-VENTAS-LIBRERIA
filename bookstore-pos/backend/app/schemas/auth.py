"""
Esquemas de autenticación.
"""

from pydantic import BaseModel


class LoginRequest(BaseModel):
    """Solicitud de login."""

    username: str
    password: str
    otp: str | None = None


class TokenResponse(BaseModel):
    """Respuesta con token de acceso."""

    role: str
    username: str
    csrf_token: str | None = None


class RefreshResponse(BaseModel):
    """Respuesta al refrescar token."""

    role: str
    username: str
    csrf_token: str | None = None


class LogoutResponse(BaseModel):
    """Respuesta de logout."""

    ok: bool = True


class MeResponse(BaseModel):
    """Información del usuario actual."""

    username: str
    role: str
