from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import log_event
from app.models.cash import CashSession, CashMovement, CashAudit
from app.models.sale import Sale, Payment
from app.schemas.cash import (
    CashAuditValidationOut,
    CashMovementOut,
    CashReportValidationOut,
    CashSessionOut,
    CashSessionReportOut,
    CashSummaryOut,
)


class CashService:
    def __init__(self, db: AsyncSession, current_user):
        self.db = db
        self.user = current_user

    @asynccontextmanager
    async def _transaction(self):
        if self.db.in_transaction():
            try:
                yield
                await self.db.commit()
            except Exception:
                await self.db.rollback()
                raise
        else:
            async with self.db.begin():
                yield

    async def get_open_session(self) -> CashSession | None:
        result = await self.db.execute(
            select(CashSession)
            .where(CashSession.user_id == self.user.id, CashSession.is_open == True)  # noqa: E712
            .order_by(CashSession.opened_at.desc())
        )
        return result.scalars().first()

    async def _get_session_or_404(self, cash_session_id: int) -> CashSession:
        result = await self.db.execute(select(CashSession).where(CashSession.id == cash_session_id))
        session = result.scalar_one_or_none()
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sesion de caja no encontrada")
        if self.user.role != "admin" and session.user_id != self.user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permisos")
        return session

    async def compute_summary(self, session: CashSession) -> CashSummaryOut:
        movements_in = await self.db.execute(
            select(func.coalesce(func.sum(CashMovement.amount), 0.0)).where(
                CashMovement.cash_session_id == session.id, CashMovement.type == "IN"
            )
        )
        movements_out = await self.db.execute(
            select(func.coalesce(func.sum(CashMovement.amount), 0.0)).where(
                CashMovement.cash_session_id == session.id, CashMovement.type == "OUT"
            )
        )
        start = session.opened_at
        end = session.closed_at or datetime.now(timezone.utc)
        sales_cash = await self.db.execute(
            select(func.coalesce(func.sum(Payment.amount), 0.0))
            .select_from(Payment)
            .join(Sale, Payment.sale_id == Sale.id)
            .where(
                Payment.method == "CASH",
                Sale.user_id == session.user_id,
                Sale.status != "VOID",
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

    async def open_cash(self, data):
        if await self.get_open_session():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Caja ya abierta")
        async with self._transaction():
            session = CashSession(user_id=self.user.id, opening_amount=data.opening_amount, is_open=True)
            self.db.add(session)
            await self.db.flush()
            await log_event(self.db, self.user.id, "cash_open", "cash_session", str(session.id), "")
            await self.db.refresh(session)
            return session

    async def close_cash(self, data):
        session = await self.get_open_session()
        if not session:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="No hay caja abierta")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cierre bloqueado: debe registrar arqueo tipo Z para cerrar caja",
        )

    async def create_movement(self, data):
        session = await self.get_open_session()
        if not session:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="No hay caja abierta")
        async with self._transaction():
            movement = CashMovement(
                cash_session_id=session.id,
                type=data.type,
                amount=data.amount,
                reason=data.reason,
            )
            self.db.add(movement)
            await self.db.flush()
            await log_event(
                self.db,
                self.user.id,
                "cash_movement",
                "cash_movement",
                str(movement.id),
                f"{data.type}:{data.amount}",
            )
            await self.db.refresh(movement)
            return movement

    async def cash_summary(self):
        session = await self.get_open_session()
        if not session:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="No hay caja abierta")
        return await self.compute_summary(session)

    async def cash_audit(self, data):
        session = await self.get_open_session()
        if not session:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="No hay caja abierta")
        summary = await self.compute_summary(session)
        diff = data.counted_amount - summary.expected_amount
        async with self._transaction():
            audit = CashAudit(
                cash_session_id=session.id,
                type=data.type.upper(),
                expected_amount=summary.expected_amount,
                counted_amount=data.counted_amount,
                difference=diff,
                created_by=self.user.id,
            )
            self.db.add(audit)
            if data.type.upper() == "Z":
                session.is_open = False
                session.closed_at = datetime.now(timezone.utc)
            await log_event(self.db, self.user.id, "cash_audit", "cash_audit", str(audit.id), data.type.upper())
            await self.db.refresh(audit)
            return audit

    async def force_close(self):
        result = await self.db.execute(
            select(CashSession).where(CashSession.user_id == self.user.id, CashSession.is_open == True)  # noqa: E712
        )
        sessions = result.scalars().all()
        if not sessions:
            return {"ok": True}
        now = datetime.now(timezone.utc)
        async with self._transaction():
            for s in sessions:
                s.is_open = False
                s.closed_at = now
            await log_event(self.db, self.user.id, "cash_force_close", "cash_session", "", "")
        return {"ok": True}

    async def session_report(self, cash_session_id: int) -> CashSessionReportOut:
        session = await self._get_session_or_404(cash_session_id)
        summary = await self.compute_summary(session)
        period_end = session.closed_at or datetime.now(timezone.utc)

        movements_res = await self.db.execute(
            select(CashMovement)
            .where(CashMovement.cash_session_id == session.id)
            .order_by(CashMovement.created_at.asc(), CashMovement.id.asc())
        )
        movement_models = movements_res.scalars().all()
        movements = [CashMovementOut.model_validate(m) for m in movement_models]

        audits_res = await self.db.execute(
            select(CashAudit)
            .where(CashAudit.cash_session_id == session.id)
            .order_by(CashAudit.created_at.asc(), CashAudit.id.asc())
        )
        audit_models = audits_res.scalars().all()
        audits = [
            CashAuditValidationOut(
                id=a.id,
                cash_session_id=a.cash_session_id,
                type=a.type,
                expected_amount=a.expected_amount,
                counted_amount=a.counted_amount,
                difference=a.difference,
                created_by=a.created_by,
                created_at=a.created_at,
                validated=abs(float(a.difference or 0.0)) <= 0.01,
            )
            for a in audit_models
        ]

        notes: list[str] = []
        if not movements:
            notes.append("No hay movimientos manuales registrados.")
        if not audits:
            notes.append("No hay arqueos registrados.")
        if session.is_open:
            notes.append("La caja sigue abierta; el reporte es parcial.")

        last_audit = audits[-1] if audits else None
        is_balanced = bool(last_audit and last_audit.type.upper() == "Z" and last_audit.validated)
        if last_audit and last_audit.type.upper() == "Z" and last_audit.validated:
            notes.append("Cierre Z validado sin diferencias.")
        elif last_audit and last_audit.type.upper() == "Z":
            notes.append("Cierre Z con diferencia pendiente de revision.")

        validation = CashReportValidationOut(
            movement_count=len(movements),
            audit_count=len(audits),
            last_audit_type=last_audit.type if last_audit else None,
            last_difference=last_audit.difference if last_audit else None,
            is_balanced=is_balanced,
            notes=notes,
        )

        return CashSessionReportOut(
            session=CashSessionOut.model_validate(session),
            summary=summary,
            period_start=session.opened_at,
            period_end=period_end,
            movements=movements,
            audits=audits,
            validation=validation,
        )
