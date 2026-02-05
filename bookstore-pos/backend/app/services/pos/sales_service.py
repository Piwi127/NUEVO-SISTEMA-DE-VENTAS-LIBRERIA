from contextlib import asynccontextmanager

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import log_event
from app.core.stock import apply_stock_delta, get_stock_level, require_default_warehouse_id
from app.models.cash import CashSession
from app.models.customer import Customer
from app.models.inventory import StockMovement
from app.models.price_list import PriceListItem
from app.models.product import Product
from app.models.promotion import Promotion
from app.models.sale import Sale, SaleItem, Payment
from app.models.settings import SystemSettings


class SalesService:
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

    async def create_sale(self, data):
        if not data.items:
            raise HTTPException(status_code=400, detail="Items vacios")
        if not data.payments:
            raise HTTPException(status_code=400, detail="Pagos vacios")

        async with self._transaction():
            result = await self.db.execute(
                select(CashSession).where(CashSession.user_id == self.user.id, CashSession.is_open == True)  # noqa: E712
            )
            if not result.scalar_one_or_none():
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

            price_list_id = None
            if data.customer_id:
                cust_res = await self.db.execute(select(Customer).where(Customer.id == data.customer_id))
                customer = cust_res.scalar_one_or_none()
                if not customer:
                    raise HTTPException(status_code=404, detail="Cliente no encontrado")
                price_list_id = customer.price_list_id

            promo = None
            if data.promotion_id:
                promo_res = await self.db.execute(select(Promotion).where(Promotion.id == data.promotion_id))
                promo = promo_res.scalar_one_or_none()
                if not promo or not promo.is_active:
                    raise HTTPException(status_code=404, detail="Promocion no encontrada")

            items_payload: list[tuple[Product, int, float]] = []
            base_total = 0.0

            for item in data.items:
                if item.qty <= 0:
                    raise HTTPException(status_code=400, detail="Cantidad invalida")
                prod_result = await self.db.execute(select(Product).where(Product.id == item.product_id))
                product = prod_result.scalar_one_or_none()
                if not product:
                    raise HTTPException(status_code=404, detail=f"Producto {item.product_id} no encontrado")
                available = await get_stock_level(self.db, product.id, default_warehouse_id)
                if available < item.qty:
                    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Stock insuficiente")
                price = product.price
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
                base_total += price * item.qty
                items_payload.append((product, item.qty, price))

            discount = max(0.0, float(data.discount or 0))
            if promo:
                if promo.type.upper() == "PERCENT":
                    discount = base_total * (promo.value / 100.0)
                elif promo.type.upper() == "AMOUNT":
                    discount = promo.value
            if discount > base_total:
                discount = base_total

            if tax_included:
                if tax_rate > 0:
                    tax = base_total - (base_total / (1 + (tax_rate / 100.0)))
                else:
                    tax = 0.0
                subtotal = base_total - tax
                total = base_total - discount
            else:
                subtotal = base_total
                tax = subtotal * (tax_rate / 100.0)
                total = subtotal + tax - discount
            total = max(0.0, total)

            if any(p.amount <= 0 for p in data.payments):
                raise HTTPException(status_code=400, detail="Monto de pago invalido")
            payment_total = sum(p.amount for p in data.payments)
            if payment_total + 1e-6 < total:
                raise HTTPException(status_code=409, detail="Pago insuficiente")
            has_cash = any(p.method.upper() == "CASH" for p in data.payments)
            if not has_cash and abs(payment_total - total) > 0.01:
                raise HTTPException(status_code=409, detail="Pago no coincide con total")

            sale = Sale(
                user_id=self.user.id,
                customer_id=data.customer_id,
                promotion_id=data.promotion_id,
                price_list_id=price_list_id,
                subtotal=subtotal,
                tax=tax,
                discount=discount,
                total=total,
                status="PAID",
                invoice_number=invoice_number,
                tax_rate=tax_rate,
                tax_included=tax_included,
            )
            self.db.add(sale)
            await self.db.flush()

            for product, qty, price in items_payload:
                try:
                    await apply_stock_delta(self.db, product.id, -qty, default_warehouse_id)
                except ValueError:
                    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Stock insuficiente en almacen")
                sale_item = SaleItem(
                    sale_id=sale.id,
                    product_id=product.id,
                    qty=qty,
                    unit_price=price,
                    line_total=price * qty,
                )
                self.db.add(sale_item)
                movement = StockMovement(
                    product_id=product.id,
                    type="OUT",
                    qty=qty,
                    ref=f"SALE:{sale.id}",
                )
                self.db.add(movement)

            for p in data.payments:
                payment = Payment(sale_id=sale.id, method=p.method, amount=p.amount)
                self.db.add(payment)

            await log_event(self.db, self.user.id, "create", "sale", str(sale.id), invoice_number)
            await self.db.refresh(sale)
            return sale
