from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user, require_permission, require_role
from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.models.settings import SystemSettings
from app.schemas.sale import SaleCreate, SaleOut, SaleListOut
from app.services.pos.sales_service import SalesService

router = APIRouter(prefix="/sales", tags=["sales"], dependencies=[Depends(require_role("admin", "cashier"))])

@router.get("", response_model=list[SaleListOut], dependencies=[Depends(require_permission("sales.read"))])
async def list_sales(
    status: str | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
    customer_id: int | None = None,
    user_id: int | None = None,
    limit: int = 200,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Sale)
    if status:
        stmt = stmt.where(Sale.status == status)
    if from_date:
        stmt = stmt.where(func.date(Sale.created_at) >= from_date)
    if to_date:
        stmt = stmt.where(func.date(Sale.created_at) <= to_date)
    if customer_id:
        stmt = stmt.where(Sale.customer_id == customer_id)
    if user_id:
        stmt = stmt.where(Sale.user_id == user_id)
    stmt = stmt.order_by(Sale.id.desc()).limit(min(max(limit, 1), 500))
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=SaleOut, status_code=201, dependencies=[Depends(require_permission("sales.create"))])
async def create_sale(data: SaleCreate, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    service = SalesService(db, current_user)
    return await service.create_sale(data)


@router.get("/{sale_id}/receipt", dependencies=[Depends(require_permission("sales.read"))])
async def get_receipt(sale_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Sale).where(Sale.id == sale_id))
    sale = res.scalar_one_or_none()
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    items_res = await db.execute(
        select(SaleItem, Product.name)
        .join(Product, Product.id == SaleItem.product_id)
        .where(SaleItem.sale_id == sale_id)
    )
    items = items_res.all()

    settings_res = await db.execute(select(SystemSettings).limit(1))
    settings = settings_res.scalar_one_or_none()

    return {
        "sale_id": sale.id,
        "invoice_number": sale.invoice_number,
        "created_at": sale.created_at.isoformat(),
        "subtotal": sale.subtotal,
        "tax": sale.tax,
        "discount": sale.discount,
        "total": sale.total,
        "items": [
            {
                "product_id": i.SaleItem.product_id,
                "name": i.name,
                "qty": i.SaleItem.qty,
                "unit_price": i.SaleItem.unit_price,
                "line_total": i.SaleItem.line_total,
            }
            for i in items
        ],
        "store": {
            "name": settings.project_name if settings else "",
            "address": settings.store_address if settings else "",
            "phone": settings.store_phone if settings else "",
            "tax_id": settings.store_tax_id if settings else "",
        },
        "receipt": {
            "header": settings.receipt_header if settings else "",
            "footer": settings.receipt_footer if settings else "",
            "paper_width_mm": settings.paper_width_mm if settings else 80,
        },
    }
