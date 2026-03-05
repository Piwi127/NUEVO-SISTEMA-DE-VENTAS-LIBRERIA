from contextlib import asynccontextmanager
import json
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import log_event
from app.core.metrics import purchases_amount_total, purchases_total
from app.core.stock import apply_stock_delta, require_default_warehouse_id
from app.models.inventory import StockMovement
from app.models.product import Product
from app.models.purchase import Purchase, PurchaseItem
from app.models.supplier import Supplier
from app.models.warehouse import StockBatch
from app.services.inventory.costing import (
    allocate_direct_costs,
    normalize_direct_costs,
    quantize_money,
    to_decimal,
    weighted_unit_cost,
)


class PurchasesService:
    def __init__(self, db: AsyncSession, current_user):
        self.db = db
        self.user = current_user

    @asynccontextmanager
    async def _transaction(self):
        if self.db.in_transaction():
            try:
                yield
                await self.db.commit()
            except Exception:
                await self.db.rollback()
                raise
        else:
            async with self.db.begin():
                yield

    async def create_purchase(self, data):
        supplier_result = await self.db.execute(select(Supplier).where(Supplier.id == data.supplier_id))
        if supplier_result.scalar_one_or_none() is None:
            raise HTTPException(status_code=404, detail=f"Proveedor {data.supplier_id} no encontrado")
        product_ids = sorted({item.product_id for item in data.items})
        products_result = await self.db.execute(select(Product).where(Product.id.in_(product_ids)))
        products = {product.id: product for product in products_result.scalars().all()}
        missing = sorted(set(product_ids) - set(products.keys()))
        if missing:
            missing_list = ", ".join(str(item) for item in missing)
            raise HTTPException(status_code=404, detail=f"Productos no encontrados: {missing_list}")

        try:
            direct_breakdown, direct_costs_total = normalize_direct_costs(data.direct_costs_breakdown)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from None

        line_subtotals = [
            quantize_money(Decimal(item.qty) * to_decimal(item.unit_cost, f"items[{index}].unit_cost"))
            for index, item in enumerate(data.items)
        ]
        subtotal = quantize_money(sum(line_subtotals, Decimal("0")))
        allocations = allocate_direct_costs(line_subtotals, direct_costs_total)
        total = quantize_money(subtotal + direct_costs_total)
        default_warehouse_id = await require_default_warehouse_id(self.db)
        async with self._transaction():
            purchase = Purchase(
                supplier_id=data.supplier_id,
                subtotal=subtotal,
                direct_costs_total=direct_costs_total,
                direct_costs_breakdown=json.dumps({k: float(v) for k, v in direct_breakdown.items()}, ensure_ascii=False),
                total=float(total),
            )
            self.db.add(purchase)
            await self.db.flush()

            for index, item in enumerate(data.items):
                product = products[item.product_id]
                qty = int(item.qty)
                base_unit_cost = quantize_money(to_decimal(item.unit_cost, f"items[{index}].unit_cost"))
                line_subtotal = line_subtotals[index]
                direct_allocated = allocations[index]
                line_total = quantize_money(line_subtotal + direct_allocated)
                effective_unit_cost = quantize_money(line_total / Decimal(qty))

                current_stock = int(product.stock or 0)
                current_unit_cost = to_decimal(product.unit_cost or product.cost or 0, "product.unit_cost")
                new_unit_cost = weighted_unit_cost(current_stock, current_unit_cost, qty, effective_unit_cost)

                await apply_stock_delta(self.db, product.id, item.qty, default_warehouse_id)
                p_item = PurchaseItem(
                    purchase_id=purchase.id,
                    product_id=product.id,
                    qty=qty,
                    base_unit_cost=base_unit_cost,
                    unit_cost=float(effective_unit_cost),
                    direct_cost_allocated=direct_allocated,
                    line_total=float(line_total),
                )
                self.db.add(p_item)
                movement = StockMovement(
                    product_id=product.id,
                    type="IN",
                    qty=qty,
                    ref=f"PURCHASE:{purchase.id}",
                )
                self.db.add(movement)
                self.db.add(
                    StockBatch(
                        product_id=product.id,
                        warehouse_id=default_warehouse_id,
                        lot=f"PUR-{purchase.id}-{product.id}-{index + 1}",
                        qty=qty,
                        unit_cost=effective_unit_cost,
                        direct_cost_allocated=direct_allocated,
                        source_type="PURCHASE",
                        source_ref=str(purchase.id),
                    )
                )

                next_stock = max(current_stock + qty, 1)
                product.unit_cost = new_unit_cost
                product.cost = float(new_unit_cost)
                product.cost_qty = next_stock
                product.cost_total = quantize_money(new_unit_cost * Decimal(next_stock))

            purchases_total.inc()
            purchases_amount_total.inc(float(total))
            details = f"subtotal={float(subtotal):.2f};direct={float(direct_costs_total):.2f};total={float(total):.2f}"
            await log_event(self.db, self.user.id, "purchase_create", "purchase", str(purchase.id), details[:255])
            await self.db.refresh(purchase)
            return purchase
