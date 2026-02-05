from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str
    otp: str | None = None


class TokenResponse(BaseModel):
    role: str
    username: str
    csrf_token: str | None = None


class MeResponse(BaseModel):
    username: str
    role: str
