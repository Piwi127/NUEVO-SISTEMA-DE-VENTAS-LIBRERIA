from fastapi import APIRouter, Depends
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_role
from app.models.permission import RolePermission
from app.schemas.permission import RolePermissionsOut, RolePermissionsUpdate

router = APIRouter(prefix="/permissions", tags=["permissions"], dependencies=[Depends(require_role("admin"))])


@router.get("/{role}", response_model=RolePermissionsOut)
async def get_role_permissions(role: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(RolePermission).where(RolePermission.role == role))
    perms = [p.permission for p in result.scalars().all()]
    return RolePermissionsOut(role=role, permissions=perms)


@router.put("/{role}", response_model=RolePermissionsOut)
async def update_role_permissions(role: str, data: RolePermissionsUpdate, db: AsyncSession = Depends(get_db)):
    await db.execute(delete(RolePermission).where(RolePermission.role == role))
    for p in data.permissions:
        db.add(RolePermission(role=role, permission=p))
    await db.commit()
    return RolePermissionsOut(role=role, permissions=data.permissions)
