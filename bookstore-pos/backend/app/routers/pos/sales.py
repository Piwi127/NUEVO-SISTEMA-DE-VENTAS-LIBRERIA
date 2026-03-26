"""
Router de ventas del sistema POS.

Endpoints para:
- Listar ventas con filtros y búsqueda
- Crear nuevas ventas
- Obtener datos del recibo/ticket

Requiere rol de admin o cashier.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import String, and_, case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db, require_permission, require_role
from app.core.rate_limit import rate_limit
from app.core.search import (
    compact_column,
    compact_search_text,
    normalize_search_text,
    normalized_column,
    split_search_terms,
)
from app.models.customer import Customer
from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.models.settings import SystemSettings
from app.models.user import User
from app.schemas.sale import SaleCreate, SaleListOut, SaleOut
from app.services.pos.sales_service import SalesService

# Router con prefijo /sales, tag "sales", requiere rol admin o cashier
router = APIRouter(
    prefix="/sales",
    tags=["sales"],
    dependencies=[Depends(require_role("admin", "cashier"))],
)

# Palabras stop para búsqueda de ventas
SALES_STOP_WORDS = {
    "a",
    "al",
    "con",
    "de",
    "del",
    "el",
    "en",
    "la",
    "las",
    "los",
    "para",
    "por",
    "un",
    "una",
    "y",
}

# Campos de código para búsqueda (número de factura, RUC, teléfono)
# Tupla: (columna, peso para ranking)
SALES_CODE_FIELDS = (
    (Sale.invoice_number, 112),
    (Sale.id.cast(String), 100),
    (Customer.tax_id, 108),
    (Customer.phone, 96),
)

# Campos de texto para búsqueda (nombre cliente, usuario, estado)
SALES_TEXT_FIELDS = (
    (Customer.name, 82),
    (User.username, 58),
    (Sale.status, 40),
    (Sale.document_type, 36),
)


def _prepare_sales_tokens(search: str) -> list[str]:
    """
    Prepara tokens de búsqueda filtrando palabras stop.

    Args:
        search: Texto de búsqueda.

    Returns:
        Lista de tokens válidos.
    """
    return [
        token
        for token in split_search_terms(search)
        if token and token not in SALES_STOP_WORDS
    ]


def _build_sales_search_clause(term: str):
    """
    Construye cláusula de búsqueda para un término.

    Args:
        term: Término a buscar.

    Returns:
        Cláusula SQL con LIKE para todos los campos.
    """
    normalized_term = normalize_search_text(term)
    compact_term = compact_search_text(term)
    normalized_pattern = f"%{normalized_term}%"
    clauses = [
        normalized_column(column).like(normalized_pattern)
        for column, _ in (*SALES_TEXT_FIELDS, *SALES_CODE_FIELDS)
    ]
    if compact_term:
        compact_pattern = f"%{compact_term}%"
        clauses.extend(
            compact_column(column).like(compact_pattern)
            for column, _ in SALES_CODE_FIELDS
        )
    return or_(*clauses)


def _build_sales_score_expression(search: str, tokens: list[str]):
    """
    Construye expresión de puntuación para ordenar resultados por relevancia.

    Args:
        search: Texto de búsqueda original.
        tokens: Tokens de búsqueda.

    Returns:
        Expresión SQL para calcular score de relevancia.
    """
    normalized_query = normalize_search_text(search)
    compact_query = compact_search_text(search)
    score = 0

    # Puntuación para campos de código (exact match > starts with > contains)
    for column, weight in SALES_CODE_FIELDS:
        if compact_query:
            score += case(
                (compact_column(column) == compact_query, weight * 6), else_=0
            )
            score += case(
                (compact_column(column).like(f"{compact_query}%"), weight * 5), else_=0
            )
            score += case(
                (compact_column(column).like(f"%{compact_query}%"), weight * 4), else_=0
            )

    # Puntuación para campos de texto
    for column, weight in SALES_TEXT_FIELDS:
        if normalized_query:
            score += case(
                (normalized_column(column) == normalized_query, weight * 5), else_=0
            )
            score += case(
                (normalized_column(column).like(f"{normalized_query}%"), weight * 4),
                else_=0,
            )
            score += case(
                (normalized_column(column).like(f"%{normalized_query}%"), weight * 3),
                else_=0,
            )

    # Puntuación para tokens individuales
    for token in tokens:
        compact_token = compact_search_text(token)
        for column, weight in SALES_CODE_FIELDS:
            if compact_token:
                score += case(
                    (compact_column(column) == compact_token, weight * 6), else_=0
                )
                score += case(
                    (compact_column(column).like(f"{compact_token}%"), weight * 5),
                    else_=0,
                )
                score += case(
                    (compact_column(column).like(f"%{compact_token}%"), weight * 4),
                    else_=0,
                )

        for column, weight in SALES_TEXT_FIELDS:
            score += case((normalized_column(column) == token, weight * 5), else_=0)
            score += case(
                (normalized_column(column).like(f"{token}%"), weight * 4), else_=0
            )
            score += case(
                (normalized_column(column).like(f"%{token}%"), weight * 3), else_=0
            )

    # Bonus por coincidencia de todos los tokens
    if tokens:
        score += case(
            (
                and_(*[_build_sales_search_clause(token) for token in tokens]),
                48 + (len(tokens) * 12),
            ),
            else_=0,
        )

    return score


@router.get(
    "",
    response_model=list[SaleListOut],
    dependencies=[Depends(require_permission("sales.read"))],
)
async def list_sales(
    search: str | None = None,
    status: str | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
    customer_id: int | None = None,
    user_id: int | None = None,
    limit: int = 200,
    db: AsyncSession = Depends(get_db),
):
    """
    Lista ventas con filtros opcionales y búsqueda.

    Filtros disponibles:
    - search: Búsqueda por número de factura, cliente, RUC, teléfono
    - status: Filtrar por estado (PAID, VOIDED)
    - from_date / to_date: Filtrar por rango de fechas
    - customer_id: Filtrar por cliente
    - user_id: Filtrar por cajero

    Args:
        search: Texto de búsqueda.
        status: Estado de la venta.
        from_date: Fecha inicio (YYYY-MM-DD).
        to_date: Fecha fin (YYYY-MM-DD).
        customer_id: ID del cliente.
        user_id: ID del cajero.
        limit: Límite de resultados (máx 500).
        db: Sesión de base de datos.

    Returns:
        Lista de ventas con información resumida.
    """
    stmt = (
        select(
            Sale.id.label("id"),
            Sale.user_id.label("user_id"),
            Sale.customer_id.label("customer_id"),
            User.username.label("user_name"),
            Customer.name.label("customer_name"),
            Customer.tax_id.label("customer_tax_id"),
            Customer.phone.label("customer_phone"),
            Sale.status.label("status"),
            Sale.subtotal.label("subtotal"),
            Sale.tax.label("tax"),
            Sale.discount.label("discount"),
            Sale.total.label("total"),
            Sale.invoice_number.label("invoice_number"),
            Sale.document_type.label("document_type"),
            Sale.created_at.label("created_at"),
        )
        .select_from(Sale)
        .outerjoin(User, User.id == Sale.user_id)
        .outerjoin(Customer, Customer.id == Sale.customer_id)
    )

    # Aplicar filtros
    if status:
        stmt = stmt.where(Sale.status == status)
    if from_date:
        stmt = stmt.where(func.date(Sale.created_at) >= from_date)
    if to_date:
        stmt = stmt.where(func.date(Sale.created_at) <= to_date)
    if customer_id:
        stmt = stmt.where(Sale.customer_id == customer_id)
    if user_id:
        stmt = stmt.where(Sale.user_id == user_id)

    # Búsqueda con ranking de relevancia
    if search:
        tokens = _prepare_sales_tokens(search)
        if tokens:
            stmt = stmt.where(
                and_(*[_build_sales_search_clause(token) for token in tokens])
            )
            stmt = stmt.order_by(
                _build_sales_score_expression(search, tokens).desc(),
                Sale.created_at.desc(),
                Sale.id.desc(),
            )
        else:
            stmt = stmt.order_by(Sale.created_at.desc(), Sale.id.desc())
    else:
        stmt = stmt.order_by(Sale.created_at.desc(), Sale.id.desc())

    stmt = stmt.limit(min(max(limit, 1), 500))
    result = await db.execute(stmt)
    return result.mappings().all()


@router.post(
    "",
    response_model=SaleOut,
    status_code=201,
    dependencies=[Depends(require_permission("sales.create"))],
)
@rate_limit(limit=30, window_seconds=60, key_prefix="sales_create")
async def create_sale(
    data: SaleCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Crea una nueva venta.

    El cuerpo de la petición debe incluir:
    - items: Lista de productos con cantidades
    - payments: Lista de pagos (método y monto)
    - customer_id: ID del cliente (opcional)
    - promotion_id: ID de promoción (opcional)
    - document_type: Tipo de documento (TICKET, BOLETA, FACTURA)
    - redeem_points: Puntos de lealtad a canjear (opcional)

    Args:
        data: Datos de la venta.
        db: Sesión de base de datos.
        current_user: Usuario autenticado (cajero).

    Returns:
        Venta creada con todos los detalles.
    """
    service = SalesService(db, current_user)
    return await service.create_sale(data)


@router.get(
    "/{sale_id}/receipt", dependencies=[Depends(require_permission("sales.read"))]
)
async def get_receipt(sale_id: int, db: AsyncSession = Depends(get_db)):
    """
    Obtiene los datos completos del recibo de una venta.

    Incluye:
    - Datos de la venta (número, fecha, totales)
    - Items comprados con precios
    - Información de la tienda
    - Datos del cliente
    - Configuración del recibo para impresión

    Args:
        sale_id: ID de la venta.
        db: Sesión de base de datos.

    Returns:
        Datos completos del recibo en JSON.

    Raises:
        HTTPException 404: Si la venta no existe.
    """
    res = await db.execute(select(Sale).where(Sale.id == sale_id))
    sale = res.scalar_one_or_none()
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    items_res = await db.execute(
        select(SaleItem, Product.name)
        .join(Product, Product.id == SaleItem.product_id)
        .where(SaleItem.sale_id == sale_id)
    )
    items = items_res.all()

    settings_res = await db.execute(select(SystemSettings).limit(1))
    settings = settings_res.scalar_one_or_none()
    customer = None
    if sale.customer_id:
        customer_res = await db.execute(
            select(Customer).where(Customer.id == sale.customer_id)
        )
        customer = customer_res.scalar_one_or_none()

    return {
        "sale_id": sale.id,
        "invoice_number": sale.invoice_number,
        "document_type": sale.document_type or "TICKET",
        "created_at": sale.created_at.isoformat(),
        "subtotal": sale.subtotal,
        "tax": sale.tax,
        "discount": sale.discount,
        "pack_discount": sale.pack_discount,
        "promotion_discount": sale.promotion_discount,
        "loyalty_discount": sale.loyalty_discount,
        "loyalty_points_earned": sale.loyalty_points_earned,
        "loyalty_points_redeemed": sale.loyalty_points_redeemed,
        "total": sale.total,
        "items": [
            {
                "product_id": i.SaleItem.product_id,
                "name": i.name,
                "qty": i.SaleItem.qty,
                "unit_price": i.SaleItem.unit_price,
                "unit_cost_snapshot": i.SaleItem.unit_cost_snapshot,
                "line_total": i.SaleItem.final_total,
                "base_line_total": i.SaleItem.line_total,
                "discount": i.SaleItem.discount,
                "final_total": i.SaleItem.final_total,
                "applied_rule_id": i.SaleItem.applied_rule_id,
                "applied_rule_meta": i.SaleItem.applied_rule_meta,
            }
            for i in items
        ],
        "store": {
            "name": settings.project_name if settings else "",
            "address": settings.store_address if settings else "",
            "phone": settings.store_phone if settings else "",
            "tax_id": settings.store_tax_id if settings else "",
        },
        "customer": {
            "id": customer.id if customer else None,
            "name": customer.name if customer else "",
            "tax_id": customer.tax_id if customer else "",
            "address": customer.address if customer else "",
            "email": customer.email if customer else "",
        },
        "receipt": {
            "header": settings.receipt_header if settings else "",
            "footer": settings.receipt_footer if settings else "",
            "paper_width_mm": settings.paper_width_mm if settings else 80,
            "print_templates_enabled": bool(
                getattr(settings, "print_templates_enabled", False)
            )
            if settings
            else False,
        },
    }
