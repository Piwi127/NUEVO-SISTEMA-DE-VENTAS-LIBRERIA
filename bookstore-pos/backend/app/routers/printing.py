from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_role
from app.models.sale import Sale, SaleItem
from app.models.settings import SystemSettings

router = APIRouter(prefix="/printing", tags=["printing"], dependencies=[Depends(require_role("admin", "cashier"))])


def _line_width(paper_width_mm: int) -> int:
    return 32 if paper_width_mm <= 58 else 48


def _wrap(text: str, width: int) -> list[str]:
    if not text:
        return [""]
    words = text.split()
    lines: list[str] = []
    current = ""
    for w in words:
        if len(current) + len(w) + 1 <= width:
            current = f"{current} {w}".strip()
        else:
            lines.append(current)
            current = w
    if current:
        lines.append(current)
    return lines


def _build_receipt_lines(sale: Sale, items: list[SaleItem], settings: SystemSettings | None) -> list[str]:
    width = _line_width(settings.paper_width_mm if settings else 80)
    lines: list[str] = []
    header = settings.receipt_header if settings else ""
    footer = settings.receipt_footer if settings else ""

    if header:
        for line in header.splitlines():
            lines.extend(_wrap(line, width))
        lines.append("-" * width)

    store = settings.project_name if settings else ""
    if store:
        lines.extend(_wrap(store, width))
    if settings:
        for line in [settings.store_address, settings.store_phone, settings.store_tax_id]:
            if line:
                lines.extend(_wrap(line, width))

    lines.append("-" * width)
    lines.append(f"Venta: {sale.invoice_number}")
    lines.append(f"Fecha: {sale.created_at.strftime('%Y-%m-%d %H:%M')}")
    lines.append("-" * width)

    for item in items:
        name = f"Producto {item.product_id}"
        lines.extend(_wrap(name, width))
        line_total = f"{item.qty} x {item.unit_price:.2f} = {item.line_total:.2f}"
        lines.append(line_total[:width])

    lines.append("-" * width)
    lines.append(f"Subtotal: {sale.subtotal:.2f}")
    lines.append(f"Impuesto: {sale.tax:.2f}")
    lines.append(f"Descuento: {sale.discount:.2f}")
    lines.append(f"Total: {sale.total:.2f}")
    lines.append("")

    if footer:
        for line in footer.splitlines():
            lines.extend(_wrap(line, width))

    return lines


def _to_escpos(lines: list[str]) -> bytes:
    init = b"\x1b@"
    bold_on = b"\x1bE\x01"
    bold_off = b"\x1bE\x00"
    align_left = b"\x1ba\x00"
    cut = b"\x1dV\x01"
    payload = bytearray()
    payload += init
    payload += align_left
    payload += bold_on
    if lines:
        payload += (lines[0] + "\n").encode("ascii", errors="ignore")
    payload += bold_off
    for line in lines[1:]:
        payload += (line + "\n").encode("ascii", errors="ignore")
    payload += cut
    return bytes(payload)


@router.get("/receipt-text/{sale_id}")
async def receipt_text(sale_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Sale).where(Sale.id == sale_id))
    sale = res.scalar_one_or_none()
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    items_res = await db.execute(select(SaleItem).where(SaleItem.sale_id == sale_id))
    items = items_res.scalars().all()

    settings_res = await db.execute(select(SystemSettings).limit(1))
    settings = settings_res.scalar_one_or_none()

    lines = _build_receipt_lines(sale, items, settings)
    text = "\n".join(lines)
    return Response(content=text, media_type="text/plain")


@router.get("/escpos/{sale_id}")
async def receipt_escpos(sale_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Sale).where(Sale.id == sale_id))
    sale = res.scalar_one_or_none()
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    items_res = await db.execute(select(SaleItem).where(SaleItem.sale_id == sale_id))
    items = items_res.scalars().all()

    settings_res = await db.execute(select(SystemSettings).limit(1))
    settings = settings_res.scalar_one_or_none()

    lines = _build_receipt_lines(sale, items, settings)
    data = _to_escpos(lines)
    headers = {"Content-Disposition": f'attachment; filename="ticket_{sale_id}.bin"'}
    return Response(content=data, media_type="application/octet-stream", headers=headers)
