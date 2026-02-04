from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user, require_role
from app.schemas.permission import RolePermissionsOut, RolePermissionsUpdate
from app.services.admin.permissions_service import PermissionsService

router = APIRouter(prefix="/permissions", tags=["permissions"], dependencies=[Depends(require_role("admin"))])


@router.get("/{role}", response_model=RolePermissionsOut)
async def get_role_permissions(role: str, db: AsyncSession = Depends(get_db)):
    service = PermissionsService(db, None)
    return await service.get_role_permissions(role)


@router.put("/{role}", response_model=RolePermissionsOut)
async def update_role_permissions(
    role: str,
    data: RolePermissionsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = PermissionsService(db, current_user)
    return await service.update_role_permissions(role, data.permissions)
