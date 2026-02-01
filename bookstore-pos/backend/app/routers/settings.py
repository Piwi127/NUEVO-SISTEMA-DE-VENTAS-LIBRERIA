from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_role
from app.models.settings import SystemSettings
from app.schemas.settings import SystemSettingsOut, SystemSettingsUpdate

router = APIRouter(prefix="/settings", tags=["settings"], dependencies=[Depends(require_role("admin"))])


@router.get("", response_model=SystemSettingsOut)
async def get_settings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SystemSettings).limit(1))
    settings = result.scalar_one_or_none()
    if not settings:
        raise HTTPException(status_code=404, detail="Settings no encontrados")
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
    )


@router.put("", response_model=SystemSettingsOut)
async def update_settings(data: SystemSettingsUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SystemSettings).limit(1))
    settings = result.scalar_one_or_none()
    if not settings:
        settings = SystemSettings()
        db.add(settings)
        await db.flush()
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
    await db.commit()
    await db.refresh(settings)
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
    )
