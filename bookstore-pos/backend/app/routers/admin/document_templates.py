"""
Router de plantillas de impresión.
Endpoints: GET/POST /document-templates, PUT/DELETE /document-templates/{id}, POST /document-templates/{id}/duplicate
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db, require_permission, require_role
from app.schemas.document_template import (
    PrintTemplateCreate,
    PrintTemplateDuplicateIn,
    PrintTemplateOut,
    PrintTemplatePreviewIn,
    PrintTemplatePreviewOut,
)
from app.schemas.document_template import PrintTemplateUpdate
from app.services.printing_templates import DocumentRenderService, TemplateService

router = APIRouter(
    prefix="/document-templates",
    tags=["document-templates"],
    dependencies=[Depends(require_role("admin"))],
)


@router.get(
    "",
    response_model=list[PrintTemplateOut],
    dependencies=[Depends(require_permission("print_templates.read"))],
)
async def list_templates(
    document_type: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    service = TemplateService(db)
    return await service.list_templates(document_type=document_type)


@router.get(
    "/{template_id}",
    response_model=PrintTemplateOut,
    dependencies=[Depends(require_permission("print_templates.read"))],
)
async def get_template(template_id: int, db: AsyncSession = Depends(get_db)):
    service = TemplateService(db)
    return await service.get_template(template_id)


@router.post(
    "",
    response_model=PrintTemplateOut,
    status_code=201,
    dependencies=[Depends(require_permission("print_templates.write"))],
)
async def create_template(
    data: PrintTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = TemplateService(db)
    return await service.create_template(
        data, user_id=current_user.id if current_user else None
    )


@router.put(
    "/{template_id}",
    response_model=PrintTemplateOut,
    dependencies=[Depends(require_permission("print_templates.write"))],
)
async def update_template(
    template_id: int,
    data: PrintTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = TemplateService(db)
    return await service.update_template(
        template_id, data, user_id=current_user.id if current_user else None
    )


@router.delete(
    "/{template_id}",
    dependencies=[Depends(require_permission("print_templates.write"))],
)
async def delete_template(template_id: int, db: AsyncSession = Depends(get_db)):
    service = TemplateService(db)
    return await service.soft_delete_template(template_id)


@router.post(
    "/{template_id}/duplicate",
    response_model=PrintTemplateOut,
    status_code=201,
    dependencies=[Depends(require_permission("print_templates.write"))],
)
async def duplicate_template(
    template_id: int,
    data: PrintTemplateDuplicateIn,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = TemplateService(db)
    return await service.duplicate_template(
        template_id, data.name, user_id=current_user.id if current_user else None
    )


@router.post(
    "/{template_id}/set-default",
    response_model=PrintTemplateOut,
    dependencies=[Depends(require_permission("print_templates.write"))],
)
async def set_default_template(template_id: int, db: AsyncSession = Depends(get_db)):
    service = TemplateService(db)
    return await service.set_default(template_id)


@router.post(
    "/{template_id}/restore-default",
    response_model=PrintTemplateOut,
    dependencies=[Depends(require_permission("print_templates.write"))],
)
async def restore_default_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = TemplateService(db)
    return await service.restore_default(
        template_id, user_id=current_user.id if current_user else None
    )


@router.post(
    "/preview",
    response_model=PrintTemplatePreviewOut,
    dependencies=[Depends(require_permission("print_templates.read"))],
)
async def preview_template(
    data: PrintTemplatePreviewIn, db: AsyncSession = Depends(get_db)
):
    render_service = DocumentRenderService(db)
    if data.sale_id:
        context = await render_service.build_sale_context(data.sale_id)
    else:
        context = {
            "company_name": "Bookstore POS",
            "document_number": "T001-000001",
            "issue_date": "2026-01-01T10:00:00Z",
            "subtotal": 10.0,
            "tax": 1.8,
            "discount": 0.0,
            "total": 11.8,
            "receipt_footer": "Gracias por su compra",
            "items": [
                {
                    "name": "Producto Demo",
                    "qty": 2,
                    "unit_price": 5.0,
                    "line_total": 10.0,
                },
            ],
        }
    try:
        html, text, warnings = render_service.render(data.template_schema, context)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=422, detail=f"No se pudo renderizar preview: {exc}"
        ) from exc
    return PrintTemplatePreviewOut(html=html, text=text, warnings=warnings)
