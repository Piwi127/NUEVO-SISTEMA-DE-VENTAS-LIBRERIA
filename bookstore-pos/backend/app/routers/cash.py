from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user, require_permission, require_role
from app.models.cash import CashSession, CashAudit
from app.schemas.cash import (
    CashOpenRequest,
    CashCloseRequest,
    CashMovementCreate,
    CashSessionOut,
    CashMovementOut,
    CashAuditCreate,
    CashAuditOut,
    CashSummaryOut,
)
from app.services.cash_service import CashService

router = APIRouter(prefix="/cash", tags=["cash"], dependencies=[Depends(require_role("admin", "cashier"))])


@router.get("/current", response_model=CashSessionOut | None, dependencies=[Depends(require_permission("cash.open"))])
async def current_cash(db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    service = CashService(db, current_user)
    return await service.get_open_session()


@router.post("/open", response_model=CashSessionOut, status_code=201, dependencies=[Depends(require_permission("cash.open"))])
async def open_cash(data: CashOpenRequest, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    service = CashService(db, current_user)
    return await service.open_cash(data)


@router.post("/close", dependencies=[Depends(require_permission("cash.close"))])
async def close_cash(data: CashCloseRequest, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    service = CashService(db, current_user)
    return await service.close_cash(data)


@router.post("/movement", response_model=CashMovementOut, status_code=201, dependencies=[Depends(require_permission("cash.movement"))])
async def create_movement(data: CashMovementCreate, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    service = CashService(db, current_user)
    return await service.create_movement(data)


@router.get("/summary", response_model=CashSummaryOut, dependencies=[Depends(require_permission("cash.open"))])
async def cash_summary(db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    service = CashService(db, current_user)
    return await service.cash_summary()


@router.post("/audit", response_model=CashAuditOut, status_code=201, dependencies=[Depends(require_permission("cash.close"))])
async def cash_audit(data: CashAuditCreate, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    service = CashService(db, current_user)
    return await service.cash_audit(data)


@router.get("/audits", response_model=list[CashAuditOut], dependencies=[Depends(require_permission("cash.open"))])
async def list_audits(db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    result = await db.execute(
        select(CashAudit)
        .join(CashSession, CashAudit.cash_session_id == CashSession.id)
        .where(CashSession.user_id == current_user.id)
        .order_by(CashAudit.id.desc())
        .limit(100)
    )
    return result.scalars().all()


@router.post("/force-close", dependencies=[Depends(require_permission("cash.close"))])
async def force_close(db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    service = CashService(db, current_user)
    return await service.force_close()
