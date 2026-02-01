from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_role
from app.models.product import Product
from app.models.purchase import Purchase, PurchaseItem
from app.models.inventory import StockMovement
from app.schemas.purchase import PurchaseCreate, PurchaseOut

router = APIRouter(prefix="/purchases", tags=["purchases"], dependencies=[Depends(require_role("admin", "stock"))])


@router.post("", response_model=PurchaseOut, status_code=201)
async def create_purchase(data: PurchaseCreate, db: AsyncSession = Depends(get_db)):
    async with db.begin():
        purchase = Purchase(supplier_id=data.supplier_id, total=data.total)
        db.add(purchase)
        await db.flush()

        for item in data.items:
            prod_result = await db.execute(select(Product).where(Product.id == item.product_id))
            product = prod_result.scalar_one_or_none()
            if not product:
                raise HTTPException(status_code=404, detail=f"Producto {item.product_id} no encontrado")
            product.stock += item.qty
            line_total = item.unit_cost * item.qty
            p_item = PurchaseItem(
                purchase_id=purchase.id,
                product_id=product.id,
                qty=item.qty,
                unit_cost=item.unit_cost,
                line_total=line_total,
            )
            db.add(p_item)
            movement = StockMovement(
                product_id=product.id,
                type="IN",
                qty=item.qty,
                ref=f"PURCHASE:{purchase.id}",
            )
            db.add(movement)

    await db.refresh(purchase)
    return purchase
