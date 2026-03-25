"""Sales service module for processing POS sales transactions."""

from contextlib import asynccontextmanager
from datetime import datetime, timezone
import json
import logging
from decimal import Decimal
from typing import Any, cast

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import log_event
from app.core.config import settings
from app.core.metrics import sales_amount_total, sales_total
from app.core.stock import (
    apply_stock_delta,
    get_stock_level,
    require_default_warehouse_id,
)
from app.models.cash import CashSession
from app.models.customer import Customer
from app.models.inventory import StockMovement
from app.models.price_list import PriceListItem
from app.models.product import Product
from app.models.promotion import Promotion
from app.models.promotion_rule import PromotionRule
from app.models.sale import Sale, SaleItem, Payment
from app.models.settings import SystemSettings
from app.schemas.sale import SaleCreate, SaleItemCreate, PaymentCreate
from app.services.pos.pricing import (
    ProductRuleInput,
    RuleType,
    select_best_product_rule,
)
from app.services.printing_templates import (
    DocumentRenderService,
    DocumentSequenceService,
    DocumentSnapshotService,
    TemplateService,
)

from app.services._transaction import service_transaction


logger = logging.getLogger("bookstore")

PAYMENT_TOLERANCE = Decimal("1e-6")
PAYMENT_EXACT_TOLERANCE = Decimal("0.01")
MIN_PAYMENT_AMOUNT = 0.01


class SalesService:
    """Service for handling POS sales operations."""

    def __init__(self, db: AsyncSession, current_user: Any) -> None:
        """Initialize the sales service.

        Args:
            db: Database session.
            current_user: Authenticated user making the request.
        """
        self.db = db
        self.user = current_user

    @asynccontextmanager
    async def _transaction(self):
        """Context manager for database transactions."""
        async with service_transaction(self.db):
            yield

    async def _resolve_customer(self, customer_id: int | None) -> Customer | None:
        """Resolve a customer by ID.

        Args:
            customer_id: Customer ID to look up.

        Returns:
            Customer object if found, None otherwise.

        Raises:
            HTTPException: If customer not found.
        """
        if not customer_id:
            return None
        cust_res = await self.db.execute(
            select(Customer).where(Customer.id == customer_id)
        )
        customer = cust_res.scalar_one_or_none()
        if not customer:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
        return customer

    @staticmethod
    def _normalize_document_type(raw: str | None) -> str:
        """Normalize document type to standard values.

        Args:
            raw: Raw document type string.

        Returns:
            Normalized document type (TICKET, BOLETA, or FACTURA).

        Raises:
            HTTPException: If document type is invalid.
        """
        value = (raw or "TICKET").strip().upper()
        if value not in {"TICKET", "BOLETA", "FACTURA"}:
            raise HTTPException(status_code=422, detail="Tipo de comprobante invalido")
        return value

    @staticmethod
    def _validate_customer_for_document(
        document_type: str, customer: Customer | None
    ) -> None:
        """Validate customer has required fields for document type.

        Args:
            document_type: Type of document being created.
            customer: Customer to validate.

        Raises:
            HTTPException: If customer doesn't meet document requirements.
        """
        if document_type == "TICKET":
            return
        if customer is None or not (customer.name or "").strip():
            raise HTTPException(
                status_code=400, detail="Boleta/Factura requieren cliente con nombre"
            )
        if document_type == "FACTURA" and not (customer.tax_id or "").strip():
            raise HTTPException(
                status_code=400, detail="Factura requiere cliente con RUC (tax_id)"
            )

    async def _resolve_promotion(self, promotion_id: int | None) -> Promotion | None:
        """Resolve an active promotion by ID.

        Args:
            promotion_id: Promotion ID to look up.

        Returns:
            Active Promotion object if found, None otherwise.

        Raises:
            HTTPException: If promotion not found or inactive.
        """
        if not promotion_id:
            return None
        promo_res = await self.db.execute(
            select(Promotion).where(Promotion.id == promotion_id)
        )
        promo = promo_res.scalar_one_or_none()
        if not promo or not promo.is_active:
            raise HTTPException(status_code=404, detail="Promocion no encontrada")
        return promo

    async def _load_product_rules(
        self, product_ids: set[int]
    ) -> dict[int, list[ProductRuleInput]]:
        """Load active promotion rules for given products.

        Args:
            product_ids: Set of product IDs to load rules for.

        Returns:
            Dictionary mapping product_id to list of ProductRuleInput.
        """
        rules_by_product: dict[int, list[ProductRuleInput]] = {}
        if product_ids:
            now = datetime.now(timezone.utc)
            rules_res = await self.db.execute(
                select(PromotionRule)
                .where(
                    PromotionRule.is_active == True,  # noqa: E712
                    PromotionRule.product_id.in_(product_ids),
                    or_(
                        PromotionRule.start_date.is_(None),
                        PromotionRule.start_date <= now,
                    ),
                    or_(
                        PromotionRule.end_date.is_(None), PromotionRule.end_date >= now
                    ),
                )
                .order_by(PromotionRule.priority.desc(), PromotionRule.id.desc())
            )
            for rule in rules_res.scalars().all():
                if rule.rule_type not in {"BUNDLE_PRICE", "UNIT_PRICE_BY_QTY"}:
                    continue
                rules_by_product.setdefault(rule.product_id, []).append(
                    ProductRuleInput(
                        id=rule.id,
                        name=rule.name,
                        rule_type=cast(RuleType, rule.rule_type),
                        bundle_qty=rule.bundle_qty,
                        bundle_price=rule.bundle_price,
                        min_qty=rule.min_qty,
                        unit_price=rule.unit_price,
                        priority=rule.priority,
                    )
                )
        return rules_by_product

    async def _process_sale_item(
        self,
        item: SaleItemCreate,
        default_warehouse_id: int,
        price_list_id: int | None,
        rules_by_product: dict[int, list[ProductRuleInput]],
    ) -> dict[str, Any]:
        """Process a single sale item with pricing and stock validation.

        Args:
            item: Sale item data.
            default_warehouse_id: Warehouse ID for stock operations.
            price_list_id: Price list ID for customer-specific pricing.
            rules_by_product: Promotion rules loaded for products.

        Returns:
            Dictionary with processed item data including pricing.

        Raises:
            HTTPException: If quantity invalid, product not found, or insufficient stock.
        """
        if item.qty <= 0:
            raise HTTPException(status_code=400, detail="Cantidad invalida")
        prod_result = await self.db.execute(
            select(Product).where(Product.id == item.product_id)
        )
        product = prod_result.scalar_one_or_none()
        if not product:
            raise HTTPException(
                status_code=404, detail=f"Producto {item.product_id} no encontrado"
            )

        available = await get_stock_level(self.db, product.id, default_warehouse_id)
        if available < item.qty:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Stock insuficiente"
            )

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
                price = float(price_item.price)

        line_total = price * item.qty
        rule_result = select_best_product_rule(
            item.qty, price, rules_by_product.get(product.id, [])
        )
        item_pack_discount = max(0.0, min(line_total, float(rule_result.discount)))
        final_line_total = line_total - item_pack_discount

        applied_rule_id: int | None = None
        applied_rule_meta: str | None = None
        if rule_result.applied_rule and item_pack_discount > 0:
            applied_rule = rule_result.applied_rule
            applied_rule_id = applied_rule.id
            rule_meta: dict[str, int | float | str | None] = {
                "rule_type": applied_rule.rule_type,
                "rule_name": applied_rule.name,
            }
            if applied_rule.rule_type == "BUNDLE_PRICE":
                rule_meta.update(
                    {
                        "bundle_qty": applied_rule.bundle_qty,
                        "bundle_price": applied_rule.bundle_price,
                        "bundles_applied": rule_result.bundles_applied,
                    }
                )
            elif applied_rule.rule_type == "UNIT_PRICE_BY_QTY":
                rule_meta.update(
                    {
                        "min_qty": applied_rule.min_qty,
                        "promo_unit_price": applied_rule.unit_price,
                        "regular_unit_price": price,
                        "units_priced": item.qty,
                    }
                )
            applied_rule_meta = json.dumps(rule_meta, ensure_ascii=False)

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

    async def _calculate_global_promotion_discount(
        self,
        base_total: float,
        promo: Promotion | None,
        requested_discount: float | None,
    ) -> float:
        """Calculate discount from promotion.

        Args:
            base_total: Base total before discount.
            promo: Active promotion to apply.
            requested_discount: Manually requested discount amount.

        Returns:
            Calculated promotion discount (capped at base_total).
        """
        promotion_discount = max(0.0, float(requested_discount or 0))
        if promo:
            if promo.type.upper() == "PERCENT":
                promotion_discount = base_total * (promo.value / 100.0)
            elif promo.type.upper() == "AMOUNT":
                promotion_discount = promo.value
        if promotion_discount > base_total:
            promotion_discount = base_total
        return promotion_discount

    def _calculate_totals(
        self,
        base_total: float,
        global_discount: float,
        tax_included: bool,
        tax_rate: float,
    ) -> tuple[float, float, float]:
        """Calculate subtotal, tax, and total amounts.

        Args:
            base_total: Base amount before tax and discounts.
            global_discount: Total discount to apply.
            tax_included: Whether tax is included in base_total.
            tax_rate: Tax rate percentage.

        Returns:
            Tuple of (subtotal, tax, total).
        """
        if tax_included:
            if tax_rate > 0:
                tax = base_total - (base_total / (1 + (tax_rate / 100.0)))
            else:
                tax = 0.0
            subtotal = base_total - tax
            total = base_total - global_discount
        else:
            subtotal = base_total
            tax = subtotal * (tax_rate / 100.0)
            total = subtotal + tax - global_discount
        total = max(0.0, total)
        return subtotal, tax, total

    async def _calculate_loyalty_discount(
        self, customer: Customer | None, redeem_points: int, base_total: float
    ) -> tuple[int, float]:
        """Calculate loyalty points discount.

        Args:
            customer: Customer redeeming points.
            redeem_points: Points to redeem.
            base_total: Available total for discount.

        Returns:
            Tuple of (redeemed_points, discount_amount).

        Raises:
            HTTPException: If points invalid or insufficient.
        """
        if not customer or redeem_points <= 0:
            return 0, 0.0
        safe_points = max(0, int(redeem_points))
        if safe_points < settings.loyalty_min_redeem_points:
            raise HTTPException(
                status_code=400,
                detail=f"Redencion minima: {settings.loyalty_min_redeem_points} puntos",
            )
        if safe_points > int(customer.loyalty_points or 0):
            raise HTTPException(
                status_code=409, detail="Puntos insuficientes para redencion"
            )
        raw_discount = safe_points * float(settings.loyalty_point_value)
        return safe_points, min(max(raw_discount, 0.0), base_total)

    @staticmethod
    def _calculate_loyalty_earned(total: float) -> int:
        """Calculate loyalty points earned from purchase.

        Args:
            total: Purchase total.

        Returns:
            Points earned.
        """
        points = int(max(total, 0.0) * float(settings.loyalty_points_per_currency_unit))
        return max(points, 0)

    def _validate_payments(
        self, payments_data: list[PaymentCreate], total: float
    ) -> list[tuple[str, float]]:
        """Validate payment amounts and methods.

        Args:
            payments_data: List of payments to validate.
            total: Required total payment.

        Returns:
            List of tuples (method, amount).

        Raises:
            HTTPException: If payments are invalid.
        """
        normalized_payments: list[tuple[str, float]] = []
        for p in payments_data:
            method = (p.method or "").strip().upper()
            if not method:
                raise HTTPException(status_code=400, detail="Metodo de pago invalido")
            normalized_payments.append((method, float(p.amount)))

        if any(amount <= 0 for _, amount in normalized_payments):
            raise HTTPException(status_code=400, detail="Monto de pago invalido")

        payment_total = sum(amount for _, amount in normalized_payments)
        if payment_total + float(PAYMENT_TOLERANCE) < total:
            raise HTTPException(status_code=409, detail="Pago insuficiente")

        has_cash = any(method == "CASH" for method, _ in normalized_payments)
        if not has_cash and abs(payment_total - total) > float(PAYMENT_EXACT_TOLERANCE):
            raise HTTPException(status_code=409, detail="Pago no coincide con total")
        return normalized_payments

    async def create_sale(self, data: SaleCreate) -> Sale:
        """Create a new sale transaction.

        Args:
            data: Sale creation data including items, payments, and options.

        Returns:
            Created Sale object.

        Raises:
            HTTPException: If validation fails or business rules not met.
        """
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
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT, detail="Caja no abierta"
                )

            settings_result = await self.db.execute(select(SystemSettings).limit(1))
            system_settings = settings_result.scalar_one_or_none()
            if system_settings:
                tax_rate = system_settings.tax_rate
                tax_included = system_settings.tax_included
            else:
                tax_rate = 0.0
                tax_included = False
            default_warehouse_id = await require_default_warehouse_id(self.db)

            document_type = self._normalize_document_type(data.document_type)
            customer = await self._resolve_customer(data.customer_id)
            self._validate_customer_for_document(document_type, customer)
            price_list_id = customer.price_list_id if customer else None
            promo = await self._resolve_promotion(data.promotion_id)
            sequence_service = DocumentSequenceService(self.db)
            invoice_number = await sequence_service.next_number(document_type)

            product_ids = {item.product_id for item in data.items}
            rules_by_product = await self._load_product_rules(product_ids)

            items_payload: list[dict[str, Any]] = []
            base_total = 0.0
            pack_discount_total = 0.0

            for item in data.items:
                item_payload = await self._process_sale_item(
                    item, default_warehouse_id, price_list_id, rules_by_product
                )
                base_total += item_payload["final_line_total"]
                pack_discount_total += item_payload["pack_discount"]
                items_payload.append(item_payload)

            promotion_discount = await self._calculate_global_promotion_discount(
                base_total, promo, data.discount
            )
            redeem_points, loyalty_discount = await self._calculate_loyalty_discount(
                customer,
                int(data.redeem_points or 0),
                max(base_total - promotion_discount, 0.0),
            )
            global_discount = promotion_discount + loyalty_discount
            discount = pack_discount_total + global_discount
            subtotal, tax, total = self._calculate_totals(
                base_total, global_discount, tax_included, tax_rate
            )
            loyalty_points_earned = (
                self._calculate_loyalty_earned(total) if customer else 0
            )

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
                loyalty_discount=loyalty_discount,
                loyalty_points_earned=loyalty_points_earned,
                loyalty_points_redeemed=redeem_points,
                total=total,
                status="PAID",
                invoice_number=invoice_number,
                document_type=document_type,
                tax_rate=tax_rate,
                tax_included=tax_included,
            )
            self.db.add(sale)
            await self.db.flush()

            if customer:
                current_points = int(customer.loyalty_points or 0)
                customer.loyalty_points = (
                    max(0, current_points - redeem_points) + loyalty_points_earned
                )
                customer.loyalty_total_earned = (
                    int(customer.loyalty_total_earned or 0) + loyalty_points_earned
                )
                customer.loyalty_total_redeemed = (
                    int(customer.loyalty_total_redeemed or 0) + redeem_points
                )

            for item_payload in items_payload:
                product = item_payload["product"]
                qty = item_payload["qty"]
                try:
                    await apply_stock_delta(
                        self.db, product.id, -qty, default_warehouse_id
                    )
                except ValueError as e:
                    logger.error(
                        "Stock delta failed: product_id=%s qty=%s warehouse=%s error=%s",
                        product.id,
                        qty,
                        default_warehouse_id,
                        str(e),
                    )
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"Stock insuficiente en almacen: {str(e)}",
                    )
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

            await self.db.flush()

            await self._create_document_snapshot(sale, document_type, invoice_number)

            sales_total.inc()
            sales_amount_total.inc(float(total))
            await log_event(
                self.db,
                self.user.id,
                "create",
                "sale",
                str(sale.id),
                f"{invoice_number};loyalty_earned={loyalty_points_earned};loyalty_redeemed={redeem_points}",
            )
            await self.db.refresh(sale)
            return sale

    async def _create_document_snapshot(
        self, sale: Sale, document_type: str, invoice_number: str
    ) -> None:
        """Create document snapshot for the sale.

        Args:
            sale: The sale to snapshot.
            document_type: Type of document.
            invoice_number: Invoice/document number.
        """
        try:
            render_service = DocumentRenderService(self.db)
            template_service = TemplateService(self.db)
            snapshot_service = DocumentSnapshotService(self.db)
            context = await render_service.build_sale_context(sale.id)
            (
                template,
                schema_json,
            ) = await template_service.get_active_template_with_schema(
                document_type=document_type
            )
            html, text, warnings = render_service.render(schema_json, context)
            latest_version = (
                await template_service.get_latest_version_model(template.id)
                if template
                else None
            )
            await snapshot_service.upsert_snapshot(
                sale_id=sale.id,
                document_type=document_type,
                document_number=invoice_number,
                template_id=template.id if template else None,
                template_version_id=latest_version.id if latest_version else None,
                render_context=context,
                render_result={"warnings": warnings},
                rendered_html=html,
                rendered_text=text,
            )
        except Exception as exc:
            logger.error(
                "Document snapshot failed: sale_id=%s invoice=%s document_type=%s error=%s",
                sale.id,
                invoice_number,
                document_type,
                str(exc),
                exc_info=True,
            )
