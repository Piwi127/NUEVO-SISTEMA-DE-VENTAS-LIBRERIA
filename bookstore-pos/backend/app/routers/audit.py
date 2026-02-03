from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_role
from app.schemas.audit import AuditLogOut
from app.services.audit_service import AuditService

router = APIRouter(prefix="/audit", tags=["audit"], dependencies=[Depends(require_role("admin"))])


@router.get("", response_model=list[AuditLogOut])
async def list_audit(db: AsyncSession = Depends(get_db)):
    service = AuditService(db)
    return await service.list_audit()
