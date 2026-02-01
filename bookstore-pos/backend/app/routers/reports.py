from fastapi import APIRouter, Depends
from fastapi.responses import PlainTextResponse
from sqlalchemy import func, select, and_
from sqlalchemy.ext.asyncio import AsyncSession
import csv
from io import StringIO

from app.core.deps import get_db, require_role
from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.schemas.report import DailyReport, TopProductReport, LowStockItem

router = APIRouter(prefix="/reports", tags=["reports"], dependencies=[Depends(require_role("admin"))])


@router.get("/daily", response_model=DailyReport)
async def daily_report(date: str, db: AsyncSession = Depends(get_db)):
    stmt = select(func.count(Sale.id), func.coalesce(func.sum(Sale.total), 0)).where(func.date(Sale.created_at) == date)
    result = await db.execute(stmt)
    count, total = result.one()
    return DailyReport(date=date, sales_count=count, total=float(total or 0))


@router.get("/top-products", response_model=list[TopProductReport])
async def top_products(from_date: str, to: str, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(
            SaleItem.product_id,
            Product.name,
            func.sum(SaleItem.qty).label("qty_sold"),
            func.sum(SaleItem.line_total).label("total_sold"),
        )
        .join(Product, Product.id == SaleItem.product_id)
        .join(Sale, Sale.id == SaleItem.sale_id)
        .where(and_(func.date(Sale.created_at) >= from_date, func.date(Sale.created_at) <= to))
        .group_by(SaleItem.product_id, Product.name)
        .order_by(func.sum(SaleItem.qty).desc())
        .limit(50)
    )
    result = await db.execute(stmt)
    rows = result.all()
    return [
        TopProductReport(
            product_id=row.product_id,
            name=row.name,
            qty_sold=int(row.qty_sold or 0),
            total_sold=float(row.total_sold or 0),
        )
        for row in rows
    ]


@router.get("/low-stock", response_model=list[LowStockItem])
async def low_stock(db: AsyncSession = Depends(get_db)):
    stmt = select(Product).where(Product.stock <= Product.stock_min).order_by(Product.stock.asc())
    result = await db.execute(stmt)
    items = result.scalars().all()
    return [
        LowStockItem(
            product_id=p.id,
            sku=p.sku,
            name=p.name,
            stock=p.stock,
            stock_min=p.stock_min,
        )
        for p in items
    ]


@router.get("/daily/export")
async def export_daily(date: str, db: AsyncSession = Depends(get_db)):
    report = await daily_report(date, db)
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["date", "sales_count", "total"])
    writer.writerow([report.date, report.sales_count, report.total])
    return PlainTextResponse(output.getvalue(), media_type="text/csv")


@router.get("/top-products/export")
async def export_top(from_date: str, to: str, db: AsyncSession = Depends(get_db)):
    rows = await top_products(from_date, to, db)
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["product_id", "name", "qty_sold", "total_sold"])
    for r in rows:
        writer.writerow([r.product_id, r.name, r.qty_sold, r.total_sold])
    return PlainTextResponse(output.getvalue(), media_type="text/csv")


@router.get("/low-stock/export")
async def export_low(db: AsyncSession = Depends(get_db)):
    rows = await low_stock(db)
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["product_id", "sku", "name", "stock", "stock_min"])
    for r in rows:
        writer.writerow([r.product_id, r.sku, r.name, r.stock, r.stock_min])
    return PlainTextResponse(output.getvalue(), media_type="text/csv")
