from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException
from sqlalchemy import or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product
from app.models.promotion import Promotion
from app.models.promotion_rule import PromotionRule
from app.services._transaction import service_transaction

SUPPORTED_RULE_TYPES = {"BUNDLE_PRICE", "UNIT_PRICE_BY_QTY"}


class PromotionsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    @asynccontextmanager
    async def _transaction(self):
        async with service_transaction(self.db):
            yield

    async def _ensure_product_exists(self, product_id: int):
        product = await self.db.execute(select(Product).where(Product.id == product_id))
        if not product.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Producto no encontrado")

    @staticmethod
    def _sanitize_rule_payload(payload: dict[str, Any]) -> dict[str, Any]:
        payload.setdefault("priority", 0)
        rule_type = payload.get("rule_type", "BUNDLE_PRICE")
        if rule_type == "BUNDLE_PRICE":
            payload["min_qty"] = None
            payload["unit_price"] = None
        elif rule_type == "UNIT_PRICE_BY_QTY":
            payload["bundle_qty"] = None
            payload["bundle_price"] = None
        return payload

    @staticmethod
    def _validate_rule_payload(payload: dict[str, Any]):
        rule_type = payload.get("rule_type")
        if rule_type not in SUPPORTED_RULE_TYPES:
            raise HTTPException(status_code=400, detail="Tipo de regla invalido")

        if rule_type == "BUNDLE_PRICE":
            if payload.get("bundle_qty") is None or payload.get("bundle_price") is None:
                raise HTTPException(status_code=400, detail="bundle_qty y bundle_price son obligatorios")
        elif rule_type == "UNIT_PRICE_BY_QTY":
            if payload.get("min_qty") is None or payload.get("unit_price") is None:
                raise HTTPException(status_code=400, detail="min_qty y unit_price son obligatorios")

    async def _deactivate_conflicting_rules(
        self,
        payload: dict[str, Any],
        *,
        exclude_rule_id: int | None = None,
    ):
        if not payload.get("is_active", True):
            return

        stmt = update(PromotionRule).where(
            PromotionRule.product_id == payload["product_id"],
            PromotionRule.rule_type == payload["rule_type"],
            PromotionRule.is_active == True,  # noqa: E712
        )
        if exclude_rule_id is not None:
            stmt = stmt.where(PromotionRule.id != exclude_rule_id)

        if payload["rule_type"] == "BUNDLE_PRICE":
            stmt = stmt.where(PromotionRule.bundle_qty == payload["bundle_qty"])
        elif payload["rule_type"] == "UNIT_PRICE_BY_QTY":
            stmt = stmt.where(PromotionRule.min_qty == payload["min_qty"])

        await self.db.execute(stmt.values(is_active=False))

    async def list_promotions(self):
        result = await self.db.execute(select(Promotion).order_by(Promotion.id.desc()))
        return result.scalars().all()

    async def list_active(self):
        result = await self.db.execute(select(Promotion).where(Promotion.is_active == True))  # noqa: E712
        return result.scalars().all()

    async def create_promotion(self, data):
        async with self._transaction():
            promotion = Promotion(**data.model_dump())
            self.db.add(promotion)
            await self.db.flush()
            await self.db.refresh(promotion)
            return promotion

    async def update_promotion(self, promotion_id: int, data):
        result = await self.db.execute(select(Promotion).where(Promotion.id == promotion_id))
        promotion = result.scalar_one_or_none()
        if not promotion:
            raise HTTPException(status_code=404, detail="Promocion no encontrada")

        payload = data.model_dump(exclude_unset=True)
        async with self._transaction():
            for key, value in payload.items():
                setattr(promotion, key, value)
            await self.db.flush()
            await self.db.refresh(promotion)
            return promotion

    async def delete_promotion(self, promotion_id: int):
        result = await self.db.execute(select(Promotion).where(Promotion.id == promotion_id))
        promotion = result.scalar_one_or_none()
        if not promotion:
            raise HTTPException(status_code=404, detail="Promocion no encontrada")

        try:
            async with self._transaction():
                await self.db.delete(promotion)
        except IntegrityError:
            raise HTTPException(
                status_code=409,
                detail="No se puede eliminar la promocion porque tiene ventas relacionadas",
            ) from None
        return {"ok": True}

    async def list_rules(self, rule_type: str | None = None):
        stmt = select(PromotionRule)
        if rule_type:
            stmt = stmt.where(PromotionRule.rule_type == rule_type)
        result = await self.db.execute(stmt.order_by(PromotionRule.priority.desc(), PromotionRule.id.desc()))
        return result.scalars().all()

    async def list_active_rules(self, product_ids: list[int] | None = None, rule_type: str | None = None):
        now = datetime.now(timezone.utc)
        stmt = select(PromotionRule).where(
            PromotionRule.is_active == True,  # noqa: E712
            or_(PromotionRule.start_date.is_(None), PromotionRule.start_date <= now),
            or_(PromotionRule.end_date.is_(None), PromotionRule.end_date >= now),
        )
        if rule_type:
            stmt = stmt.where(PromotionRule.rule_type == rule_type)
        if product_ids:
            stmt = stmt.where(PromotionRule.product_id.in_(product_ids))
        result = await self.db.execute(stmt.order_by(PromotionRule.priority.desc(), PromotionRule.id.desc()))
        return result.scalars().all()

    async def _create_rule_from_payload(self, payload: dict[str, Any]):
        await self._ensure_product_exists(payload["product_id"])
        payload = self._sanitize_rule_payload(payload)
        self._validate_rule_payload(payload)
        if payload.get("start_date") and payload.get("end_date") and payload["end_date"] < payload["start_date"]:
            raise HTTPException(status_code=400, detail="end_date no puede ser menor que start_date")

        async with self._transaction():
            await self._deactivate_conflicting_rules(payload)
            rule = PromotionRule(**payload)
            self.db.add(rule)
            await self.db.flush()
            await self.db.refresh(rule)
            return rule

    async def create_rule(self, data):
        payload = data.model_dump()
        return await self._create_rule_from_payload(payload)

    async def create_pack_rule(self, data):
        payload = data.model_dump()
        if payload.get("rule_type", "BUNDLE_PRICE") != "BUNDLE_PRICE":
            raise HTTPException(status_code=400, detail="Tipo de regla invalido para pack")
        payload["rule_type"] = "BUNDLE_PRICE"
        return await self._create_rule_from_payload(payload)

    async def _update_rule_with_payload(self, rule_id: int, payload: dict[str, Any]):
        result = await self.db.execute(select(PromotionRule).where(PromotionRule.id == rule_id))
        rule = result.scalar_one_or_none()
        if not rule:
            raise HTTPException(status_code=404, detail="Regla de promocion no encontrada")

        target_product_id = payload.get("product_id", rule.product_id)
        if target_product_id != rule.product_id:
            await self._ensure_product_exists(target_product_id)

        merged_payload: dict[str, Any] = {
            "name": payload.get("name", rule.name),
            "product_id": target_product_id,
            "rule_type": payload.get("rule_type", rule.rule_type),
            "bundle_qty": payload.get("bundle_qty", rule.bundle_qty),
            "bundle_price": payload.get("bundle_price", rule.bundle_price),
            "min_qty": payload.get("min_qty", rule.min_qty),
            "unit_price": payload.get("unit_price", rule.unit_price),
            "priority": payload.get("priority", rule.priority),
            "start_date": payload.get("start_date", rule.start_date),
            "end_date": payload.get("end_date", rule.end_date),
            "is_active": payload.get("is_active", rule.is_active),
        }
        merged_payload = self._sanitize_rule_payload(merged_payload)
        self._validate_rule_payload(merged_payload)
        if merged_payload.get("start_date") and merged_payload.get("end_date") and merged_payload["end_date"] < merged_payload["start_date"]:
            raise HTTPException(status_code=400, detail="end_date no puede ser menor que start_date")

        async with self._transaction():
            for key, value in merged_payload.items():
                setattr(rule, key, value)
            await self._deactivate_conflicting_rules(merged_payload, exclude_rule_id=rule.id)
            await self.db.flush()
            await self.db.refresh(rule)
            return rule

    async def update_rule(self, rule_id: int, data):
        payload = data.model_dump(exclude_unset=True)
        return await self._update_rule_with_payload(rule_id, payload)

    async def delete_rule(self, rule_id: int):
        result = await self.db.execute(select(PromotionRule).where(PromotionRule.id == rule_id))
        rule = result.scalar_one_or_none()
        if not rule:
            raise HTTPException(status_code=404, detail="Regla de promocion no encontrada")

        try:
            async with self._transaction():
                await self.db.delete(rule)
        except IntegrityError:
            raise HTTPException(
                status_code=409,
                detail="No se puede eliminar la regla porque tiene ventas relacionadas",
            ) from None
        return {"ok": True}

    async def update_pack_rule(self, rule_id: int, data):
        payload = data.model_dump(exclude_unset=True)
        if "rule_type" in payload and payload["rule_type"] != "BUNDLE_PRICE":
            raise HTTPException(status_code=400, detail="Tipo de regla invalido para pack")
        payload["rule_type"] = "BUNDLE_PRICE"
        payload.pop("min_qty", None)
        payload.pop("unit_price", None)
        return await self._update_rule_with_payload(rule_id, payload)

    async def list_pack_rules(self):
        return await self.list_rules(rule_type="BUNDLE_PRICE")

    async def list_active_pack_rules(self, product_ids: list[int] | None = None):
        return await self.list_active_rules(product_ids=product_ids, rule_type="BUNDLE_PRICE")
