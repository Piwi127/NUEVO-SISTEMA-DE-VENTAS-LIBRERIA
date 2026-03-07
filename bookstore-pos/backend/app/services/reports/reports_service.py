import csv
import math
from datetime import date as date_type
from io import StringIO

from fastapi import HTTPException
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.schemas.report import (
    DailyReport,
    LowStockItem,
    ProfitabilityProductReport,
    ProfitabilitySummaryReport,
    ReplenishmentSuggestionReport,
    StockRotationReport,
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

    @staticmethod
    def _period_days(from_date: str, to: str) -> int:
        try:
            start = date_type.fromisoformat(from_date)
            end = date_type.fromisoformat(to)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Rango de fechas invalido") from exc
        if end < start:
            raise HTTPException(status_code=400, detail="'to' no puede ser menor que 'from_date'")
        return (end - start).days + 1

    @staticmethod
    def _safe_limit(limit: int, default: int = 100) -> int:
        if limit is None:
            return default
        return min(max(limit, 1), 500)

    @staticmethod
    def _safe_target_days(target_days: int, default: int = 21) -> int:
        if target_days is None:
            return default
        return min(max(target_days, 1), 90)

    @staticmethod
    def _coverage_days(stock: int, avg_daily_sales: float) -> float | None:
        if avg_daily_sales <= 0:
            return None
        return stock / avg_daily_sales

    @staticmethod
    def _rotation_status(stock: int, stock_min: int, coverage_days: float | None, qty_sold: int) -> str:
        if qty_sold <= 0:
            return "warning" if stock_min > 0 and stock <= stock_min else "stagnant"
        if stock <= 0 or (coverage_days is not None and coverage_days <= 3):
            return "critical"
        if stock <= stock_min or (coverage_days is not None and coverage_days <= 7):
            return "warning"
        return "stable"

    @staticmethod
    def _replenishment_urgency(stock: int, stock_min: int, coverage_days: float | None) -> str:
        if stock <= 0 or (coverage_days is not None and coverage_days <= 3):
            return "urgent"
        if stock < stock_min or (coverage_days is not None and coverage_days <= 7):
            return "high"
        return "medium"

    async def _sales_aggregate_map(self, from_date: str, to: str) -> dict[int, dict[str, float]]:
        stmt = (
            select(
                SaleItem.product_id,
                func.coalesce(func.sum(SaleItem.qty), 0).label("qty_sold"),
                func.coalesce(func.sum(SaleItem.final_total), 0).label("sales_total"),
            )
            .join(Sale, Sale.id == SaleItem.sale_id)
            .where(self._sales_date_filters(from_date, to))
            .group_by(SaleItem.product_id)
        )
        result = await self.db.execute(stmt)
        return {
            int(row.product_id): {
                "qty_sold": int(row.qty_sold or 0),
                "sales_total": float(row.sales_total or 0),
            }
            for row in result.all()
        }

    async def _report_products(self) -> list[Product]:
        result = await self.db.execute(select(Product).order_by(Product.name.asc(), Product.id.asc()))
        return list(result.scalars().all())

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
        safe_limit = self._safe_limit(limit)
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

    async def stock_rotation(self, from_date: str, to: str, limit: int = 100) -> list[StockRotationReport]:
        safe_limit = self._safe_limit(limit)
        period_days = self._period_days(from_date, to)
        sales_map = await self._sales_aggregate_map(from_date, to)
        products = await self._report_products()

        rows: list[StockRotationReport] = []
        for product in products:
            stock = int(product.stock or 0)
            stock_min = int(product.stock_min or 0)
            sales = sales_map.get(product.id, {"qty_sold": 0, "sales_total": 0.0})
            qty_sold = int(sales["qty_sold"])
            sales_total = float(sales["sales_total"])
            if qty_sold <= 0 and stock <= 0 and stock_min <= 0:
                continue

            avg_daily_sales = qty_sold / period_days if period_days > 0 else 0.0
            coverage_days = self._coverage_days(stock, avg_daily_sales)
            rows.append(
                StockRotationReport(
                    product_id=product.id,
                    sku=product.sku,
                    name=product.name,
                    author=product.author or "",
                    publisher=product.publisher or "",
                    isbn=product.isbn or "",
                    stock=stock,
                    stock_min=stock_min,
                    qty_sold=qty_sold,
                    sales_total=sales_total,
                    avg_daily_sales=avg_daily_sales,
                    stock_coverage_days=coverage_days,
                    stock_status=self._rotation_status(stock, stock_min, coverage_days, qty_sold),
                )
            )

        rows.sort(
            key=lambda row: (
                -row.qty_sold,
                row.stock_coverage_days if row.stock_coverage_days is not None else float("inf"),
                row.name.lower(),
            )
        )
        return rows[:safe_limit]

    async def replenishment_suggestions(
        self,
        from_date: str,
        to: str,
        target_days: int = 21,
        limit: int = 100,
    ) -> list[ReplenishmentSuggestionReport]:
        safe_limit = self._safe_limit(limit)
        safe_target_days = self._safe_target_days(target_days)
        period_days = self._period_days(from_date, to)
        sales_map = await self._sales_aggregate_map(from_date, to)
        products = await self._report_products()

        rows: list[ReplenishmentSuggestionReport] = []
        urgency_rank = {"urgent": 0, "high": 1, "medium": 2}

        for product in products:
            stock = int(product.stock or 0)
            stock_min = int(product.stock_min or 0)
            sales = sales_map.get(product.id, {"qty_sold": 0, "sales_total": 0.0})
            qty_sold = int(sales["qty_sold"])
            sales_total = float(sales["sales_total"])
            avg_daily_sales = qty_sold / period_days if period_days > 0 else 0.0
            coverage_days = self._coverage_days(stock, avg_daily_sales)
            target_stock = max(stock_min, int(math.ceil(avg_daily_sales * safe_target_days)))
            suggested_qty = max(target_stock - stock, 0)
            if suggested_qty <= 0:
                continue

            rows.append(
                ReplenishmentSuggestionReport(
                    product_id=product.id,
                    sku=product.sku,
                    name=product.name,
                    author=product.author or "",
                    publisher=product.publisher or "",
                    isbn=product.isbn or "",
                    stock=stock,
                    stock_min=stock_min,
                    qty_sold=qty_sold,
                    sales_total=sales_total,
                    avg_daily_sales=avg_daily_sales,
                    stock_coverage_days=coverage_days,
                    target_stock=target_stock,
                    suggested_qty=suggested_qty,
                    urgency=self._replenishment_urgency(stock, stock_min, coverage_days),
                )
            )

        rows.sort(
            key=lambda row: (
                urgency_rank.get(row.urgency, 99),
                -row.suggested_qty,
                -row.qty_sold,
                row.name.lower(),
            )
        )
        return rows[:safe_limit]

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

    async def export_rotation(self, from_date: str, to: str, limit: int = 100) -> str:
        rows = await self.stock_rotation(from_date, to, limit)
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(
            [
                "product_id",
                "sku",
                "name",
                "author",
                "publisher",
                "isbn",
                "stock",
                "stock_min",
                "qty_sold",
                "sales_total",
                "avg_daily_sales",
                "stock_coverage_days",
                "stock_status",
            ]
        )
        for row in rows:
            writer.writerow(
                [
                    row.product_id,
                    row.sku,
                    row.name,
                    row.author,
                    row.publisher,
                    row.isbn,
                    row.stock,
                    row.stock_min,
                    row.qty_sold,
                    row.sales_total,
                    row.avg_daily_sales,
                    row.stock_coverage_days,
                    row.stock_status,
                ]
            )
        return output.getvalue()

    async def export_replenishment(self, from_date: str, to: str, target_days: int = 21, limit: int = 100) -> str:
        rows = await self.replenishment_suggestions(from_date, to, target_days, limit)
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(
            [
                "product_id",
                "sku",
                "name",
                "author",
                "publisher",
                "isbn",
                "stock",
                "stock_min",
                "qty_sold",
                "sales_total",
                "avg_daily_sales",
                "stock_coverage_days",
                "target_stock",
                "suggested_qty",
                "urgency",
            ]
        )
        for row in rows:
            writer.writerow(
                [
                    row.product_id,
                    row.sku,
                    row.name,
                    row.author,
                    row.publisher,
                    row.isbn,
                    row.stock,
                    row.stock_min,
                    row.qty_sold,
                    row.sales_total,
                    row.avg_daily_sales,
                    row.stock_coverage_days,
                    row.target_stock,
                    row.suggested_qty,
                    row.urgency,
                ]
            )
        return output.getvalue()
