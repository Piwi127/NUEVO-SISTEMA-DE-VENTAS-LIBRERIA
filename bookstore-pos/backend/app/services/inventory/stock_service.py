from contextlib import asynccontextmanager

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import log_event
from app.core.stock import apply_stock_delta, require_default_warehouse_id
from app.models.inventory import StockMovement
from app.models.product import Product
from app.services._transaction import service_transaction


class StockService:
    def __init__(self, db: AsyncSession, current_user):
        self.db = db
        self.user = current_user

    @asynccontextmanager
    async def _transaction(self):
        async with service_transaction(self.db):
            yield

    def _parse_float(self, row_number: int, row: dict, field: str, *, min_value: float = 0.0) -> float:
        raw = row.get(field)
        try:
            value = float(raw)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"Fila {row_number}: '{field}' invalido") from exc
        if value < min_value:
            raise ValueError(f"Fila {row_number}: '{field}' debe ser mayor o igual a {min_value}")
        return value

    def _parse_int(self, row_number: int, row: dict, field: str, *, min_value: int = 0) -> int:
        number = self._parse_float(row_number, row, field, min_value=float(min_value))
        if not number.is_integer():
            raise ValueError(f"Fila {row_number}: '{field}' debe ser entero")
        return int(number)

    def parse_import_row(self, row_number: int, row: dict) -> dict[str, str | int | float] | None:
        if all(str(value or "").strip() == "" for value in row.values()):
            return None
        sku = str(row.get("sku") or "").strip()
        name = str(row.get("name") or "").strip()
        if not sku:
            raise ValueError(f"Fila {row_number}: 'sku' es obligatorio")
        if not name:
            raise ValueError(f"Fila {row_number}: 'name' es obligatorio")
        return {
            "sku": sku,
            "name": name,
            "category": str(row.get("category") or "").strip(),
            "price": self._parse_float(row_number, row, "price"),
            "cost": self._parse_float(row_number, row, "cost"),
            "stock": self._parse_int(row_number, row, "stock"),
            "stock_min": self._parse_int(row_number, row, "stock_min"),
        }

    async def upsert_import_row(self, row: dict[str, str | int | float], *, default_warehouse_id: int, ref: str) -> None:
        sku = str(row["sku"])
        name = str(row["name"])
        category = str(row["category"])
        price = float(row["price"])
        cost = float(row["cost"])
        stock = int(row["stock"])
        stock_min = int(row["stock_min"])

        result = await self.db.execute(select(Product).where(Product.sku == sku))
        product = result.scalar_one_or_none()
        if product:
            diff = stock - int(product.stock or 0)
            product.name = name
            product.category = category
            product.price = price
            product.sale_price = price
            product.cost = cost
            product.unit_cost = cost
            product.cost_qty = 1
            product.cost_total = cost
            product.direct_costs_breakdown = "{}"
            product.direct_costs_total = 0
            product.desired_margin = 0
            product.stock_min = stock_min
            if diff != 0:
                await apply_stock_delta(self.db, product.id, diff, default_warehouse_id)
                self.db.add(
                    StockMovement(
                        product_id=product.id,
                        type="ADJ",
                        qty=diff,
                        ref=ref,
                    )
                )
            return

        product = Product(
            sku=sku,
            name=name,
            category=category,
            price=price,
            sale_price=price,
            cost=cost,
            unit_cost=cost,
            cost_qty=1,
            cost_total=cost,
            direct_costs_breakdown="{}",
            direct_costs_total=0,
            desired_margin=0,
            stock=0,
            stock_min=stock_min,
        )
        self.db.add(product)
        await self.db.flush()
        if stock != 0:
            await apply_stock_delta(self.db, product.id, stock, default_warehouse_id)
            self.db.add(
                StockMovement(
                    product_id=product.id,
                    type="IN",
                    qty=stock,
                    ref=ref,
                )
            )

    async def create_movement(self, data):
        if data.qty == 0:
            raise HTTPException(status_code=400, detail="Cantidad invalida")
        if data.type not in {"IN", "OUT", "ADJ"}:
            raise HTTPException(status_code=400, detail="Tipo invalido")
        if data.type in {"IN", "OUT"} and data.qty < 0:
            raise HTTPException(status_code=400, detail="Cantidad invalida")

        async with self._transaction():
            result = await self.db.execute(select(Product).where(Product.id == data.product_id))
            product = result.scalar_one_or_none()
            if not product:
                raise HTTPException(status_code=404, detail="Producto no encontrado")
            default_warehouse_id = await require_default_warehouse_id(self.db)
            delta = data.qty if data.type in {"IN", "ADJ"} else -data.qty
            try:
                await apply_stock_delta(self.db, data.product_id, delta, default_warehouse_id)
            except ValueError as exc:
                raise HTTPException(status_code=409, detail="Stock insuficiente") from exc
            movement = StockMovement(
                product_id=data.product_id,
                type=data.type,
                qty=data.qty,
                ref=data.ref,
            )
            self.db.add(movement)
            await self.db.flush()
            await log_event(self.db, self.user.id, "inventory_movement", "stock_movement", str(movement.id), data.type)
            await self.db.refresh(movement)
            return movement

    async def bulk_import(self, rows: list[dict]):
        if not rows:
            return {"ok": True, "count": 0}

        parsed_rows: list[dict[str, str | int | float]] = []
        for row_number, row in enumerate(rows, start=2):
            try:
                parsed = self.parse_import_row(row_number, row)
            except ValueError as exc:
                raise HTTPException(status_code=400, detail=str(exc)) from exc
            if parsed is not None:
                parsed_rows.append(parsed)

        if not parsed_rows:
            return {"ok": True, "count": 0}

        default_warehouse_id = await require_default_warehouse_id(self.db)
        async with self._transaction():
            for parsed in parsed_rows:
                try:
                    await self.upsert_import_row(parsed, default_warehouse_id=default_warehouse_id, ref="BULK_IMPORT")
                except ValueError as exc:
                    raise HTTPException(status_code=409, detail=str(exc)) from exc
            await log_event(
                self.db,
                self.user.id,
                "inventory_import",
                "stock_movement",
                "",
                f"rows={len(parsed_rows)}",
            )
            return {"ok": True, "count": len(parsed_rows)}
