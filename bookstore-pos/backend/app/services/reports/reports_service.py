import csv
from io import StringIO

from sqlalchemy import func, select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.schemas.report import (
    DailyReport,
    LowStockItem,
    ProfitabilityProductReport,
    ProfitabilitySummaryReport,
    TopProductReport,
)


class ReportsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def _sales_date_filters(from_date: str, to: str):
        return and_(
            func.date(Sale.created_at) >= from_date,
            func.date(Sale.created_at) <= to,
            Sale.status != "VOID",
        )

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
                func.sum(SaleItem.final_total).label("total_sold"),
            )
            .join(Product, Product.id == SaleItem.product_id)
            .join(Sale, Sale.id == SaleItem.sale_id)
            .where(self._sales_date_filters(from_date, to))
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

    async def profitability_summary(self, from_date: str, to: str) -> ProfitabilitySummaryReport:
        unit_cost_expr = func.coalesce(SaleItem.unit_cost_snapshot, Product.unit_cost, Product.cost, 0.0)
        stmt = (
            select(
                func.coalesce(func.sum(SaleItem.final_total), 0).label("sales_total"),
                func.coalesce(func.sum(SaleItem.qty * unit_cost_expr), 0).label("estimated_cost_total"),
            )
            .join(Sale, Sale.id == SaleItem.sale_id)
            .outerjoin(Product, Product.id == SaleItem.product_id)
            .where(self._sales_date_filters(from_date, to))
        )
        result = await self.db.execute(stmt)
        row = result.one()
        sales_total = float(row.sales_total or 0)
        estimated_cost_total = float(row.estimated_cost_total or 0)
        gross_profit = sales_total - estimated_cost_total
        margin_percent = (gross_profit / sales_total * 100.0) if sales_total > 0 else 0.0
        return ProfitabilitySummaryReport(
            from_date=from_date,
            to_date=to,
            sales_total=sales_total,
            estimated_cost_total=estimated_cost_total,
            gross_profit=gross_profit,
            margin_percent=margin_percent,
        )

    async def profitability_by_product(self, from_date: str, to: str, limit: int = 100) -> list[ProfitabilityProductReport]:
        safe_limit = min(max(limit, 1), 500)
        unit_cost_expr = func.coalesce(SaleItem.unit_cost_snapshot, Product.unit_cost, Product.cost, 0.0)
        sales_total_expr = func.coalesce(func.sum(SaleItem.final_total), 0)
        estimated_cost_expr = func.coalesce(func.sum(SaleItem.qty * unit_cost_expr), 0)
        stmt = (
            select(
                SaleItem.product_id,
                Product.name,
                func.sum(SaleItem.qty).label("qty_sold"),
                sales_total_expr.label("sales_total"),
                estimated_cost_expr.label("estimated_cost_total"),
            )
            .join(Sale, Sale.id == SaleItem.sale_id)
            .outerjoin(Product, Product.id == SaleItem.product_id)
            .where(self._sales_date_filters(from_date, to))
            .group_by(SaleItem.product_id, Product.name)
            .order_by((sales_total_expr - estimated_cost_expr).desc())
            .limit(safe_limit)
        )
        result = await self.db.execute(stmt)
        rows = result.all()
        reports: list[ProfitabilityProductReport] = []
        for row in rows:
            sales_total = float(row.sales_total or 0)
            estimated_cost_total = float(row.estimated_cost_total or 0)
            gross_profit = sales_total - estimated_cost_total
            margin_percent = (gross_profit / sales_total * 100.0) if sales_total > 0 else 0.0
            reports.append(
                ProfitabilityProductReport(
                    product_id=row.product_id,
                    name=row.name or f"Producto {row.product_id}",
                    qty_sold=int(row.qty_sold or 0),
                    sales_total=sales_total,
                    estimated_cost_total=estimated_cost_total,
                    gross_profit=gross_profit,
                    margin_percent=margin_percent,
                )
            )
        return reports

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

    async def export_profitability(self, from_date: str, to: str) -> str:
        summary = await self.profitability_summary(from_date, to)
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["from_date", "to_date", "sales_total", "estimated_cost_total", "gross_profit", "margin_percent"])
        writer.writerow(
            [
                summary.from_date,
                summary.to_date,
                summary.sales_total,
                summary.estimated_cost_total,
                summary.gross_profit,
                summary.margin_percent,
            ]
        )
        return output.getvalue()

    async def export_profitability_by_product(self, from_date: str, to: str, limit: int = 100) -> str:
        rows = await self.profitability_by_product(from_date, to, limit)
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(
            [
                "product_id",
                "name",
                "qty_sold",
                "sales_total",
                "estimated_cost_total",
                "gross_profit",
                "margin_percent",
            ]
        )
        for row in rows:
            writer.writerow(
                [
                    row.product_id,
                    row.name,
                    row.qty_sold,
                    row.sales_total,
                    row.estimated_cost_total,
                    row.gross_profit,
                    row.margin_percent,
                ]
            )
        return output.getvalue()
