from datetime import datetime

from pydantic import BaseModel, field_validator

from app.core.security import validate_password


class UserBase(BaseModel):
    username: str
    role: str
    is_active: bool = True


class UserCreate(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def validate_password_field(cls, value: str) -> str:
        validate_password(value)
        return value


class UserUpdate(BaseModel):
    username: str
    role: str
    is_active: bool


class PasswordUpdate(BaseModel):
    password: str

    @field_validator("password")
    @classmethod
    def validate_password_field(cls, value: str) -> str:
        validate_password(value)
        return value


class StatusUpdate(BaseModel):
    is_active: bool


class UserOut(UserBase):
    id: int
    failed_attempts: int = 0
    locked_until: datetime | None = None
    twofa_enabled: bool = False

    model_config = {"from_attributes": True}


class TwoFAConfirm(BaseModel):
    code: str
