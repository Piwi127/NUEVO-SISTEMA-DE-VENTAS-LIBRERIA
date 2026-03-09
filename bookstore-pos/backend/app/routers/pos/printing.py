from datetime import datetime
from html import escape
import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_permission, require_role
from app.models.sale import SaleItem
from app.services.pos.printing_service import PrintingService
from app.services.printing_templates import DocumentRenderService, DocumentSnapshotService, TemplateService

router = APIRouter(prefix="/printing", tags=["printing"], dependencies=[Depends(require_role("admin", "cashier"))])
logger = logging.getLogger("bookstore")


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


def _build_receipt_lines(sale, items: list[tuple[SaleItem, str | None]], settings) -> list[str]:
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

    for item, name in items:
        name = name or f"Producto {item.product_id}"
        lines.extend(_wrap(name, width))
        charged_line_total = item.final_total if getattr(item, "final_total", None) is not None else item.line_total
        line_total = f"{item.qty} x {item.unit_price:.2f} = {charged_line_total:.2f}"
        lines.append(line_total[:width])
        if getattr(item, "discount", 0) > 0:
            lines.append(f"  Promo: -{item.discount:.2f}"[:width])

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


def _fmt_money(value: object) -> str:
    try:
        return f"{float(value):.2f}"
    except (TypeError, ValueError):
        return "0.00"


def _fmt_issue_date(value: object) -> str:
    raw = str(value or "").strip()
    if not raw:
        return ""
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        return parsed.strftime("%Y-%m-%d %H:%M")
    except ValueError:
        return raw


def _legal_document_text(context: dict, document_type: str) -> str:
    company_name = str(context.get("company_name") or "Libreria Belen")
    issue_date = _fmt_issue_date(context.get("issue_date"))
    number = str(context.get("document_number") or "")
    customer_name = str(context.get("customer_name") or "PUBLICO GENERAL")
    customer_tax_id = str(context.get("customer_tax_id") or "-")
    customer_address = str(context.get("customer_address") or "-")
    items = list(context.get("items") or [])

    lines = [
        company_name,
        document_type,
        f"Fecha: {issue_date}",
        f"Nro Documento: {number}",
        f"Cliente: {customer_name}",
        f"Nro Cliente: {customer_tax_id}",
        f"Direccion: {customer_address}",
        "",
        "DETALLE",
    ]
    for item in items:
        name = str(item.get("name") or "Producto")
        qty = int(item.get("qty") or 0)
        unit_price = _fmt_money(item.get("unit_price"))
        line_total = _fmt_money(item.get("line_total"))
        lines.append(f"{name} | {qty} x {unit_price} = {line_total}")

    lines.extend(
        [
            "",
            f"Subtotal: {_fmt_money(context.get('subtotal'))}",
            f"Impuesto: {_fmt_money(context.get('tax'))}",
            f"Descuento: {_fmt_money(context.get('discount'))}",
            f"Total: {_fmt_money(context.get('total'))}",
        ]
    )
    return "\n".join(lines)


def _build_legal_document_html(context: dict, document_type: str, tax_rate: float) -> str:
    company_name = escape(str(context.get("company_name") or "Libreria Belen"))
    header = escape(str(context.get("receipt_header") or "Precios bajos siempre"))
    company_address = escape(str(context.get("company_address") or "Jr. Conchucos 120"))
    company_phone = escape(str(context.get("company_phone") or "Telefono: 947 872 207"))
    company_tax_id = escape(str(context.get("company_tax_id") or ""))
    issue_date = escape(_fmt_issue_date(context.get("issue_date")))
    document_number = escape(str(context.get("document_number") or ""))
    customer_code = escape(str(context.get("customer_tax_id") or "-"))
    customer_name = escape(str(context.get("customer_name") or "PUBLICO GENERAL"))
    customer_address = escape(str(context.get("customer_address") or "-"))
    customer_email = escape(str(context.get("customer_email") or "-"))
    comments = escape(str(context.get("receipt_footer") or "Si usted tiene preguntas sobre esta factura, pongase en contacto con"))
    contact_line = escape(str(context.get("company_phone") or "[Nombre, Telefono, E-mail]"))

    items = list(context.get("items") or [])
    item_rows: list[str] = []
    for item in items:
        name = escape(str(item.get("name") or "Producto"))
        qty = int(item.get("qty") or 0)
        unit_price = _fmt_money(item.get("unit_price"))
        line_total = _fmt_money(item.get("line_total"))
        item_rows.append(
            "<tr>"
            f"<td>{name}</td>"
            f"<td class='num'>{qty}</td>"
            f"<td class='num'>{unit_price}</td>"
            f"<td class='num'>{line_total}</td>"
            "</tr>"
        )

    if not item_rows:
        item_rows.append("<tr><td colspan='4' class='empty'>Sin productos</td></tr>")

    subtotal = _fmt_money(context.get("subtotal"))
    tax = _fmt_money(context.get("tax"))
    discount = _fmt_money(context.get("discount"))
    total = _fmt_money(context.get("total"))
    tax_rate_str = _fmt_money(tax_rate)

    return f"""
<div class="doc-shell">
  <style>
    @page {{
      size: A4 portrait;
      margin: 10mm;
    }}
    .doc-shell {{
      font-family: Arial, sans-serif;
      font-size: 12px;
      color: #111;
      background: #fff;
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
      line-height: 1.25;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }}
    .doc-card {{
      border: 1px solid #d6d9df;
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 10px;
    }}
    .doc-head {{
      display: grid;
      grid-template-columns: 1fr 190px;
      gap: 10px;
      align-items: stretch;
    }}
    .store-title {{
      font-size: 28px;
      font-weight: 800;
      margin: 0 0 4px;
      line-height: 1.05;
    }}
    .store-line {{
      margin: 2px 0;
      color: #394150;
    }}
    .doc-type {{
      border: 1.5px solid #1f2937;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 34px;
      font-weight: 800;
      letter-spacing: 1px;
      background: #f8fafc;
      text-transform: uppercase;
    }}
    .meta-grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 10px;
    }}
    .meta-item {{
      border: 1px solid #e3e6ec;
      border-radius: 8px;
      padding: 7px 10px;
      background: #fff;
    }}
    .meta-label {{
      font-size: 11px;
      color: #5b6473;
      margin-bottom: 2px;
      text-transform: uppercase;
      font-weight: 700;
    }}
    .meta-value {{
      font-size: 13px;
      font-weight: 700;
      word-break: break-word;
    }}
    .panel-title {{
      margin: 0 0 7px;
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #111827;
    }}
    .customer-line {{
      margin: 3px 0;
      color: #1f2937;
    }}
    .items-table {{
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      overflow: hidden;
      border: 1px solid #dde2ea;
      border-radius: 8px;
    }}
    .items-table th {{
      background: #f3f4f6;
      color: #111827;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      font-size: 11px;
      padding: 8px 10px;
      border-bottom: 1px solid #dde2ea;
      text-align: left;
    }}
    .items-table td {{
      padding: 8px 10px;
      border-bottom: 1px solid #eceff4;
      font-size: 12px;
      vertical-align: top;
    }}
    .items-table tbody tr:last-child td {{
      border-bottom: none;
    }}
    .items-table .num {{
      text-align: right;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }}
    .items-table .empty {{
      text-align: center;
      color: #6b7280;
      padding: 16px 10px;
      font-style: italic;
    }}
    .totals-grid {{
      display: grid;
      grid-template-columns: 1fr 260px;
      gap: 10px;
      align-items: start;
    }}
    .comments-box {{
      border: 1px solid #e3e6ec;
      border-radius: 8px;
      padding: 10px;
      min-height: 94px;
      background: #fff;
    }}
    .totals-box {{
      border: 1px solid #cfd5df;
      border-radius: 8px;
      overflow: hidden;
      background: #fff;
    }}
    .total-row {{
      display: grid;
      grid-template-columns: 1fr 95px;
      gap: 8px;
      padding: 8px 10px;
      border-bottom: 1px solid #eceff4;
      font-size: 12px;
    }}
    .total-row:last-child {{
      border-bottom: none;
      background: #f3f4f6;
      font-weight: 800;
      font-size: 13px;
    }}
    .total-value {{
      text-align: right;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }}
    .doc-footer {{
      text-align: center;
      color: #374151;
      margin-top: 4px;
    }}
    .doc-footer p {{
      margin: 3px 0;
    }}
    @media (max-width: 780px) {{
      .doc-head {{ grid-template-columns: 1fr; }}
      .doc-type {{ min-height: 76px; font-size: 28px; }}
      .meta-grid {{ grid-template-columns: 1fr; }}
      .totals-grid {{ grid-template-columns: 1fr; }}
    }}
  </style>

  <section class="doc-card">
    <div class="doc-head">
      <div>
        <h1 class="store-title">{company_name}</h1>
        <p class="store-line">{header}</p>
        <p class="store-line">{company_address}</p>
        <p class="store-line">{company_phone}</p>
        <p class="store-line">{company_tax_id}</p>
      </div>
      <div class="doc-type">{escape(document_type)}</div>
    </div>

    <div class="meta-grid">
      <div class="meta-item">
        <div class="meta-label">Fecha</div>
        <div class="meta-value">{issue_date}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Nro de Factura</div>
        <div class="meta-value">{document_number}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Nro de Cliente</div>
        <div class="meta-value">{customer_code}</div>
      </div>
    </div>
  </section>

  <section class="doc-card">
    <h3 class="panel-title">Facturar a</h3>
    <p class="customer-line"><strong>{customer_name}</strong></p>
    <p class="customer-line">{customer_address}</p>
    <p class="customer-line">Correo: {customer_email}</p>
  </section>

  <section class="doc-card">
    <h3 class="panel-title">Detalle</h3>
    <table class="items-table">
      <thead>
        <tr>
          <th>Descripcion</th>
          <th class="num">Cant.</th>
          <th class="num">P. Unit</th>
          <th class="num">Total</th>
        </tr>
      </thead>
      <tbody>
        {''.join(item_rows)}
      </tbody>
    </table>
  </section>

  <section class="doc-card">
    <div class="totals-grid">
      <div class="comments-box">
        <h3 class="panel-title">Comentarios</h3>
        <p>{comments}</p>
      </div>
      <div class="totals-box">
        <div class="total-row"><span>Subtotal</span><span class="total-value">{subtotal}</span></div>
        <div class="total-row"><span>Tasa de impuesto</span><span class="total-value">{tax_rate_str}</span></div>
        <div class="total-row"><span>Impuesto</span><span class="total-value">{tax}</span></div>
        <div class="total-row"><span>Descuento</span><span class="total-value">{discount}</span></div>
        <div class="total-row"><span>Total</span><span class="total-value">{total}</span></div>
      </div>
    </div>
  </section>

  <div class="doc-footer">
    <p>{contact_line}</p>
    <p><strong>Gracias por su compra</strong></p>
  </div>
</div>
""".strip()


def _build_legal_document_pdf(context: dict, document_type: str, tax_rate: float) -> bytes:
    try:
        from io import BytesIO

        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
        from reportlab.pdfgen import canvas
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"No se pudo generar PDF legal: {exc}") from exc

    def _safe_int(value: object, default: int = 0) -> int:
        try:
            return int(value)
        except (TypeError, ValueError):
            return default

    def _draw_text(pdf: canvas.Canvas, x: float, y: float, text: str, *, size: float = 10, bold: bool = False) -> None:
        pdf.setFont("Helvetica-Bold" if bold else "Helvetica", size)
        pdf.drawString(x, y, (text or "")[:220])

    company_name = str(context.get("company_name") or "Libreria Belen")
    header = str(context.get("receipt_header") or "Precios bajos siempre")
    company_address = str(context.get("company_address") or "Jr. Conchucos 120")
    company_phone = str(context.get("company_phone") or "Telefono: 947 872 207")
    company_tax_id = str(context.get("company_tax_id") or "")
    issue_date = _fmt_issue_date(context.get("issue_date"))
    document_number = str(context.get("document_number") or "")
    customer_code = str(context.get("customer_tax_id") or "-")
    customer_name = str(context.get("customer_name") or "PUBLICO GENERAL")
    customer_address = str(context.get("customer_address") or "-")
    customer_email = str(context.get("customer_email") or "-")
    comments = str(context.get("receipt_footer") or "Si usted tiene preguntas sobre esta factura, pongase en contacto con")
    contact_line = str(context.get("company_phone") or "[Nombre, Telefono, E-mail]")

    subtotal = _fmt_money(context.get("subtotal"))
    tax = _fmt_money(context.get("tax"))
    discount = _fmt_money(context.get("discount"))
    total = _fmt_money(context.get("total"))
    tax_rate_str = _fmt_money(tax_rate)

    items = list(context.get("items") or [])

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    page_w, page_h = A4

    margin_x = 11 * mm
    cursor_y = page_h - (11 * mm)
    content_w = page_w - (2 * margin_x)

    border = colors.HexColor("#D6D9DF")
    subtle = colors.HexColor("#ECEFF4")
    ink = colors.HexColor("#111827")
    muted = colors.HexColor("#4B5563")
    shade = colors.HexColor("#F3F4F6")

    def _box(x: float, y_top: float, w: float, h: float, *, fill: bool = False, fill_color=colors.white, stroke=border) -> None:
        pdf.setStrokeColor(stroke)
        pdf.setLineWidth(1)
        if fill:
            pdf.setFillColor(fill_color)
            pdf.rect(x, y_top - h, w, h, stroke=1, fill=1)
            pdf.setFillColor(colors.black)
        else:
            pdf.rect(x, y_top - h, w, h, stroke=1, fill=0)

    # Header card
    header_h = 56 * mm
    _box(margin_x, cursor_y, content_w, header_h, fill=True, fill_color=colors.white)

    type_w = 58 * mm
    type_h = 34 * mm
    type_x = margin_x + content_w - type_w - (5 * mm)
    type_y = cursor_y - (5 * mm)
    _box(type_x, type_y, type_w, type_h, fill=True, fill_color=shade, stroke=ink)
    _draw_text(pdf, type_x + 10 * mm, type_y - 19 * mm, document_type.upper(), size=22, bold=True)

    left_x = margin_x + 5 * mm
    _draw_text(pdf, left_x, cursor_y - 10 * mm, company_name, size=16, bold=True)
    pdf.setFillColor(muted)
    _draw_text(pdf, left_x, cursor_y - 16.5 * mm, header, size=9)
    _draw_text(pdf, left_x, cursor_y - 22 * mm, company_address, size=9)
    _draw_text(pdf, left_x, cursor_y - 27.5 * mm, company_phone, size=9)
    _draw_text(pdf, left_x, cursor_y - 33 * mm, company_tax_id, size=9)
    pdf.setFillColor(ink)

    meta_y = cursor_y - 39 * mm
    meta_h = 11 * mm
    meta_gap = 3 * mm
    meta_w = (content_w - (10 * mm) - (2 * meta_gap)) / 3
    meta_x0 = margin_x + 5 * mm

    meta = [
        ("Fecha", issue_date),
        ("Nro de Factura", document_number),
        ("Nro de Cliente", customer_code),
    ]
    for idx, (label, value) in enumerate(meta):
        x = meta_x0 + idx * (meta_w + meta_gap)
        _box(x, meta_y, meta_w, meta_h, fill=True, fill_color=colors.white)
        pdf.setFillColor(muted)
        _draw_text(pdf, x + 2.2 * mm, meta_y - 3.6 * mm, label.upper(), size=7.2, bold=True)
        pdf.setFillColor(ink)
        _draw_text(pdf, x + 2.2 * mm, meta_y - 8.2 * mm, value, size=8.8, bold=True)

    cursor_y -= header_h + (4 * mm)

    # Customer card
    cust_h = 26 * mm
    _box(margin_x, cursor_y, content_w, cust_h, fill=True, fill_color=colors.white)
    _draw_text(pdf, margin_x + 4 * mm, cursor_y - 5 * mm, "FACTURAR A", size=9, bold=True)
    _draw_text(pdf, margin_x + 4 * mm, cursor_y - 11 * mm, customer_name, size=10, bold=True)
    pdf.setFillColor(muted)
    _draw_text(pdf, margin_x + 4 * mm, cursor_y - 16.5 * mm, customer_address, size=9)
    _draw_text(pdf, margin_x + 4 * mm, cursor_y - 21.5 * mm, f"Correo: {customer_email}", size=9)
    pdf.setFillColor(ink)

    cursor_y -= cust_h + (4 * mm)

    # Items card
    items_h = 88 * mm
    _box(margin_x, cursor_y, content_w, items_h, fill=True, fill_color=colors.white)

    table_x = margin_x + 4 * mm
    table_w = content_w - 8 * mm
    header_row_h = 9 * mm
    row_h = 7.2 * mm
    visible_rows = 9

    _box(table_x, cursor_y - 4 * mm, table_w, header_row_h, fill=True, fill_color=shade, stroke=border)

    col_desc = table_w * 0.56
    col_qty = table_w * 0.14
    col_unit = table_w * 0.15
    x_desc = table_x
    x_qty = x_desc + col_desc
    x_unit = x_qty + col_qty
    x_total = x_unit + col_unit

    pdf.setStrokeColor(border)
    pdf.line(x_qty, cursor_y - 4 * mm, x_qty, cursor_y - 4 * mm - (header_row_h + visible_rows * row_h))
    pdf.line(x_unit, cursor_y - 4 * mm, x_unit, cursor_y - 4 * mm - (header_row_h + visible_rows * row_h))
    pdf.line(x_total, cursor_y - 4 * mm, x_total, cursor_y - 4 * mm - (header_row_h + visible_rows * row_h))

    _draw_text(pdf, x_desc + 2 * mm, cursor_y - 9 * mm, "DESCRIPCION", size=8, bold=True)
    _draw_text(pdf, x_qty + 2 * mm, cursor_y - 9 * mm, "CANT.", size=8, bold=True)
    _draw_text(pdf, x_unit + 2 * mm, cursor_y - 9 * mm, "P. UNIT", size=8, bold=True)
    _draw_text(pdf, x_total + 2 * mm, cursor_y - 9 * mm, "TOTAL", size=8, bold=True)

    y_row_top = cursor_y - 4 * mm - header_row_h
    for idx in range(visible_rows):
        y_line = y_row_top - idx * row_h
        pdf.setStrokeColor(subtle)
        pdf.line(table_x, y_line, table_x + table_w, y_line)

    for idx, item in enumerate(items[:visible_rows]):
        y_text = y_row_top - idx * row_h - 4.8
        name = str(item.get("name") or "")
        qty = _safe_int(item.get("qty"), 0)
        unit_price = _fmt_money(item.get("unit_price"))
        line_total = _fmt_money(item.get("line_total"))
        _draw_text(pdf, x_desc + 2 * mm, y_text, name[:48], size=8.8)
        _draw_text(pdf, x_qty + 2 * mm, y_text, str(qty), size=8.8)
        _draw_text(pdf, x_unit + 2 * mm, y_text, unit_price, size=8.8)
        _draw_text(pdf, x_total + 2 * mm, y_text, line_total, size=8.8)

    cursor_y -= items_h + (4 * mm)

    # Bottom card
    bottom_h = 36 * mm
    _box(margin_x, cursor_y, content_w, bottom_h, fill=True, fill_color=colors.white)

    comments_w = content_w * 0.58
    totals_w = content_w - comments_w - (4 * mm)
    comments_x = margin_x + 4 * mm
    totals_x = comments_x + comments_w + (4 * mm)

    _box(comments_x, cursor_y - 4 * mm, comments_w, bottom_h - 8 * mm, fill=True, fill_color=colors.white)
    _draw_text(pdf, comments_x + 2.2 * mm, cursor_y - 9 * mm, "COMENTARIOS", size=8, bold=True)
    pdf.setFillColor(muted)
    _draw_text(pdf, comments_x + 2.2 * mm, cursor_y - 15 * mm, comments[:80], size=8.5)
    pdf.setFillColor(ink)

    _box(totals_x, cursor_y - 4 * mm, totals_w, bottom_h - 8 * mm, fill=True, fill_color=colors.white)
    totals_rows = [
        ("Subtotal", subtotal),
        ("Tasa de impuesto", tax_rate_str),
        ("Impuesto", tax),
        ("Descuento", discount),
        ("Total", total),
    ]
    trow_h = (bottom_h - 8 * mm) / len(totals_rows)
    for idx, (label, value) in enumerate(totals_rows):
        y_top = cursor_y - 4 * mm - idx * trow_h
        if idx > 0:
            pdf.setStrokeColor(subtle)
            pdf.line(totals_x, y_top, totals_x + totals_w, y_top)
        _draw_text(pdf, totals_x + 2 * mm, y_top - 5.2, label, size=8.8, bold=(label == "Total"))
        value_w = pdf.stringWidth(value, "Helvetica-Bold" if label == "Total" else "Helvetica", 8.8)
        pdf.setFont("Helvetica-Bold" if label == "Total" else "Helvetica", 8.8)
        pdf.drawString(totals_x + totals_w - value_w - 2 * mm, y_top - 5.2, value)

    cursor_y -= bottom_h + (3 * mm)

    pdf.setFillColor(muted)
    _draw_text(pdf, margin_x + 2 * mm, cursor_y - 1.5 * mm, contact_line, size=8.5)
    pdf.setFillColor(ink)
    _draw_text(pdf, margin_x + (content_w / 2) - 23 * mm, cursor_y - 7 * mm, "Gracias por su compra", size=10.2, bold=True)

    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return buffer.getvalue()


async def _render_with_template(db: AsyncSession, sale_id: int) -> tuple[str, str, str, str]:
    render_service = DocumentRenderService(db)
    snapshot_service = DocumentSnapshotService(db)
    context = await render_service.build_sale_context(sale_id)
    document_type = (context.get("document_type") or "TICKET").strip().upper()
    document_number = str(context.get("document_number") or "")

    template_service = TemplateService(db)
    template, schema_json = await template_service.get_active_template_with_schema(document_type=document_type)
    html, text, warnings = render_service.render(schema_json, context)
    version = await template_service.get_latest_version_model(template.id) if template else None
    await snapshot_service.upsert_snapshot(
        sale_id=sale_id,
        document_type=document_type,
        document_number=document_number,
        template_id=template.id if template else None,
        template_version_id=version.id if version else None,
        render_context=context,
        render_result={"warnings": warnings},
        rendered_html=html,
        rendered_text=text,
    )
    return html, text, document_type, document_number


async def _resolve_print_payload(db: AsyncSession, sale_id: int) -> tuple[str, str, str, str]:
    service = PrintingService(db)
    sale, items, settings = await service.build_receipt(sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    document_type = (getattr(sale, "document_type", "TICKET") or "TICKET").strip().upper()
    if document_type in {"BOLETA", "FACTURA"}:
        try:
            context = await DocumentRenderService(db).build_sale_context(sale_id)
            legal_html = _build_legal_document_html(context, document_type, float(getattr(sale, "tax_rate", 0.0) or 0.0))
            legal_text = _legal_document_text(context, document_type)
            return legal_html, legal_text, document_type, sale.invoice_number or ""
        except Exception as exc:
            logger.exception(
                "legal_document_render_failed sale_id=%s document_type=%s",
                sale_id,
                document_type,
                exc_info=exc,
            )

    templates_enabled = bool(getattr(settings, "print_templates_enabled", False))
    if templates_enabled:
        try:
            return await _render_with_template(db, sale_id)
        except Exception as exc:
            # fallback operativo: ante errores de plantilla seguimos con ticket clasico
            logger.exception("template_render_failed sale_id=%s", sale_id, exc_info=exc)

    lines = _build_receipt_lines(sale, items or [], settings)
    text = "\n".join(lines)
    html = "<pre style='font-family:monospace;white-space:pre-wrap'>" + text + "</pre>"
    document_number = sale.invoice_number or ""
    return html, text, document_type, document_number


@router.get("/receipt-text/{sale_id}")
async def receipt_text(sale_id: int, db: AsyncSession = Depends(get_db)):
    _, text, _, _ = await _resolve_print_payload(db, sale_id)
    return Response(content=text, media_type="text/plain")


@router.get("/escpos/{sale_id}")
async def receipt_escpos(sale_id: int, db: AsyncSession = Depends(get_db)):
    _, text, _, _ = await _resolve_print_payload(db, sale_id)
    lines = text.splitlines()
    data = _to_escpos(lines)
    headers = {"Content-Disposition": f'attachment; filename="ticket_{sale_id}.bin"'}
    return Response(content=data, media_type="application/octet-stream", headers=headers)


@router.get("/document/{sale_id}/html", dependencies=[Depends(require_permission("printing.documents.read"))])
async def document_html(sale_id: int, db: AsyncSession = Depends(get_db)):
    html, _, _, _ = await _resolve_print_payload(db, sale_id)
    snapshot_service = DocumentSnapshotService(db)
    await snapshot_service.mark_printed(sale_id)
    return Response(content=html, media_type="text/html")


@router.get("/document/{sale_id}/text", dependencies=[Depends(require_permission("printing.documents.read"))])
async def document_text(sale_id: int, db: AsyncSession = Depends(get_db)):
    _, text, _, _ = await _resolve_print_payload(db, sale_id)
    snapshot_service = DocumentSnapshotService(db)
    await snapshot_service.mark_printed(sale_id)
    return Response(content=text, media_type="text/plain")


@router.get("/document/{sale_id}/pdf", dependencies=[Depends(require_permission("printing.documents.read"))])
async def document_pdf(sale_id: int, db: AsyncSession = Depends(get_db)):
    service = PrintingService(db)
    sale, _, _ = await service.build_receipt(sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    document_type = (getattr(sale, "document_type", "TICKET") or "TICKET").strip().upper()
    document_number = sale.invoice_number or ""

    if document_type in {"BOLETA", "FACTURA"}:
        context = await DocumentRenderService(db).build_sale_context(sale_id)
        pdf = _build_legal_document_pdf(context, document_type, float(getattr(sale, "tax_rate", 0.0) or 0.0))
    else:
        _, text, document_type, document_number = await _resolve_print_payload(db, sale_id)
        render_service = DocumentRenderService(db)
        pdf = render_service.render_pdf_from_text(f"{document_type}_{document_number}", text)

    snapshot_service = DocumentSnapshotService(db)
    await snapshot_service.mark_printed(sale_id)
    headers = {"Content-Disposition": f'attachment; filename="{document_type.lower()}_{sale_id}.pdf"'}
    return Response(content=pdf, media_type="application/pdf", headers=headers)
