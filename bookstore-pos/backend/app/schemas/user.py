from datetime import datetime

from pydantic import BaseModel


class UserBase(BaseModel):
    username: str
    role: str
    is_active: bool = True


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    username: str
    role: str
    is_active: bool


class PasswordUpdate(BaseModel):
    password: str


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
