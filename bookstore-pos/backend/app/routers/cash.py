from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user, require_role
from app.models.cash import CashSession, CashMovement, CashAudit
from app.models.sale import Sale, Payment
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

router = APIRouter(prefix="/cash", tags=["cash"], dependencies=[Depends(require_role("admin", "cashier"))])


async def _get_open_session(db: AsyncSession, user_id: int) -> CashSession | None:
    result = await db.execute(
        select(CashSession)
        .where(CashSession.user_id == user_id, CashSession.is_open == True)  # noqa: E712
        .order_by(CashSession.opened_at.desc())
    )
    return result.scalars().first()


async def _compute_summary(db: AsyncSession, session: CashSession) -> CashSummaryOut:
    movements_in = await db.execute(
        select(func.coalesce(func.sum(CashMovement.amount), 0.0)).where(
            CashMovement.cash_session_id == session.id, CashMovement.type == "IN"
        )
    )
    movements_out = await db.execute(
        select(func.coalesce(func.sum(CashMovement.amount), 0.0)).where(
            CashMovement.cash_session_id == session.id, CashMovement.type == "OUT"
        )
    )
    start = session.opened_at
    end = session.closed_at or datetime.utcnow()
    sales_cash = await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0.0))
        .select_from(Payment)
        .join(Sale, Payment.sale_id == Sale.id)
        .where(
            Payment.method == "CASH",
            Sale.user_id == session.user_id,
            Sale.created_at >= start,
            Sale.created_at <= end,
        )
    )
    in_total = float(movements_in.scalar_one() or 0.0)
    out_total = float(movements_out.scalar_one() or 0.0)
    sales_total = float(sales_cash.scalar_one() or 0.0)
    expected = float(session.opening_amount) + in_total - out_total + sales_total
    return CashSummaryOut(
        opening_amount=session.opening_amount,
        movements_in=in_total,
        movements_out=out_total,
        sales_cash=sales_total,
        expected_amount=expected,
    )


@router.get("/current", response_model=CashSessionOut | None)
async def current_cash(db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    return await _get_open_session(db, current_user.id)


@router.post("/open", response_model=CashSessionOut, status_code=201)
async def open_cash(data: CashOpenRequest, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    if await _get_open_session(db, current_user.id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Caja ya abierta")
    session = CashSession(user_id=current_user.id, opening_amount=data.opening_amount, is_open=True)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


@router.post("/close")
async def close_cash(data: CashCloseRequest, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    session = await _get_open_session(db, current_user.id)
    if not session:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="No hay caja abierta")
    session.is_open = False
    session.closed_at = datetime.utcnow()
    await db.commit()
    return {"ok": True}


@router.post("/movement", response_model=CashMovementOut, status_code=201)
async def create_movement(data: CashMovementCreate, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    session = await _get_open_session(db, current_user.id)
    if not session:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="No hay caja abierta")
    movement = CashMovement(
        cash_session_id=session.id,
        type=data.type,
        amount=data.amount,
        reason=data.reason,
    )
    db.add(movement)
    await db.commit()
    await db.refresh(movement)
    return movement


@router.get("/summary", response_model=CashSummaryOut)
async def cash_summary(db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    session = await _get_open_session(db, current_user.id)
    if not session:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="No hay caja abierta")
    return await _compute_summary(db, session)


@router.post("/audit", response_model=CashAuditOut, status_code=201)
async def cash_audit(data: CashAuditCreate, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    session = await _get_open_session(db, current_user.id)
    if not session:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="No hay caja abierta")
    summary = await _compute_summary(db, session)
    diff = data.counted_amount - summary.expected_amount
    audit = CashAudit(
        cash_session_id=session.id,
        type=data.type.upper(),
        expected_amount=summary.expected_amount,
        counted_amount=data.counted_amount,
        difference=diff,
        created_by=current_user.id,
    )
    db.add(audit)
    if data.type.upper() == "Z":
        session.is_open = False
        session.closed_at = datetime.utcnow()
    await db.commit()
    await db.refresh(audit)
    return audit


@router.get("/audits", response_model=list[CashAuditOut])
async def list_audits(db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    result = await db.execute(
        select(CashAudit)
        .join(CashSession, CashAudit.cash_session_id == CashSession.id)
        .where(CashSession.user_id == current_user.id)
        .order_by(CashAudit.id.desc())
        .limit(100)
    )
    return result.scalars().all()


@router.post("/force-close")
async def force_close(db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    result = await db.execute(
        select(CashSession).where(CashSession.user_id == current_user.id, CashSession.is_open == True)  # noqa: E712
    )
    sessions = result.scalars().all()
    if not sessions:
        return {"ok": True}
    now = datetime.utcnow()
    for s in sessions:
        s.is_open = False
        s.closed_at = now
    await db.commit()
    return {"ok": True}
