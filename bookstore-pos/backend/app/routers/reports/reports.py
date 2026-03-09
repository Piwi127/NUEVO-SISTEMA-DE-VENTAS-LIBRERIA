from fastapi import APIRouter, Depends
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_permission, require_role
from app.schemas.report import (
    DailyReport,
    LowStockItem,
    OperationalAlert,
    ProfitabilityProductReport,
    ProfitabilitySummaryReport,
    ReplenishmentSuggestionReport,
    StockRotationReport,
    TopProductReport,
)
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


@router.get(
    "/profitability",
    response_model=ProfitabilitySummaryReport,
    dependencies=[Depends(require_permission("reports.read"))],
)
async def profitability(from_date: str, to: str, db: AsyncSession = Depends(get_db)):
    service = ReportsService(db)
    return await service.profitability_summary(from_date, to)


@router.get(
    "/profitability/products",
    response_model=list[ProfitabilityProductReport],
    dependencies=[Depends(require_permission("reports.read"))],
)
async def profitability_products(from_date: str, to: str, limit: int = 100, db: AsyncSession = Depends(get_db)):
    service = ReportsService(db)
    return await service.profitability_by_product(from_date, to, limit)


@router.get(
    "/rotation",
    response_model=list[StockRotationReport],
    dependencies=[Depends(require_permission("reports.read"))],
)
async def stock_rotation(from_date: str, to: str, limit: int = 100, db: AsyncSession = Depends(get_db)):
    service = ReportsService(db)
    return await service.stock_rotation(from_date, to, limit)


@router.get(
    "/replenishment",
    response_model=list[ReplenishmentSuggestionReport],
    dependencies=[Depends(require_permission("reports.read"))],
)
async def replenishment(from_date: str, to: str, target_days: int = 21, limit: int = 100, db: AsyncSession = Depends(get_db)):
    service = ReportsService(db)
    return await service.replenishment_suggestions(from_date, to, target_days, limit)


@router.get(
    "/alerts",
    response_model=list[OperationalAlert],
    dependencies=[Depends(require_permission("reports.read"))],
)
async def operational_alerts(
    from_date: str,
    to: str,
    expiry_days: int = 14,
    stagnant_days: int = 30,
    limit: int = 200,
    db: AsyncSession = Depends(get_db),
):
    service = ReportsService(db)
    return await service.operational_alerts(
        from_date,
        to,
        expiry_days=expiry_days,
        stagnant_days=stagnant_days,
        limit=limit,
    )


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


@router.get("/profitability/export", dependencies=[Depends(require_permission("reports.read"))])
async def export_profitability(from_date: str, to: str, db: AsyncSession = Depends(get_db)):
    service = ReportsService(db)
    content = await service.export_profitability(from_date, to)
    return PlainTextResponse(content, media_type="text/csv")


@router.get("/profitability/products/export", dependencies=[Depends(require_permission("reports.read"))])
async def export_profitability_products(from_date: str, to: str, limit: int = 100, db: AsyncSession = Depends(get_db)):
    service = ReportsService(db)
    content = await service.export_profitability_by_product(from_date, to, limit)
    return PlainTextResponse(content, media_type="text/csv")


@router.get("/rotation/export", dependencies=[Depends(require_permission("reports.read"))])
async def export_rotation(from_date: str, to: str, limit: int = 100, db: AsyncSession = Depends(get_db)):
    service = ReportsService(db)
    content = await service.export_rotation(from_date, to, limit)
    return PlainTextResponse(content, media_type="text/csv")


@router.get("/replenishment/export", dependencies=[Depends(require_permission("reports.read"))])
async def export_replenishment(from_date: str, to: str, target_days: int = 21, limit: int = 100, db: AsyncSession = Depends(get_db)):
    service = ReportsService(db)
    content = await service.export_replenishment(from_date, to, target_days, limit)
    return PlainTextResponse(content, media_type="text/csv")
