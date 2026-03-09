from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document_sequence import DocumentSequence


DEFAULT_SERIES_BY_TYPE = {
    "TICKET": "T001",
    "BOLETA": "B001",
    "FACTURA": "F001",
}


class DocumentSequenceService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def next_number(self, document_type: str, scope_type: str = "GLOBAL", scope_ref_id: int | None = None) -> str:
        normalized_type = (document_type or "TICKET").strip().upper()
        sequence = await self._get_or_create_active_sequence(normalized_type, scope_type, scope_ref_id)
        current = int(sequence.next_number or 1)
        series = (sequence.series or DEFAULT_SERIES_BY_TYPE.get(normalized_type, "T001")).strip()
        padding = max(1, int(sequence.number_padding or 6))
        sequence.next_number = current + 1
        return f"{series}-{current:0{padding}d}"

    async def _get_or_create_active_sequence(
        self,
        document_type: str,
        scope_type: str,
        scope_ref_id: int | None,
    ) -> DocumentSequence:
        result = await self.db.execute(
            (
                select(DocumentSequence)
                .where(
                    DocumentSequence.document_type == document_type,
                    DocumentSequence.is_active == True,  # noqa: E712
                    DocumentSequence.scope_type == scope_type,
                    DocumentSequence.scope_ref_id.is_(None) if scope_ref_id is None else DocumentSequence.scope_ref_id == scope_ref_id,
                )
                .order_by(DocumentSequence.id.desc())
            )
        )
        sequence = result.scalars().first()
        if sequence:
            return sequence

        fallback_result = await self.db.execute(
            select(DocumentSequence)
            .where(
                DocumentSequence.document_type == document_type,
                DocumentSequence.is_active == True,  # noqa: E712
                DocumentSequence.scope_type == "GLOBAL",
                DocumentSequence.scope_ref_id.is_(None),
            )
            .order_by(DocumentSequence.id.desc())
        )
        fallback = fallback_result.scalars().first()
        if fallback:
            return fallback

        sequence = DocumentSequence(
            document_type=document_type,
            series=DEFAULT_SERIES_BY_TYPE.get(document_type, "T001"),
            next_number=1,
            number_padding=6,
            is_active=True,
            scope_type="GLOBAL",
            scope_ref_id=None,
        )
        self.db.add(sequence)
        await self.db.flush()
        return sequence
