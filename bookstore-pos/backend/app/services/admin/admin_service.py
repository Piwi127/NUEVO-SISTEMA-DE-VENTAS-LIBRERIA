import os

from fastapi import HTTPException

from app.core.config import settings


class AdminService:
    def get_backup_path(self) -> str:
        db_url = settings.database_url
        if "sqlite" not in db_url:
            raise HTTPException(status_code=400, detail="Solo disponible para SQLite")
        path = db_url.split("///")[-1]
        if not os.path.isabs(path):
            path = os.path.abspath(path)
        if not os.path.exists(path):
            raise HTTPException(status_code=404, detail="DB no encontrada")
        return path
