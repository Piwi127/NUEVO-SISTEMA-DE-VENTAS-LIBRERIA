from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sale_document_snapshot import SaleDocumentSnapshot


class DocumentSnapshotService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def upsert_snapshot(
        self,
        sale_id: int,
        document_type: str,
        document_number: str,
        template_id: int | None,
        template_version_id: int | None,
        render_context: dict,
        render_result: dict,
        rendered_html: str | None,
        rendered_text: str | None,
    ) -> SaleDocumentSnapshot:
        existing_res = await self.db.execute(select(SaleDocumentSnapshot).where(SaleDocumentSnapshot.sale_id == sale_id))
        snapshot = existing_res.scalar_one_or_none()
        if snapshot is None:
            snapshot = SaleDocumentSnapshot(sale_id=sale_id, document_type=document_type, document_number=document_number)
            self.db.add(snapshot)
            await self.db.flush()

        snapshot.document_type = document_type
        snapshot.document_number = document_number
        snapshot.template_id = template_id
        snapshot.template_version_id = template_version_id
        snapshot.render_context_json = json.dumps(render_context, ensure_ascii=False)
        snapshot.render_result_json = json.dumps(render_result, ensure_ascii=False)
        snapshot.rendered_html = rendered_html
        snapshot.rendered_text = rendered_text
        await self.db.flush()
        return snapshot

    async def mark_printed(self, sale_id: int) -> None:
        result = await self.db.execute(select(SaleDocumentSnapshot).where(SaleDocumentSnapshot.sale_id == sale_id))
        snapshot = result.scalar_one_or_none()
        if snapshot is None:
            return
        snapshot.printed_at = datetime.now(timezone.utc)
        await self.db.flush()

    async def get_by_sale_id(self, sale_id: int) -> SaleDocumentSnapshot | None:
        result = await self.db.execute(select(SaleDocumentSnapshot).where(SaleDocumentSnapshot.sale_id == sale_id))
        return result.scalar_one_or_none()
