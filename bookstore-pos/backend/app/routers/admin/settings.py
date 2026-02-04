from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user, require_role
from app.schemas.settings import SystemSettingsOut, SystemSettingsUpdate
from app.services.admin.settings_service import SettingsService

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/public", response_model=SystemSettingsOut)
async def get_public_settings(db: AsyncSession = Depends(get_db)):
    service = SettingsService(db)
    return await service.get_settings_out()


@router.get("", response_model=SystemSettingsOut, dependencies=[Depends(require_role("admin"))])
async def get_settings(db: AsyncSession = Depends(get_db)):
    service = SettingsService(db)
    return await service.get_settings_out()


@router.put("", response_model=SystemSettingsOut, dependencies=[Depends(require_role("admin"))])
async def update_settings(
    data: SystemSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = SettingsService(db, current_user)
    return await service.update_settings(data)
