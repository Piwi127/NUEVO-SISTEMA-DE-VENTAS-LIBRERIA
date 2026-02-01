from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_role
from app.models.purchasing import PurchaseOrder, PurchaseOrderItem, SupplierPayment
from app.models.purchase import Purchase, PurchaseItem
from app.models.product import Product
from app.models.inventory import StockMovement
from app.schemas.purchasing import PurchaseOrderCreate, PurchaseOrderOut, ReceiveOrder, SupplierPaymentCreate

router = APIRouter(prefix="/purchasing", tags=["purchasing"], dependencies=[Depends(require_role("admin", "stock"))])


@router.post("/orders", response_model=PurchaseOrderOut, status_code=201)
async def create_order(data: PurchaseOrderCreate, db: AsyncSession = Depends(get_db)):
    total = sum(i.qty * i.unit_cost for i in data.items)
    po = PurchaseOrder(supplier_id=data.supplier_id, status="OPEN", total=total)
    db.add(po)
    await db.flush()
    for item in data.items:
        db.add(PurchaseOrderItem(purchase_order_id=po.id, product_id=item.product_id, qty=item.qty, unit_cost=item.unit_cost))
    await db.commit()
    await db.refresh(po)
    return po


@router.post("/orders/{order_id}/receive")
async def receive_order(order_id: int, data: ReceiveOrder, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(PurchaseOrder).where(PurchaseOrder.id == order_id))
    po = res.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404, detail="OC no encontrada")

    async with db.begin():
        purchase = Purchase(supplier_id=po.supplier_id, total=0)
        db.add(purchase)
        await db.flush()
        total = 0

        for item in data.items:
            res_item = await db.execute(select(PurchaseOrderItem).where(
                PurchaseOrderItem.purchase_order_id == order_id,
                PurchaseOrderItem.product_id == item.product_id,
            ))
            po_item = res_item.scalar_one_or_none()
            if not po_item:
                continue
            qty = min(item.qty, po_item.qty - po_item.received_qty)
            if qty <= 0:
                continue
            po_item.received_qty += qty
            line_total = qty * po_item.unit_cost
            total += line_total

            prod_res = await db.execute(select(Product).where(Product.id == item.product_id))
            product = prod_res.scalar_one_or_none()
            if product:
                product.stock += qty
                db.add(StockMovement(product_id=product.id, type="IN", qty=qty, ref=f"PURCHASE:{purchase.id}"))

            db.add(PurchaseItem(
                purchase_id=purchase.id,
                product_id=item.product_id,
                qty=qty,
                unit_cost=po_item.unit_cost,
                line_total=line_total,
            ))

        purchase.total = total
        # close if all received
        all_items = await db.execute(select(PurchaseOrderItem).where(PurchaseOrderItem.purchase_order_id == order_id))
        if all(i.received_qty >= i.qty for i in all_items.scalars().all()):
            po.status = "CLOSED"

    return {"ok": True, "purchase_id": purchase.id}


@router.post("/payments")
async def supplier_payment(data: SupplierPaymentCreate, db: AsyncSession = Depends(get_db)):
    pay = SupplierPayment(**data.model_dump())
    db.add(pay)
    await db.commit()
    return {"ok": True}
