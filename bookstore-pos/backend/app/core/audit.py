from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog


async def log_event(db: AsyncSession, user_id: int | None, action: str, entity: str, entity_id: str, details: str = ""):
    db.add(AuditLog(user_id=user_id, action=action, entity=entity, entity_id=str(entity_id), details=details))
    await db.commit()
