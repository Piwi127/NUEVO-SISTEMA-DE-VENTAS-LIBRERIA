from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import csv
from io import StringIO

from app.core.deps import get_db, get_current_user, require_permission, require_role
from app.models.purchase import Purchase
from app.schemas.purchase import PurchaseCreate, PurchaseOut
from app.services.purchases_service import PurchasesService

router = APIRouter(prefix="/purchases", tags=["purchases"], dependencies=[Depends(require_role("admin", "stock"))])

@router.get("", response_model=list[PurchaseOut], dependencies=[Depends(require_permission("purchases.create"))])
async def list_purchases(
    from_date: str | None = None,
    to: str | None = None,
    supplier_id: int | None = None,
    limit: int = 200,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Purchase)
    if from_date:
        stmt = stmt.where(Purchase.created_at >= from_date)
    if to:
        stmt = stmt.where(Purchase.created_at <= to)
    if supplier_id:
        stmt = stmt.where(Purchase.supplier_id == supplier_id)
    stmt = stmt.order_by(Purchase.id.desc()).limit(min(max(limit, 1), 500))
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/export", dependencies=[Depends(require_permission("purchases.create"))])
async def export_purchases(
    from_date: str | None = None,
    to: str | None = None,
    supplier_id: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    rows = await list_purchases(from_date, to, supplier_id, 500, db)
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "supplier_id", "total", "created_at"])
    for r in rows:
        writer.writerow([r.id, r.supplier_id, r.total, r.created_at])
    return PlainTextResponse(output.getvalue(), media_type="text/csv")


@router.post("", response_model=PurchaseOut, status_code=201, dependencies=[Depends(require_permission("purchases.create"))])
async def create_purchase(
    data: PurchaseCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = PurchasesService(db, current_user)
    return await service.create_purchase(data)
