from fastapi import APIRouter, Depends
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user, require_permission, require_role
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductOut, ProductUpdate
from app.services.catalog.products_service import ProductsService

router = APIRouter(prefix="/products", tags=["products"], dependencies=[Depends(require_role("admin", "stock"))])


@router.get("", response_model=list[ProductOut], dependencies=[Depends(require_permission("products.read"))])
async def list_products(
    search: str | None = None,
    limit: int = 200,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Product)
    if search:
        term = f"%{search}%"
        stmt = stmt.where(or_(Product.name.ilike(term), Product.sku.ilike(term)))
    stmt = stmt.order_by(Product.id).limit(min(max(limit, 1), 500)).offset(max(offset, 0))
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=ProductOut, status_code=201, dependencies=[Depends(require_permission("products.write"))])
async def create_product(
    data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = ProductsService(db, current_user)
    return await service.create_product(data)


@router.put("/{product_id}", response_model=ProductOut, dependencies=[Depends(require_permission("products.write"))])
async def update_product(
    product_id: int,
    data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = ProductsService(db, current_user)
    return await service.update_product(product_id, data)


@router.delete("/{product_id}", dependencies=[Depends(require_permission("products.write"))])
async def delete_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = ProductsService(db, current_user)
    return await service.delete_product(product_id)
