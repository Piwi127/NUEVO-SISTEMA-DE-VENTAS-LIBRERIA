from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user, require_role
from app.core.audit import log_event
from app.models.cash import CashSession
from app.models.product import Product
from app.models.sale import Sale, SaleItem, Payment
from app.models.inventory import StockMovement
from app.models.settings import SystemSettings
from app.schemas.sale import SaleCreate, SaleOut

router = APIRouter(prefix="/sales", tags=["sales"], dependencies=[Depends(require_role("admin", "cashier"))])


@router.post("", response_model=SaleOut, status_code=201)
async def create_sale(data: SaleCreate, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    result = await db.execute(
        select(CashSession).where(CashSession.user_id == current_user.id, CashSession.is_open == True)  # noqa: E712
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Caja no abierta")

    settings_result = await db.execute(select(SystemSettings).limit(1))
    settings = settings_result.scalar_one_or_none()
    invoice_number = ""
    if settings:
        invoice_number = f"{settings.invoice_prefix}-{settings.invoice_next:06d}"
        settings.invoice_next += 1

    async with db.begin():
        sale = Sale(
            user_id=current_user.id,
            customer_id=data.customer_id,
            subtotal=data.subtotal,
            tax=data.tax,
            discount=data.discount,
            total=data.total,
            status="PAID",
            invoice_number=invoice_number,
        )
        db.add(sale)
        await db.flush()

        for item in data.items:
            prod_result = await db.execute(select(Product).where(Product.id == item.product_id))
            product = prod_result.scalar_one_or_none()
            if not product:
                raise HTTPException(status_code=404, detail=f"Producto {item.product_id} no encontrado")
            if product.stock < item.qty:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Stock insuficiente")
            product.stock -= item.qty
            sale_item = SaleItem(
                sale_id=sale.id,
                product_id=product.id,
                qty=item.qty,
                unit_price=product.price,
                line_total=product.price * item.qty,
            )
            db.add(sale_item)
            movement = StockMovement(
                product_id=product.id,
                type="OUT",
                qty=item.qty,
                ref=f"SALE:{sale.id}",
            )
            db.add(movement)

        for p in data.payments:
            payment = Payment(sale_id=sale.id, method=p.method, amount=p.amount)
            db.add(payment)

    await log_event(db, current_user.id, "create", "sale", str(sale.id), invoice_number)
    await db.refresh(sale)
    return sale


@router.get("/{sale_id}/receipt")
async def get_receipt(sale_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Sale).where(Sale.id == sale_id))
    sale = res.scalar_one_or_none()
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    items_res = await db.execute(select(SaleItem).where(SaleItem.sale_id == sale_id))
    items = items_res.scalars().all()

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
                "product_id": i.product_id,
                "qty": i.qty,
                "unit_price": i.unit_price,
                "line_total": i.line_total,
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
