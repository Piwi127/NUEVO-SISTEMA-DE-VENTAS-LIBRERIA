from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, case, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db, require_permission
from app.core.search import compact_column, compact_search_text, normalize_search_text, normalized_column, split_search_terms
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductOut, ProductUpdate
from app.services.catalog.products_service import ProductsService

router = APIRouter(prefix="/products", tags=["products"])

TERM_GROUPS: list[list[str]] = [
    ["cuaderno", "cuadernos", "hoja", "hojas", "libreta", "notebook", "rayado", "cuadriculado", "apuntes"],
    ["lapiz", "lapices", "portaminas", "grafito", "hb", "dibujar"],
    ["lapicero", "lapiceros", "boligrafo", "boligrafos", "pluma", "tinta", "escribir"],
    ["borrador", "borradores", "goma", "corrector", "corregir"],
    ["resaltador", "resaltadores", "marcador", "marcadores", "fluorescente", "subrayar"],
    ["plumon", "plumones", "color", "colores", "marker", "markers", "punta", "delgado", "colorear"],
    ["folder", "carpeta", "archivador", "funda", "micas", "archivar"],
    ["papel", "papeles", "resma", "a4", "oficio", "bond", "imprimir", "fotocopia"],
    ["regla", "escuadra", "transportador", "compas", "geometria"],
    ["cartulina", "cartulinas", "carton", "cartonina", "manualidades", "escolar"],
    ["pegamento", "goma", "silicona", "adhesivo", "pegar"],
    ["tijera", "tijeras", "cutter", "cuchilla", "cortar"],
    ["tempera", "acrilico", "pintura", "oleo", "acuarela", "pincel", "colorear"],
    ["escolar", "utiles", "oficina", "papeleria", "utilidad", "funcion", "funcionamiento"],
    ["libro", "libros", "novela", "novelas", "cuento", "cuentos", "texto", "diccionario", "agenda"],
]

PRODUCT_STOP_WORDS = {"a", "al", "con", "de", "del", "el", "en", "la", "las", "los", "para", "por", "un", "una", "y"}
PRODUCT_TEXT_FIELDS = (
    ("name", Product.name, 90),
    ("author", Product.author, 60),
    ("publisher", Product.publisher, 46),
    ("category", Product.category, 42),
    ("tags", Product.tags, 48),
)
PRODUCT_CODE_FIELDS = (
    ("sku", Product.sku, 95),
    ("isbn", Product.isbn, 108),
    ("barcode", Product.barcode, 105),
    ("shelf_location", Product.shelf_location, 28),
)


def _prepare_tokens(search: str) -> list[str]:
    return [token for token in split_search_terms(search) if token and token not in PRODUCT_STOP_WORDS]


def _expand_tokens(tokens: list[str]) -> list[str]:
    expanded = set(tokens)
    for group in TERM_GROUPS:
        if any(term in expanded for term in group):
            expanded.update(group)
    return list(expanded)


def _build_search_clause(term: str):
    normalized_term = normalize_search_text(term)
    compact_term = compact_search_text(term)
    normalized_pattern = f"%{normalized_term}%"
    clauses = [normalized_column(column).like(normalized_pattern) for _, column, _ in (*PRODUCT_TEXT_FIELDS, *PRODUCT_CODE_FIELDS)]
    if compact_term:
        compact_pattern = f"%{compact_term}%"
        clauses.extend(compact_column(column).like(compact_pattern) for _, column, _ in PRODUCT_CODE_FIELDS)
    return or_(*clauses)


def _build_score_expression(search: str, raw_tokens: list[str], expanded_tokens: list[str]):
    normalized_query = normalize_search_text(search)
    compact_query = compact_search_text(search)
    score = 0

    for _, column, weight in PRODUCT_CODE_FIELDS:
        if compact_query:
            score += case((compact_column(column) == compact_query, weight * 6), else_=0)
            score += case((compact_column(column).like(f"{compact_query}%"), weight * 5), else_=0)
            score += case((compact_column(column).like(f"%{compact_query}%"), weight * 4), else_=0)

    for _, column, weight in PRODUCT_TEXT_FIELDS:
        if normalized_query:
            score += case((normalized_column(column) == normalized_query, weight * 5), else_=0)
            score += case((normalized_column(column).like(f"{normalized_query}%"), weight * 4), else_=0)
            score += case((normalized_column(column).like(f"%{normalized_query}%"), weight * 3), else_=0)

    for token in raw_tokens:
        compact_token = compact_search_text(token)

        for _, column, weight in PRODUCT_CODE_FIELDS:
            if compact_token:
                score += case((compact_column(column) == compact_token, weight * 6), else_=0)
                score += case((compact_column(column).like(f"{compact_token}%"), weight * 5), else_=0)
                score += case((compact_column(column).like(f"%{compact_token}%"), weight * 4), else_=0)

        for _, column, weight in PRODUCT_TEXT_FIELDS:
            score += case((normalized_column(column) == token, weight * 5), else_=0)
            score += case((normalized_column(column).like(f"{token}%"), weight * 4), else_=0)
            score += case((normalized_column(column).like(f"%{token}%"), weight * 3), else_=0)

    for token in expanded_tokens:
        if token in raw_tokens:
            continue
        for field_name, column, weight in PRODUCT_TEXT_FIELDS:
            related_weight = max(int(weight * 0.9), 1) if field_name in {"name", "tags"} else max(int(weight * 0.7), 1)
            score += case((normalized_column(column).like(f"%{token}%"), related_weight), else_=0)

    if raw_tokens:
        raw_token_clauses = [_build_search_clause(token) for token in raw_tokens]
        score += case((and_(*raw_token_clauses), 64 + (len(raw_tokens) * 16)), else_=0)

    score += case((Product.stock > 0, 4), else_=0)
    return score


@router.get("/categories", response_model=list[str], dependencies=[Depends(require_permission("products.read"))])
async def list_product_categories(db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Product.category)
        .where(Product.category.is_not(None), Product.category != "")
        .distinct()
        .order_by(Product.category.asc())
    )
    result = await db.execute(stmt)
    return [row[0] for row in result.fetchall()]


@router.get("/{product_id}", response_model=ProductOut, dependencies=[Depends(require_permission("products.read"))])
async def get_product(product_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return product


@router.get("", response_model=list[ProductOut], dependencies=[Depends(require_permission("products.read"))])
async def list_products(
    search: str | None = None,
    category: str | None = None,
    in_stock: bool | None = None,
    smart: bool = False,
    limit: int = 200,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Product)

    if category:
        stmt = stmt.where(Product.category == category)
    if in_stock:
        stmt = stmt.where(Product.stock > 0)

    if search:
        tokens = _prepare_tokens(search)
        if tokens:
            strict_match = and_(*[_build_search_clause(token) for token in tokens])
            expanded_tokens = _expand_tokens(tokens) if smart else tokens
            related_tokens = [token for token in expanded_tokens if token not in tokens]

            if smart and related_tokens:
                stmt = stmt.where(or_(strict_match, *[_build_search_clause(token) for token in related_tokens]))
            else:
                stmt = stmt.where(strict_match)

            stmt = stmt.order_by(_build_score_expression(search, tokens, expanded_tokens).desc(), Product.stock.desc(), Product.id.desc())
        else:
            stmt = stmt.order_by(Product.id.desc())
    else:
        stmt = stmt.order_by(Product.id.desc())

    stmt = stmt.limit(min(max(limit, 1), 500)).offset(max(offset, 0))
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=ProductOut, status_code=201, dependencies=[Depends(require_permission("products.write"))])
async def create_product(
    data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = ProductsService(db, current_user)
    return await service.create_product(data)


@router.put("/{product_id}", response_model=ProductOut, dependencies=[Depends(require_permission("products.write"))])
async def update_product(
    product_id: int,
    data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = ProductsService(db, current_user)
    return await service.update_product(product_id, data)


@router.delete("/{product_id}", dependencies=[Depends(require_permission("products.write"))])
async def delete_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = ProductsService(db, current_user)
    return await service.delete_product(product_id)
