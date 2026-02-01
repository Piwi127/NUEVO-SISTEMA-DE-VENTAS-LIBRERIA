from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_role
from app.core.audit import log_event
from app.models.sale import Sale, SaleItem
from app.models.sale_return import SaleReturn, SaleReturnItem
from app.models.product import Product
from app.models.inventory import StockMovement
from app.schemas.sale_return import SaleReturnCreate, SaleReturnOut

router = APIRouter(prefix="/returns", tags=["returns"], dependencies=[Depends(require_role("admin", "cashier"))])


@router.post("/{sale_id}", response_model=SaleReturnOut, status_code=201)
async def return_sale(sale_id: int, data: SaleReturnCreate, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Sale).where(Sale.id == sale_id))
    sale = res.scalar_one_or_none()
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    if sale.status == "VOID":
        raise HTTPException(status_code=409, detail="Venta ya anulada")

    items_res = await db.execute(select(SaleItem).where(SaleItem.sale_id == sale_id))
    items = items_res.scalars().all()

    async with db.begin():
        sale.status = "VOID"
        ret = SaleReturn(sale_id=sale_id, reason=data.reason)
        db.add(ret)
        await db.flush()

        for item in items:
            prod_res = await db.execute(select(Product).where(Product.id == item.product_id))
            product = prod_res.scalar_one_or_none()
            if product:
                product.stock += item.qty
                db.add(StockMovement(product_id=product.id, type="IN", qty=item.qty, ref=f"RETURN:{ret.id}"))
            db.add(SaleReturnItem(return_id=ret.id, product_id=item.product_id, qty=item.qty))

    await log_event(db, None, "return", "sale", str(sale_id), data.reason)
    await db.refresh(ret)
    return ret
