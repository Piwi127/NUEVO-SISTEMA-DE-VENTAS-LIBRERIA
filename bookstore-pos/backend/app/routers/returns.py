from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user, require_permission, require_role
from app.schemas.sale_return import SaleReturnCreate, SaleReturnOut
from app.services.returns_service import ReturnsService

router = APIRouter(prefix="/returns", tags=["returns"], dependencies=[Depends(require_role("admin", "cashier"))])


@router.post("/{sale_id}", response_model=SaleReturnOut, status_code=201, dependencies=[Depends(require_permission("sales.create"))])
async def return_sale(
    sale_id: int,
    data: SaleReturnCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = ReturnsService(db, current_user)
    return await service.return_sale(sale_id, data)
