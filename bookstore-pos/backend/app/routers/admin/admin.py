"""
Router de administración.
Endpoints: GET /admin/backup
"""

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse

from app.core.deps import require_permission
from app.services.admin.admin_service import AdminService

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_permission("admin.backup"))],
)


@router.get("/backup")
async def download_backup():
    """Descarga un backup de la base de datos."""
    service = AdminService()
    path = service.get_backup_path()
    return FileResponse(path, filename="bookstore_backup.db")
