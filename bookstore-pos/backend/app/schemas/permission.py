from pydantic import BaseModel


class RolePermissionsOut(BaseModel):
    role: str
    permissions: list[str]


class RolePermissionsUpdate(BaseModel):
    permissions: list[str]
