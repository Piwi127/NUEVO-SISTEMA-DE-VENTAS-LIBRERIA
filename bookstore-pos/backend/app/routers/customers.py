from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_permission, require_role
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerOut, CustomerUpdate
from app.services.customers_service import CustomersService

router = APIRouter(prefix="/customers", tags=["customers"], dependencies=[Depends(require_role("admin", "cashier"))])


@router.get("", response_model=list[CustomerOut], dependencies=[Depends(require_permission("customers.read"))])
async def list_customers(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Customer).order_by(Customer.id))
    return result.scalars().all()


@router.post("", response_model=CustomerOut, status_code=201, dependencies=[Depends(require_permission("customers.write"))])
async def create_customer(data: CustomerCreate, db: AsyncSession = Depends(get_db)):
    service = CustomersService(db)
    return await service.create_customer(data)


@router.put("/{customer_id}", response_model=CustomerOut, dependencies=[Depends(require_permission("customers.write"))])
async def update_customer(customer_id: int, data: CustomerUpdate, db: AsyncSession = Depends(get_db)):
    service = CustomersService(db)
    return await service.update_customer(customer_id, data)


@router.delete("/{customer_id}", dependencies=[Depends(require_permission("customers.write"))])
async def delete_customer(customer_id: int, db: AsyncSession = Depends(get_db)):
    service = CustomersService(db)
    return await service.delete_customer(customer_id)
