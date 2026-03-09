from __future__ import annotations

from contextlib import asynccontextmanager
from collections.abc import Sequence
from typing import Any

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.print_template import PrintTemplate, PrintTemplateVersion
from app.schemas.document_template import PrintTemplateCreate, PrintTemplateOut, PrintTemplateUpdate
from app.services.printing_templates.default_templates import default_template_schema
from app.services.printing_templates.template_version_service import TemplateVersionService
from app.services._transaction import service_transaction


_ACTIVE_TEMPLATE_CACHE: dict[tuple[str, str, int | None], tuple[int, str]] = {}


class TemplateService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.versions = TemplateVersionService(db)

    @asynccontextmanager
    async def _transaction(self):
        async with service_transaction(self.db):
            yield

    async def list_templates(self, document_type: str | None = None) -> list[PrintTemplateOut]:
        stmt = select(PrintTemplate).order_by(PrintTemplate.document_type.asc(), PrintTemplate.id.desc())
        if document_type:
            stmt = stmt.where(PrintTemplate.document_type == document_type.strip().upper())
        result = await self.db.execute(stmt)
        templates = result.scalars().all()
        return [await self._to_out(template) for template in templates]

    async def get_template(self, template_id: int) -> PrintTemplateOut:
        template = await self._get_template_or_404(template_id)
        return await self._to_out(template)

    async def create_template(self, data: PrintTemplateCreate, user_id: int | None = None) -> PrintTemplateOut:
        async with self._transaction():
            payload = data.model_dump(by_alias=True)
            payload["document_type"] = (payload.get("document_type") or "TICKET").strip().upper()
            template = PrintTemplate(
                name=payload["name"].strip(),
                document_type=payload["document_type"],
                paper_code=payload["paper_code"],
                paper_width_mm=payload["paper_width_mm"],
                paper_height_mm=payload.get("paper_height_mm"),
                margin_top_mm=payload["margin_top_mm"],
                margin_right_mm=payload["margin_right_mm"],
                margin_bottom_mm=payload["margin_bottom_mm"],
                margin_left_mm=payload["margin_left_mm"],
                scope_type=(payload.get("scope_type") or "GLOBAL").strip().upper(),
                scope_ref_id=payload.get("scope_ref_id"),
                is_active=bool(payload.get("is_active", True)),
                is_default=bool(payload.get("is_default", False)),
                created_by=user_id,
                updated_by=user_id,
            )
            self.db.add(template)
            await self.db.flush()
            await self.versions.create_version(template.id, payload.get("schema_json") or "{}", created_by=user_id)
            if template.is_default:
                await self._clear_other_defaults(template)
            self._invalidate_cache(template.document_type)
            await self.db.refresh(template)
            return await self._to_out(template)

    async def update_template(self, template_id: int, data: PrintTemplateUpdate, user_id: int | None = None) -> PrintTemplateOut:
        async with self._transaction():
            template = await self._get_template_or_404(template_id)
            payload = data.model_dump(by_alias=True)
            template.name = payload["name"].strip()
            template.paper_code = payload["paper_code"]
            template.paper_width_mm = payload["paper_width_mm"]
            template.paper_height_mm = payload.get("paper_height_mm")
            template.margin_top_mm = payload["margin_top_mm"]
            template.margin_right_mm = payload["margin_right_mm"]
            template.margin_bottom_mm = payload["margin_bottom_mm"]
            template.margin_left_mm = payload["margin_left_mm"]
            template.scope_type = (payload.get("scope_type") or "GLOBAL").strip().upper()
            template.scope_ref_id = payload.get("scope_ref_id")
            template.is_active = bool(payload.get("is_active", True))
            template.is_default = bool(payload.get("is_default", False))
            template.updated_by = user_id
            await self.versions.create_version(template.id, payload.get("schema_json") or "{}", created_by=user_id)
            if template.is_default:
                await self._clear_other_defaults(template)
            self._invalidate_cache(template.document_type)
            await self.db.refresh(template)
            return await self._to_out(template)

    async def soft_delete_template(self, template_id: int) -> dict[str, Any]:
        async with self._transaction():
            template = await self._get_template_or_404(template_id)
            template.is_active = False
            if template.is_default:
                template.is_default = False
            self._invalidate_cache(template.document_type)
            return {"ok": True}

    async def duplicate_template(self, template_id: int, name: str | None, user_id: int | None = None) -> PrintTemplateOut:
        source = await self._get_template_or_404(template_id)
        latest = await self.get_latest_version_model(source.id)
        schema_json = latest.schema_json if latest else default_template_schema(source.document_type, source.paper_code)
        duplicate = PrintTemplateCreate(
            name=(name or f"{source.name} (copia)").strip(),
            document_type=source.document_type,
            paper_code=source.paper_code,
            paper_width_mm=source.paper_width_mm,
            paper_height_mm=source.paper_height_mm,
            margin_top_mm=source.margin_top_mm,
            margin_right_mm=source.margin_right_mm,
            margin_bottom_mm=source.margin_bottom_mm,
            margin_left_mm=source.margin_left_mm,
            scope_type=source.scope_type,
            scope_ref_id=source.scope_ref_id,
            is_active=True,
            is_default=False,
            schema_json=schema_json,
        )
        return await self.create_template(duplicate, user_id=user_id)

    async def set_default(self, template_id: int) -> PrintTemplateOut:
        async with self._transaction():
            template = await self._get_template_or_404(template_id)
            template.is_default = True
            template.is_active = True
            await self._clear_other_defaults(template)
            self._invalidate_cache(template.document_type)
            await self.db.refresh(template)
            return await self._to_out(template)

    async def restore_default(self, template_id: int, user_id: int | None = None) -> PrintTemplateOut:
        async with self._transaction():
            template = await self._get_template_or_404(template_id)
            schema = default_template_schema(template.document_type, template.paper_code)
            await self.versions.create_version(template.id, schema, created_by=user_id)
            self._invalidate_cache(template.document_type)
            await self.db.refresh(template)
            return await self._to_out(template)

    async def get_active_template_with_schema(
        self,
        document_type: str,
        scope_type: str = "GLOBAL",
        scope_ref_id: int | None = None,
    ) -> tuple[PrintTemplate | None, str]:
        normalized_type = (document_type or "TICKET").strip().upper()
        normalized_scope = (scope_type or "GLOBAL").strip().upper()
        key = (normalized_type, normalized_scope, scope_ref_id)
        cached = _ACTIVE_TEMPLATE_CACHE.get(key)
        if cached:
            template_id, schema_json = cached
            template = await self._get_template_or_none(template_id)
            if template and template.is_active:
                return template, schema_json

        template = await self._find_best_active_template(normalized_type, normalized_scope, scope_ref_id)
        if not template:
            return None, default_template_schema(normalized_type, "THERMAL_80")
        latest = await self.get_latest_version_model(template.id)
        schema_json = latest.schema_json if latest else default_template_schema(normalized_type, template.paper_code)
        _ACTIVE_TEMPLATE_CACHE[key] = (template.id, schema_json)
        return template, schema_json

    async def get_latest_version_model(self, template_id: int) -> PrintTemplateVersion | None:
        latest_res = await self.db.execute(
            select(PrintTemplateVersion)
            .where(PrintTemplateVersion.template_id == template_id)
            .order_by(PrintTemplateVersion.version.desc(), PrintTemplateVersion.id.desc())
        )
        return latest_res.scalars().first()

    async def _find_best_active_template(
        self,
        document_type: str,
        scope_type: str,
        scope_ref_id: int | None,
    ) -> PrintTemplate | None:
        normalized_type = (document_type or "TICKET").strip().upper()
        normalized_scope = (scope_type or "GLOBAL").strip().upper()
        scoped_res = await self.db.execute(
            (
                select(PrintTemplate)
                .where(
                    PrintTemplate.document_type == normalized_type,
                    PrintTemplate.is_active == True,  # noqa: E712
                    PrintTemplate.scope_type == normalized_scope,
                    PrintTemplate.scope_ref_id.is_(None) if scope_ref_id is None else PrintTemplate.scope_ref_id == scope_ref_id,
                )
                .order_by(PrintTemplate.is_default.desc(), PrintTemplate.id.desc())
            )
        )
        scoped = scoped_res.scalars().first()
        if scoped:
            return scoped

        global_res = await self.db.execute(
            select(PrintTemplate)
            .where(
                PrintTemplate.document_type == normalized_type,
                PrintTemplate.is_active == True,  # noqa: E712
                PrintTemplate.scope_type == "GLOBAL",
                PrintTemplate.scope_ref_id.is_(None),
            )
            .order_by(PrintTemplate.is_default.desc(), PrintTemplate.id.desc())
        )
        return global_res.scalars().first()

    async def _clear_other_defaults(self, template: PrintTemplate) -> None:
        others_res = await self.db.execute(
            (
                select(PrintTemplate).where(
                    PrintTemplate.id != template.id,
                    PrintTemplate.document_type == template.document_type,
                    PrintTemplate.scope_type == template.scope_type,
                    PrintTemplate.scope_ref_id.is_(None)
                    if template.scope_ref_id is None
                    else PrintTemplate.scope_ref_id == template.scope_ref_id,
                    PrintTemplate.is_default == True,  # noqa: E712
                )
            )
        )
        others: Sequence[PrintTemplate] = others_res.scalars().all()
        for other in others:
            other.is_default = False

    async def _to_out(self, template: PrintTemplate) -> PrintTemplateOut:
        latest = await self.get_latest_version_model(template.id)
        return PrintTemplateOut(
            id=template.id,
            name=template.name,
            document_type=template.document_type,
            paper_code=template.paper_code,
            paper_width_mm=template.paper_width_mm,
            paper_height_mm=template.paper_height_mm,
            margin_top_mm=template.margin_top_mm,
            margin_right_mm=template.margin_right_mm,
            margin_bottom_mm=template.margin_bottom_mm,
            margin_left_mm=template.margin_left_mm,
            scope_type=template.scope_type,
            scope_ref_id=template.scope_ref_id,
            is_active=template.is_active,
            is_default=template.is_default,
            created_by=template.created_by,
            updated_by=template.updated_by,
            created_at=template.created_at,
            updated_at=template.updated_at,
            latest_version=latest,
        )

    async def _get_template_or_404(self, template_id: int) -> PrintTemplate:
        template = await self._get_template_or_none(template_id)
        if not template:
            raise HTTPException(status_code=404, detail="Plantilla no encontrada")
        return template

    async def _get_template_or_none(self, template_id: int) -> PrintTemplate | None:
        res = await self.db.execute(select(PrintTemplate).where(PrintTemplate.id == template_id))
        return res.scalar_one_or_none()

    def _invalidate_cache(self, document_type: str) -> None:
        normalized_type = (document_type or "").upper()
        keys_to_delete = [key for key in _ACTIVE_TEMPLATE_CACHE if key[0] == normalized_type]
        for key in keys_to_delete:
            _ACTIVE_TEMPLATE_CACHE.pop(key, None)

    @classmethod
    def clear_cache(cls) -> None:
        _ACTIVE_TEMPLATE_CACHE.clear()
