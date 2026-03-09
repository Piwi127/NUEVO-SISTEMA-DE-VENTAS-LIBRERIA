import hashlib

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.print_template import PrintTemplateVersion


class TemplateVersionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_version(self, template_id: int, schema_json: str, created_by: int | None = None) -> PrintTemplateVersion:
        latest_res = await self.db.execute(
            select(PrintTemplateVersion)
            .where(PrintTemplateVersion.template_id == template_id)
            .order_by(PrintTemplateVersion.version.desc(), PrintTemplateVersion.id.desc())
        )
        latest = latest_res.scalars().first()
        next_version = int(latest.version if latest else 0) + 1
        checksum = hashlib.sha256((schema_json or "").encode("utf-8")).hexdigest()
        version = PrintTemplateVersion(
            template_id=template_id,
            version=next_version,
            schema_json=schema_json,
            checksum=checksum,
            is_published=True,
            created_by=created_by,
        )
        self.db.add(version)
        await self.db.flush()
        return version
