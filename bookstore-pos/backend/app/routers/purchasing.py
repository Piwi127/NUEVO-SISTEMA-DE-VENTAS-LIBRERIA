from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user, require_permission, require_role
from app.models.purchasing import PurchaseOrder, PurchaseOrderItem
from app.schemas.purchasing import PurchaseOrderCreate, PurchaseOrderOut, PurchaseOrderItemOut, ReceiveOrder, SupplierPaymentCreate
from app.services.purchasing_service import PurchasingService

router = APIRouter(prefix="/purchasing", tags=["purchasing"], dependencies=[Depends(require_role("admin", "stock"))])


@router.post("/orders", response_model=PurchaseOrderOut, status_code=201, dependencies=[Depends(require_permission("purchases.create"))])
async def create_order(
    data: PurchaseOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = PurchasingService(db, current_user)
    return await service.create_order(data)


@router.get("/orders", response_model=list[PurchaseOrderOut], dependencies=[Depends(require_permission("purchases.create"))])
async def list_orders(status: str | None = None, db: AsyncSession = Depends(get_db)):
    stmt = select(PurchaseOrder)
    if status:
        stmt = stmt.where(PurchaseOrder.status == status)
    result = await db.execute(stmt.order_by(PurchaseOrder.id.desc()))
    return result.scalars().all()


@router.get("/orders/{order_id}/items", response_model=list[PurchaseOrderItemOut], dependencies=[Depends(require_permission("purchases.create"))])
async def list_order_items(order_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PurchaseOrderItem).where(PurchaseOrderItem.purchase_order_id == order_id))
    return result.scalars().all()


@router.post("/orders/{order_id}/receive", dependencies=[Depends(require_permission("purchases.create"))])
async def receive_order(
    order_id: int,
    data: ReceiveOrder,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = PurchasingService(db, current_user)
    return await service.receive_order(order_id, data)


@router.post("/payments", dependencies=[Depends(require_permission("purchases.create"))])
async def supplier_payment(
    data: SupplierPaymentCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = PurchasingService(db, current_user)
    return await service.supplier_payment(data)
