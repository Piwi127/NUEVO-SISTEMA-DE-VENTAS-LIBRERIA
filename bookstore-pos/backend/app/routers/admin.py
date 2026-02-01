from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
import os

from app.core.config import settings
from app.core.deps import require_role

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_role("admin"))])


@router.get("/backup")
async def download_backup():
    db_url = settings.database_url
    if "sqlite" not in db_url:
        raise HTTPException(status_code=400, detail="Solo disponible para SQLite")
    path = db_url.split("///")[-1]
    if not os.path.isabs(path):
        path = os.path.abspath(path)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="DB no encontrada")
    return FileResponse(path, filename="bookstore_backup.db")
