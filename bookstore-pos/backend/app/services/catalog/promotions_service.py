from contextlib import asynccontextmanager

from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product
from app.models.promotion import Promotion
from app.models.promotion_rule import PromotionRule

from app.services._transaction import service_transaction

class PromotionsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    @asynccontextmanager
    async def _transaction(self):
        async with service_transaction(self.db):
            yield

    async def list_promotions(self):
        result = await self.db.execute(select(Promotion).order_by(Promotion.id.desc()))
        return result.scalars().all()

    async def list_active(self):
        result = await self.db.execute(select(Promotion).where(Promotion.is_active == True))  # noqa: E712
        return result.scalars().all()

    async def create_promotion(self, data):
        async with self._transaction():
            p = Promotion(**data.model_dump())
            self.db.add(p)
            await self.db.flush()
            await self.db.refresh(p)
            return p

    async def list_pack_rules(self):
        result = await self.db.execute(select(PromotionRule).order_by(PromotionRule.id.desc()))
        return result.scalars().all()

    async def list_active_pack_rules(self, product_ids: list[int] | None = None):
        stmt = select(PromotionRule).where(PromotionRule.is_active == True)  # noqa: E712
        if product_ids:
            stmt = stmt.where(PromotionRule.product_id.in_(product_ids))
        result = await self.db.execute(stmt.order_by(PromotionRule.id.desc()))
        return result.scalars().all()

    async def create_pack_rule(self, data):
        product = await self.db.execute(select(Product).where(Product.id == data.product_id))
        if not product.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Producto no encontrado")

        payload = data.model_dump()
        payload["rule_type"] = "BUNDLE_PRICE"

        async with self._transaction():
            if payload.get("is_active"):
                await self.db.execute(
                    update(PromotionRule)
                    .where(PromotionRule.product_id == payload["product_id"])
                    .values(is_active=False)
                )
            rule = PromotionRule(**payload)
            self.db.add(rule)
            await self.db.flush()
            await self.db.refresh(rule)
            return rule

    async def update_pack_rule(self, rule_id: int, data):
        result = await self.db.execute(select(PromotionRule).where(PromotionRule.id == rule_id))
        rule = result.scalar_one_or_none()
        if not rule:
            raise HTTPException(status_code=404, detail="Regla de promocion no encontrada")

        payload = data.model_dump(exclude_unset=True)
        if "product_id" in payload:
            product = await self.db.execute(select(Product).where(Product.id == payload["product_id"]))
            if not product.scalar_one_or_none():
                raise HTTPException(status_code=404, detail="Producto no encontrado")

        if "rule_type" in payload and payload["rule_type"] != "BUNDLE_PRICE":
            raise HTTPException(status_code=400, detail="Tipo de regla invalido")

        async with self._transaction():
            for key, value in payload.items():
                setattr(rule, key, value)
            rule.rule_type = "BUNDLE_PRICE"
            if rule.is_active:
                await self.db.execute(
                    update(PromotionRule)
                    .where(PromotionRule.product_id == rule.product_id, PromotionRule.id != rule.id)
                    .values(is_active=False)
                )
            await self.db.flush()
            await self.db.refresh(rule)
            return rule
