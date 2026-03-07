from contextlib import asynccontextmanager
import json

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import log_event
from app.core.metrics import sales_amount_total, sales_total
from app.core.stock import apply_stock_delta, get_stock_level, require_default_warehouse_id
from app.models.cash import CashSession
from app.models.customer import Customer
from app.models.inventory import StockMovement
from app.models.price_list import PriceListItem
from app.models.product import Product
from app.models.promotion import Promotion
from app.models.promotion_rule import PromotionRule
from app.models.sale import Sale, SaleItem, Payment
from app.models.settings import SystemSettings
from app.services.pos.pricing import BundleRuleInput, select_best_bundle_rule

from app.services._transaction import service_transaction

class SalesService:
    def __init__(self, db: AsyncSession, current_user):
        self.db = db
        self.user = current_user

    @asynccontextmanager
    async def _transaction(self):
        async with service_transaction(self.db):
            yield

    async def _resolve_price_list_id(self, customer_id: int | None) -> int | None:
        if not customer_id:
            return None
        cust_res = await self.db.execute(select(Customer).where(Customer.id == customer_id))
        customer = cust_res.scalar_one_or_none()
        if not customer:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
        return customer.price_list_id

    async def _resolve_promotion(self, promotion_id: int | None) -> Promotion | None:
        if not promotion_id:
            return None
        promo_res = await self.db.execute(select(Promotion).where(Promotion.id == promotion_id))
        promo = promo_res.scalar_one_or_none()
        if not promo or not promo.is_active:
            raise HTTPException(status_code=404, detail="Promocion no encontrada")
        return promo

    async def _load_bundle_rules(self, product_ids: set[int]) -> dict[int, list[BundleRuleInput]]:
        rules_by_product: dict[int, list[BundleRuleInput]] = {}
        if product_ids:
            rules_res = await self.db.execute(
                select(PromotionRule).where(
                    PromotionRule.is_active == True,  # noqa: E712
                    PromotionRule.rule_type == "BUNDLE_PRICE",
                    PromotionRule.product_id.in_(product_ids),
                )
            )
            for rule in rules_res.scalars().all():
                rules_by_product.setdefault(rule.product_id, []).append(
                    BundleRuleInput(
                        id=rule.id,
                        name=rule.name,
                        bundle_qty=rule.bundle_qty,
                        bundle_price=rule.bundle_price,
                    )
                )
        return rules_by_product

    async def _process_sale_item(self, item, default_warehouse_id: int, price_list_id: int | None, rules_by_product: dict[int, list[BundleRuleInput]]):
        if item.qty <= 0:
            raise HTTPException(status_code=400, detail="Cantidad invalida")
        prod_result = await self.db.execute(select(Product).where(Product.id == item.product_id))
        product = prod_result.scalar_one_or_none()
        if not product:
            raise HTTPException(status_code=404, detail=f"Producto {item.product_id} no encontrado")
        available = await get_stock_level(self.db, product.id, default_warehouse_id)
        if available < item.qty:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Stock insuficiente")
        
        price = float(product.sale_price or product.price or 0)
        unit_cost_snapshot = float(product.unit_cost or product.cost or 0)
        if price_list_id:
            price_res = await self.db.execute(
                select(PriceListItem).where(
                    PriceListItem.price_list_id == price_list_id,
                    PriceListItem.product_id == product.id,
                )
            )
            price_item = price_res.scalar_one_or_none()
            if price_item:
                price = price_item.price
        
        line_total = price * item.qty
        bundle_result = select_best_bundle_rule(item.qty, price, rules_by_product.get(product.id, []))
        item_pack_discount = max(0.0, min(line_total, float(bundle_result.discount)))
        final_line_total = line_total - item_pack_discount

        applied_rule_id = None
        applied_rule_meta = None
        if bundle_result.applied_rule and bundle_result.bundles_applied > 0 and item_pack_discount > 0:
            applied_rule_id = bundle_result.applied_rule.id
            applied_rule_meta = json.dumps(
                {
                    "rule_type": "BUNDLE_PRICE",
                    "rule_name": bundle_result.applied_rule.name,
                    "bundle_qty": bundle_result.applied_rule.bundle_qty,
                    "bundle_price": bundle_result.applied_rule.bundle_price,
                    "bundles_applied": bundle_result.bundles_applied,
                },
                ensure_ascii=False,
            )

        return {
            "product": product,
            "qty": item.qty,
            "unit_price": price,
            "unit_cost_snapshot": unit_cost_snapshot,
            "line_total": line_total,
            "pack_discount": item_pack_discount,
            "final_line_total": final_line_total,
            "applied_rule_id": applied_rule_id,
            "applied_rule_meta": applied_rule_meta,
        }

    async def _calculate_global_promotion_discount(self, base_total: float, promo: Promotion | None, requested_discount: float | None) -> float:
        promotion_discount = max(0.0, float(requested_discount or 0))
        if promo:
            if promo.type.upper() == "PERCENT":
                promotion_discount = base_total * (promo.value / 100.0)
            elif promo.type.upper() == "AMOUNT":
                promotion_discount = promo.value
        if promotion_discount > base_total:
            promotion_discount = base_total
        return promotion_discount

    def _calculate_totals(self, base_total: float, promotion_discount: float, tax_included: bool, tax_rate: float):
        if tax_included:
            if tax_rate > 0:
                tax = base_total - (base_total / (1 + (tax_rate / 100.0)))
            else:
                tax = 0.0
            subtotal = base_total - tax
            total = base_total - promotion_discount
        else:
            subtotal = base_total
            tax = subtotal * (tax_rate / 100.0)
            total = subtotal + tax - promotion_discount
        total = max(0.0, total)
        return subtotal, tax, total

    def _validate_payments(self, payments_data, total: float) -> list[tuple[str, float]]:
        normalized_payments: list[tuple[str, float]] = []
        for p in payments_data:
            method = (p.method or "").strip().upper()
            if not method:
                raise HTTPException(status_code=400, detail="Metodo de pago invalido")
            normalized_payments.append((method, float(p.amount)))

        if any(amount <= 0 for _, amount in normalized_payments):
            raise HTTPException(status_code=400, detail="Monto de pago invalido")
        payment_total = sum(amount for _, amount in normalized_payments)
        if payment_total + 1e-6 < total:
            raise HTTPException(status_code=409, detail="Pago insuficiente")
        has_cash = any(method == "CASH" for method, _ in normalized_payments)
        if not has_cash and abs(payment_total - total) > 0.01:
            raise HTTPException(status_code=409, detail="Pago no coincide con total")
        return normalized_payments

    async def create_sale(self, data):
        if not data.items:
            raise HTTPException(status_code=400, detail="Items vacios")
        if not data.payments:
            raise HTTPException(status_code=400, detail="Pagos vacios")

        async with self._transaction():
            result = await self.db.execute(
                select(CashSession)
                .where(CashSession.user_id == self.user.id, CashSession.is_open == True)  # noqa: E712
                .order_by(CashSession.opened_at.desc(), CashSession.id.desc())
            )
            if not result.scalars().first():
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Caja no abierta")

            settings_result = await self.db.execute(select(SystemSettings).limit(1))
            settings = settings_result.scalar_one_or_none()
            invoice_number = ""
            if settings:
                invoice_number = f"{settings.invoice_prefix}-{settings.invoice_next:06d}"
                settings.invoice_next += 1
                tax_rate = settings.tax_rate
                tax_included = settings.tax_included
            else:
                tax_rate = 0.0
                tax_included = False
            default_warehouse_id = await require_default_warehouse_id(self.db)

            price_list_id = await self._resolve_price_list_id(data.customer_id)
            promo = await self._resolve_promotion(data.promotion_id)

            product_ids = {item.product_id for item in data.items}
            rules_by_product = await self._load_bundle_rules(product_ids)

            items_payload = []
            base_total = 0.0
            pack_discount_total = 0.0

            for item in data.items:
                item_payload = await self._process_sale_item(item, default_warehouse_id, price_list_id, rules_by_product)
                base_total += item_payload["final_line_total"]
                pack_discount_total += item_payload["pack_discount"]
                items_payload.append(item_payload)

            promotion_discount = await self._calculate_global_promotion_discount(base_total, promo, data.discount)
            discount = pack_discount_total + promotion_discount
            subtotal, tax, total = self._calculate_totals(base_total, promotion_discount, tax_included, tax_rate)

            normalized_payments = self._validate_payments(data.payments, total)

            sale = Sale(
                user_id=self.user.id,
                customer_id=data.customer_id,
                promotion_id=data.promotion_id,
                price_list_id=price_list_id,
                subtotal=subtotal,
                tax=tax,
                discount=discount,
                pack_discount=pack_discount_total,
                promotion_discount=promotion_discount,
                total=total,
                status="PAID",
                invoice_number=invoice_number,
                tax_rate=tax_rate,
                tax_included=tax_included,
            )
            self.db.add(sale)
            await self.db.flush()

            for item_payload in items_payload:
                product = item_payload["product"]
                qty = item_payload["qty"]
                try:
                    await apply_stock_delta(self.db, product.id, -qty, default_warehouse_id)
                except ValueError:
                    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Stock insuficiente en almacen")
                sale_item = SaleItem(
                    sale_id=sale.id,
                    product_id=product.id,
                    qty=qty,
                    unit_price=item_payload["unit_price"],
                    unit_cost_snapshot=item_payload["unit_cost_snapshot"],
                    line_total=item_payload["line_total"],
                    discount=item_payload["pack_discount"],
                    final_total=item_payload["final_line_total"],
                    applied_rule_id=item_payload["applied_rule_id"],
                    applied_rule_meta=item_payload["applied_rule_meta"],
                )
                self.db.add(sale_item)
                movement = StockMovement(
                    product_id=product.id,
                    type="OUT",
                    qty=qty,
                    ref=f"SALE:{sale.id}",
                )
                self.db.add(movement)

            for method, amount in normalized_payments:
                payment = Payment(sale_id=sale.id, method=method, amount=amount)
                self.db.add(payment)

            sales_total.inc()
            sales_amount_total.inc(float(total))
            await log_event(self.db, self.user.id, "create", "sale", str(sale.id), invoice_number)
            await self.db.refresh(sale)
            return sale
