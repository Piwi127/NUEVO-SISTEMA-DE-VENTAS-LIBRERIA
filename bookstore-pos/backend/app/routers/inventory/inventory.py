import csv
from io import StringIO, BytesIO
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import PlainTextResponse, StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user, require_permission, require_role
from app.models.inventory import StockMovement
from app.schemas.inventory import InventoryMovementCreate, StockMovementOut
from app.services.inventory.stock_service import StockService

router = APIRouter(prefix="/inventory", tags=["inventory"], dependencies=[Depends(require_role("admin", "stock"))])


REQUIRED_COLUMNS = {"sku", "name", "category", "price", "cost", "stock", "stock_min"}


@router.post("/movement", response_model=StockMovementOut, status_code=201, dependencies=[Depends(require_permission("inventory.write"))])
async def create_movement(
    data: InventoryMovementCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = StockService(db, current_user)
    return await service.create_movement(data)


@router.get("/template", dependencies=[Depends(require_permission("inventory.read"))])
async def download_template():
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["sku", "name", "category", "price", "cost", "stock", "stock_min"])
    writer.writerow(["BK-001", "Libro ejemplo", "Ficcion", "25.90", "12.50", "10", "2"])
    return PlainTextResponse(output.getvalue(), media_type="text/csv")


@router.get("/template/xlsx", dependencies=[Depends(require_permission("inventory.read"))])
async def download_template_xlsx():
    try:
        from openpyxl import Workbook
    except Exception:
        raise HTTPException(status_code=400, detail="Instale openpyxl para XLSX")
    wb = Workbook()
    ws = wb.active
    ws.append(["sku", "name", "category", "price", "cost", "stock", "stock_min"])
    ws.append(["BK-001", "Libro ejemplo", "Ficcion", "25.90", "12.50", "10", "2"])
    bio = BytesIO()
    wb.save(bio)
    bio.seek(0)
    return StreamingResponse(
        bio,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=inventory_template.xlsx"},
    )


@router.post("/upload", dependencies=[Depends(require_permission("inventory.write"))])
async def upload_inventory(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Archivo invalido")
    filename = file.filename.lower()
    rows: list[dict] = []

    if filename.endswith(".csv"):
        content = await file.read()
        text = content.decode("utf-8", errors="ignore")
        reader = csv.DictReader(StringIO(text))
        if not reader.fieldnames:
            raise HTTPException(status_code=400, detail="CSV sin encabezados")
        header = {h.strip() for h in reader.fieldnames if h}
        if not REQUIRED_COLUMNS.issubset(header):
            missing = ", ".join(sorted(REQUIRED_COLUMNS - header))
            raise HTTPException(status_code=400, detail=f"Faltan columnas: {missing}")
        rows = [r for r in reader]
    elif filename.endswith(".xlsx"):
        try:
            from openpyxl import load_workbook
        except Exception:
            raise HTTPException(status_code=400, detail="Instale openpyxl para XLSX")
        data = await file.read()
        wb = load_workbook(filename=BytesIO(data))
        ws = wb.active
        headers = [str(c.value).strip() if c.value is not None else "" for c in next(ws.iter_rows(min_row=1, max_row=1))]
        header = {h for h in headers if h}
        if not REQUIRED_COLUMNS.issubset(header):
            missing = ", ".join(sorted(REQUIRED_COLUMNS - header))
            raise HTTPException(status_code=400, detail=f"Faltan columnas: {missing}")
        for row in ws.iter_rows(min_row=2, values_only=True):
            rows.append({headers[i]: row[i] for i in range(len(headers))})
    else:
        raise HTTPException(status_code=400, detail="Formato no soportado. Use CSV o XLSX")

    service = StockService(db, current_user)
    return await service.bulk_import(rows)


@router.get("/kardex/{product_id}", response_model=list[StockMovementOut], dependencies=[Depends(require_permission("inventory.read"))])
async def get_kardex(product_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(StockMovement).where(StockMovement.product_id == product_id).order_by(StockMovement.id.desc()).limit(200)
    )
    return result.scalars().all()
