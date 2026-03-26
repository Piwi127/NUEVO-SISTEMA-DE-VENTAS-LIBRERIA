"""
Esquemas de usuario para validación y serialización.
"""

from datetime import datetime

from pydantic import BaseModel, field_validator

from app.core.security import validate_password


class UserBase(BaseModel):
    """Datos base de usuario."""

    username: str
    role: str
    is_active: bool = True


class UserCreate(UserCreate):
    """Esquema para crear usuario."""

    password: str

    @field_validator("password")
    @classmethod
    def validate_password_field(cls, value: str) -> str:
        validate_password(value)
        return value


class UserUpdate(BaseModel):
    """Esquema para actualizar usuario."""

    username: str
    role: str
    is_active: bool


class PasswordUpdate(BaseModel):
    """Esquema para cambiar contraseña."""

    password: str

    @field_validator("password")
    @classmethod
    def validate_password_field(cls, value: str) -> str:
        validate_password(value)
        return value


class StatusUpdate(BaseModel):
    """Esquema para cambiar estado de usuario."""

    is_active: bool


class UserOut(UserBase):
    """Esquema de usuario para respuesta."""

    id: int
    failed_attempts: int = 0
    locked_until: datetime | None = None
    twofa_enabled: bool = False

    model_config = {"from_attributes": True}


class TwoFAConfirm(BaseModel):
    """Esquema para confirmar código 2FA."""

    code: str
