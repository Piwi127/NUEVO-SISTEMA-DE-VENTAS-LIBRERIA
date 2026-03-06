from contextlib import asynccontextmanager

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import log_event
from app.models.permission import RolePermission
from app.schemas.permission import RolePermissionsOut

from app.services._transaction import service_transaction

class PermissionsService:
    def __init__(self, db: AsyncSession, current_user=None):
        self.db = db
        self.user = current_user

    @asynccontextmanager
    async def _transaction(self):
        async with service_transaction(self.db):
            yield

    async def get_role_permissions(self, role: str) -> RolePermissionsOut:
        result = await self.db.execute(select(RolePermission).where(RolePermission.role == role))
        perms = [p.permission for p in result.scalars().all()]
        return RolePermissionsOut(role=role, permissions=perms)

    async def update_role_permissions(self, role: str, permissions: list[str]) -> RolePermissionsOut:
        async with self._transaction():
            await self.db.execute(delete(RolePermission).where(RolePermission.role == role))
            for p in permissions:
                self.db.add(RolePermission(role=role, permission=p))
            if self.user is not None:
                await log_event(
                    self.db, self.user.id, "role_permissions_update", "role", role, f"count={len(permissions)}"
                )
        return RolePermissionsOut(role=role, permissions=permissions)
