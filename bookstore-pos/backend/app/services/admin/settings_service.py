from contextlib import asynccontextmanager

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import log_event
from app.models.settings import SystemSettings
from app.schemas.settings import SystemSettingsOut


class SettingsService:
    def __init__(self, db: AsyncSession, current_user=None):
        self.db = db
        self.user = current_user

    @asynccontextmanager
    async def _transaction(self):
        if self.db.in_transaction():
            yield
        else:
            async with self.db.begin():
                yield

    async def get_settings(self):
        result = await self.db.execute(select(SystemSettings).limit(1))
        settings = result.scalar_one_or_none()
        if not settings:
            raise HTTPException(status_code=404, detail="Settings no encontrados")
        return settings

    async def get_settings_out(self):
        settings = await self.get_settings()
        return self._to_out(settings)

    async def update_settings(self, data):
        async with self._transaction():
            result = await self.db.execute(select(SystemSettings).limit(1))
            settings = result.scalar_one_or_none()
            if not settings:
                settings = SystemSettings()
                self.db.add(settings)
                await self.db.flush()
            settings.project_name = data.project_name
            settings.currency = data.currency
            settings.tax_rate = data.tax_rate
            settings.tax_included = data.tax_included
            settings.store_address = data.store_address
            settings.store_phone = data.store_phone
            settings.store_tax_id = data.store_tax_id
            settings.logo_url = data.logo_url
            settings.payment_methods = data.payment_methods
            settings.invoice_prefix = data.invoice_prefix
            settings.invoice_next = data.invoice_next
            settings.receipt_header = data.receipt_header
            settings.receipt_footer = data.receipt_footer
            settings.paper_width_mm = data.paper_width_mm
            settings.default_warehouse_id = data.default_warehouse_id
            await self.db.flush()
            if self.user is not None:
                await log_event(self.db, self.user.id, "settings_update", "settings", str(settings.id), "")
            await self.db.refresh(settings)
            return self._to_out(settings)

    def _to_out(self, settings: SystemSettings) -> SystemSettingsOut:
        return SystemSettingsOut(
            project_name=settings.project_name,
            currency=settings.currency,
            tax_rate=settings.tax_rate,
            tax_included=settings.tax_included,
            store_address=settings.store_address,
            store_phone=settings.store_phone,
            store_tax_id=settings.store_tax_id,
            logo_url=settings.logo_url,
            payment_methods=settings.payment_methods,
            invoice_prefix=settings.invoice_prefix,
            invoice_next=settings.invoice_next,
            receipt_header=settings.receipt_header,
            receipt_footer=settings.receipt_footer,
            paper_width_mm=settings.paper_width_mm,
            default_warehouse_id=settings.default_warehouse_id,
        )
