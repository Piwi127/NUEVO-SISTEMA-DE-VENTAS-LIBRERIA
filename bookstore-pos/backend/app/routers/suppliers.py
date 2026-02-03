from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_permission, require_role
from app.schemas.supplier import SupplierCreate, SupplierOut, SupplierUpdate
from app.services.suppliers_service import SuppliersService

router = APIRouter(prefix="/suppliers", tags=["suppliers"], dependencies=[Depends(require_role("admin", "stock"))])


@router.get("", response_model=list[SupplierOut], dependencies=[Depends(require_permission("suppliers.write"))])
async def list_suppliers(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Supplier).order_by(Supplier.id))
    return result.scalars().all()


@router.post("", response_model=SupplierOut, status_code=201, dependencies=[Depends(require_permission("suppliers.write"))])
async def create_supplier(data: SupplierCreate, db: AsyncSession = Depends(get_db)):
    service = SuppliersService(db)
    return await service.create_supplier(data)


@router.put("/{supplier_id}", response_model=SupplierOut, dependencies=[Depends(require_permission("suppliers.write"))])
async def update_supplier(supplier_id: int, data: SupplierUpdate, db: AsyncSession = Depends(get_db)):
    service = SuppliersService(db)
    return await service.update_supplier(supplier_id, data)


@router.delete("/{supplier_id}", dependencies=[Depends(require_permission("suppliers.write"))])
async def delete_supplier(supplier_id: int, db: AsyncSession = Depends(get_db)):
    service = SuppliersService(db)
    return await service.delete_supplier(supplier_id)
