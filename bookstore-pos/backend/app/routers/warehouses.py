from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user, require_permission, require_role
from app.schemas.warehouse import WarehouseCreate, WarehouseOut, WarehouseUpdate, TransferCreate, TransferOut, BatchCreate, InventoryCountCreate
from app.services.warehouses_service import WarehousesService

router = APIRouter(prefix="/warehouses", tags=["warehouses"], dependencies=[Depends(require_role("admin", "stock"))])


@router.get("", response_model=list[WarehouseOut], dependencies=[Depends(require_permission("inventory.read"))])
async def list_warehouses(db: AsyncSession = Depends(get_db)):
    service = WarehousesService(db, None)
    return await service.list_warehouses()


@router.post("", response_model=WarehouseOut, status_code=201, dependencies=[Depends(require_permission("inventory.write"))])
async def create_warehouse(
    data: WarehouseCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = WarehousesService(db, current_user)
    return await service.create_warehouse(data)


@router.put("/{warehouse_id}", response_model=WarehouseOut, dependencies=[Depends(require_permission("inventory.write"))])
async def update_warehouse(
    warehouse_id: int,
    data: WarehouseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = WarehousesService(db, current_user)
    return await service.update_warehouse(warehouse_id, data)


@router.post("/transfer", response_model=TransferOut, status_code=201, dependencies=[Depends(require_permission("inventory.write"))])
async def create_transfer(
    data: TransferCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = WarehousesService(db, current_user)
    return await service.create_transfer(data)


@router.post("/batch", status_code=201, dependencies=[Depends(require_permission("inventory.write"))])
async def create_batch(
    data: BatchCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = WarehousesService(db, current_user)
    return await service.create_batch(data)


@router.post("/count", status_code=201, dependencies=[Depends(require_permission("inventory.write"))])
async def create_count(
    data: InventoryCountCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = WarehousesService(db, current_user)
    return await service.create_count(data)
