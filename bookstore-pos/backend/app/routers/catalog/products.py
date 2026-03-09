import unicodedata

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db, require_permission
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductOut, ProductUpdate
from app.services.catalog.products_service import ProductsService

router = APIRouter(prefix="/products", tags=["products"])

TERM_GROUPS: list[list[str]] = [
    ["cuaderno", "cuadernos", "hoja", "hojas", "libreta", "notebook", "rayado", "cuadriculado"],
    ["lapiz", "lapices", "portaminas", "grafito", "hb"],
    ["lapicero", "lapiceros", "boligrafo", "boligrafos", "pluma", "tinta"],
    ["borrador", "borradores", "goma", "corrector"],
    ["resaltador", "resaltadores", "marcador", "marcadores", "fluorescente"],
    ["plumon", "plumones", "color", "colores", "marker", "markers", "punta", "delgado"],
    ["folder", "carpeta", "archivador", "funda", "micas"],
    ["papel", "papeles", "resma", "a4", "oficio", "bond"],
    ["regla", "escuadra", "transportador", "compas"],
    ["cartulina", "cartulinas", "carton", "cartonina", "manualidades"],
    ["pegamento", "goma", "silicona", "adhesivo"],
    ["tijera", "tijeras", "cutter", "cuchilla"],
    ["tempera", "acrilico", "pintura", "oleo", "acuarela", "pincel"],
    ["escolar", "utiles", "oficina", "papeleria"],
    ["libro", "libros", "novela", "novelas", "cuento", "cuentos", "texto", "diccionario", "agenda"],
]



def _normalize(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value.lower().strip())
    return "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")


def _normalized_column(column):
    value = func.lower(func.coalesce(column, ""))
    replacements = (
        ("\u00e1", "a"),
        ("\u00e9", "e"),
        ("\u00ed", "i"),
        ("\u00f3", "o"),
        ("\u00fa", "u"),
        ("\u00fc", "u"),
        ("\u00f1", "n"),
    )
    for source, target in replacements:
        value = func.replace(value, source, target)
    return value



def _expand_tokens(tokens: list[str]) -> list[str]:
    expanded = set(tokens)
    for group in TERM_GROUPS:
        if any(term in expanded for term in group):
            expanded.update(group)
    return list(expanded)



def _build_search_clause(term: str):
    normalized_term = f"%{_normalize(term)}%"
    return or_(
        _normalized_column(Product.name).like(normalized_term),
        _normalized_column(Product.sku).like(normalized_term),
        _normalized_column(Product.author).like(normalized_term),
        _normalized_column(Product.publisher).like(normalized_term),
        _normalized_column(Product.isbn).like(normalized_term),
        _normalized_column(Product.barcode).like(normalized_term),
        _normalized_column(Product.shelf_location).like(normalized_term),
        _normalized_column(Product.category).like(normalized_term),
        _normalized_column(Product.tags).like(normalized_term),
    )


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
        tokens = [_normalize(token.strip()) for token in search.split() if token.strip()]
        if tokens:
            if smart:
                token_clauses = []
                for token in _expand_tokens(tokens):
                    token_clauses.append(_build_search_clause(token))
                stmt = stmt.where(or_(*token_clauses))
            else:
                token_clauses = []
                for token in tokens:
                    token_clauses.append(_build_search_clause(token))
                stmt = stmt.where(and_(*token_clauses))

    stmt = stmt.order_by(Product.id.desc()).limit(min(max(limit, 1), 500)).offset(max(offset, 0))
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
