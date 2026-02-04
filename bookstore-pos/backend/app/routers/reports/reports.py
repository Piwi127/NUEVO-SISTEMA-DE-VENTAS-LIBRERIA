from fastapi import APIRouter, Depends
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_permission, require_role
from app.schemas.report import DailyReport, TopProductReport, LowStockItem
from app.services.reports.reports_service import ReportsService

router = APIRouter(prefix="/reports", tags=["reports"], dependencies=[Depends(require_role("admin"))])


@router.get("/daily", response_model=DailyReport, dependencies=[Depends(require_permission("reports.read"))])
async def daily_report(date: str, db: AsyncSession = Depends(get_db)):
    service = ReportsService(db)
    return await service.daily_report(date)


@router.get("/top-products", response_model=list[TopProductReport], dependencies=[Depends(require_permission("reports.read"))])
async def top_products(from_date: str, to: str, db: AsyncSession = Depends(get_db)):
    service = ReportsService(db)
    return await service.top_products(from_date, to)


@router.get("/low-stock", response_model=list[LowStockItem], dependencies=[Depends(require_permission("reports.read"))])
async def low_stock(db: AsyncSession = Depends(get_db)):
    service = ReportsService(db)
    return await service.low_stock()


@router.get("/daily/export", dependencies=[Depends(require_permission("reports.read"))])
async def export_daily(date: str, db: AsyncSession = Depends(get_db)):
    service = ReportsService(db)
    content = await service.export_daily(date)
    return PlainTextResponse(content, media_type="text/csv")


@router.get("/top-products/export", dependencies=[Depends(require_permission("reports.read"))])
async def export_top(from_date: str, to: str, db: AsyncSession = Depends(get_db)):
    service = ReportsService(db)
    content = await service.export_top(from_date, to)
    return PlainTextResponse(content, media_type="text/csv")


@router.get("/low-stock/export", dependencies=[Depends(require_permission("reports.read"))])
async def export_low(db: AsyncSession = Depends(get_db)):
    service = ReportsService(db)
    content = await service.export_low()
    return PlainTextResponse(content, media_type="text/csv")
