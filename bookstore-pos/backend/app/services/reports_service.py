import csv
from io import StringIO

from sqlalchemy import func, select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.schemas.report import DailyReport, TopProductReport, LowStockItem


class ReportsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def daily_report(self, date: str) -> DailyReport:
        stmt = select(func.count(Sale.id), func.coalesce(func.sum(Sale.total), 0)).where(
            func.date(Sale.created_at) == date,
            Sale.status != "VOID",
        )
        result = await self.db.execute(stmt)
        count, total = result.one()
        return DailyReport(date=date, sales_count=count, total=float(total or 0))

    async def top_products(self, from_date: str, to: str) -> list[TopProductReport]:
        stmt = (
            select(
                SaleItem.product_id,
                Product.name,
                func.sum(SaleItem.qty).label("qty_sold"),
                func.sum(SaleItem.line_total).label("total_sold"),
            )
            .join(Product, Product.id == SaleItem.product_id)
            .join(Sale, Sale.id == SaleItem.sale_id)
            .where(
                and_(
                    func.date(Sale.created_at) >= from_date,
                    func.date(Sale.created_at) <= to,
                    Sale.status != "VOID",
                )
            )
            .group_by(SaleItem.product_id, Product.name)
            .order_by(func.sum(SaleItem.qty).desc())
            .limit(50)
        )
        result = await self.db.execute(stmt)
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

    async def low_stock(self) -> list[LowStockItem]:
        stmt = select(Product).where(Product.stock <= Product.stock_min).order_by(Product.stock.asc())
        result = await self.db.execute(stmt)
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

    async def export_daily(self, date: str) -> str:
        report = await self.daily_report(date)
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["date", "sales_count", "total"])
        writer.writerow([report.date, report.sales_count, report.total])
        return output.getvalue()

    async def export_top(self, from_date: str, to: str) -> str:
        rows = await self.top_products(from_date, to)
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["product_id", "name", "qty_sold", "total_sold"])
        for r in rows:
            writer.writerow([r.product_id, r.name, r.qty_sold, r.total_sold])
        return output.getvalue()

    async def export_low(self) -> str:
        rows = await self.low_stock()
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["product_id", "sku", "name", "stock", "stock_min"])
        for r in rows:
            writer.writerow([r.product_id, r.sku, r.name, r.stock, r.stock_min])
        return output.getvalue()
