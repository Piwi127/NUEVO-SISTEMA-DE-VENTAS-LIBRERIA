from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PrintTemplateVersionOut(BaseModel):
    id: int
    template_id: int
    version: int
    template_schema: str = Field(validation_alias="schema_json", serialization_alias="schema_json")
    checksum: str
    is_published: bool
    created_by: int | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class PrintTemplateOut(BaseModel):
    id: int
    name: str
    document_type: str
    paper_code: str
    paper_width_mm: float
    paper_height_mm: float | None = None
    margin_top_mm: float
    margin_right_mm: float
    margin_bottom_mm: float
    margin_left_mm: float
    scope_type: str
    scope_ref_id: int | None = None
    is_active: bool
    is_default: bool
    created_by: int | None = None
    updated_by: int | None = None
    created_at: datetime
    updated_at: datetime
    latest_version: PrintTemplateVersionOut | None = None

    model_config = ConfigDict(from_attributes=True)


class PrintTemplateCreate(BaseModel):
    name: str
    document_type: str
    paper_code: str = "THERMAL_80"
    paper_width_mm: float = 80.0
    paper_height_mm: float | None = None
    margin_top_mm: float = 2.0
    margin_right_mm: float = 2.0
    margin_bottom_mm: float = 2.0
    margin_left_mm: float = 2.0
    scope_type: str = "GLOBAL"
    scope_ref_id: int | None = None
    is_active: bool = True
    is_default: bool = False
    template_schema: str = Field(validation_alias="schema_json", serialization_alias="schema_json")

    model_config = ConfigDict(populate_by_name=True)


class PrintTemplateUpdate(BaseModel):
    name: str
    paper_code: str
    paper_width_mm: float
    paper_height_mm: float | None = None
    margin_top_mm: float
    margin_right_mm: float
    margin_bottom_mm: float
    margin_left_mm: float
    scope_type: str
    scope_ref_id: int | None = None
    is_active: bool
    is_default: bool
    template_schema: str = Field(validation_alias="schema_json", serialization_alias="schema_json")

    model_config = ConfigDict(populate_by_name=True)


class PrintTemplatePreviewIn(BaseModel):
    document_type: str
    template_schema: str = Field(validation_alias="schema_json", serialization_alias="schema_json")
    sale_id: int | None = None

    model_config = ConfigDict(populate_by_name=True)


class PrintTemplatePreviewOut(BaseModel):
    html: str
    text: str
    warnings: list[str] = Field(default_factory=list)


class PrintTemplateDuplicateIn(BaseModel):
    name: str | None = None


class SaleDocumentRenderOut(BaseModel):
    sale_id: int
    document_type: str
    document_number: str
    html: str
    text: str
