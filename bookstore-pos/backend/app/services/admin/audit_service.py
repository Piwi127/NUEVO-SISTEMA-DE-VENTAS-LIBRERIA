from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog


class AuditService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_audit(self):
        result = await self.db.execute(select(AuditLog).order_by(AuditLog.id.desc()).limit(200))
        return result.scalars().all()
