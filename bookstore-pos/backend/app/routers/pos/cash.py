from fastapi import APIRouter, Depends
from fastapi.responses import PlainTextResponse
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
    CashSessionReportOut,
    CashSummaryOut,
)
from app.services.pos.cash_service import CashService

router = APIRouter(prefix="/cash", tags=["cash"], dependencies=[Depends(require_role("admin", "cashier"))])


def _render_session_report_text(report: CashSessionReportOut) -> str:
    lines: list[str] = []
    lines.append(f"REPORTE DE CAJA - SESION {report.session.id}")
    lines.append(f"Usuario: {report.session.user_id}")
    lines.append(f"Apertura: {report.period_start}")
    lines.append(f"Cierre: {report.period_end}")
    lines.append(f"Estado: {'ABIERTA' if report.session.is_open else 'CERRADA'}")
    lines.append("-" * 60)
    lines.append("RESUMEN")
    lines.append(f"Monto apertura: {report.summary.opening_amount:.2f}")
    lines.append(f"Movimientos IN: {report.summary.movements_in:.2f}")
    lines.append(f"Movimientos OUT: {report.summary.movements_out:.2f}")
    lines.append(f"Ventas efectivo: {report.summary.sales_cash:.2f}")
    lines.append(f"Esperado final: {report.summary.expected_amount:.2f}")
    lines.append("-" * 60)
    lines.append("MOVIMIENTOS")
    if not report.movements:
        lines.append("Sin movimientos.")
    else:
        for m in report.movements:
            lines.append(f"{m.created_at} | {m.type} | {m.amount:.2f} | {m.reason}")
    lines.append("-" * 60)
    lines.append("ARQUEOS")
    if not report.audits:
        lines.append("Sin arqueos.")
    else:
        for a in report.audits:
            state = "OK" if a.validated else "DIF"
            lines.append(
                f"{a.created_at} | {a.type} | esp {a.expected_amount:.2f} | "
                f"cont {a.counted_amount:.2f} | dif {a.difference:.2f} | {state}"
            )
    lines.append("-" * 60)
    lines.append("VALIDACION")
    lines.append(f"Movimientos contabilizados: {report.validation.movement_count}")
    lines.append(f"Arqueos registrados: {report.validation.audit_count}")
    lines.append(f"Balance final validado: {'SI' if report.validation.is_balanced else 'NO'}")
    for note in report.validation.notes:
        lines.append(f"- {note}")
    return "\n".join(lines)


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
    stmt = (
        select(CashAudit)
        .join(CashSession, CashAudit.cash_session_id == CashSession.id)
        .order_by(CashAudit.id.desc())
        .limit(100)
    )
    if current_user.role != "admin":
        stmt = stmt.where(CashSession.user_id == current_user.id)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/force-close", dependencies=[Depends(require_permission("cash.close"))])
async def force_close(db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    service = CashService(db, current_user)
    return await service.force_close()


@router.get("/sessions/{cash_session_id}/report", response_model=CashSessionReportOut, dependencies=[Depends(require_permission("cash.open"))])
async def get_session_report(cash_session_id: int, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    service = CashService(db, current_user)
    return await service.session_report(cash_session_id)


@router.get("/sessions/{cash_session_id}/report/export", dependencies=[Depends(require_permission("cash.open"))])
async def export_session_report(cash_session_id: int, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    service = CashService(db, current_user)
    report = await service.session_report(cash_session_id)
    content = _render_session_report_text(report)
    headers = {"Content-Disposition": f'attachment; filename="cash_session_{cash_session_id}_report.txt"'}
    return PlainTextResponse(content=content, headers=headers)
