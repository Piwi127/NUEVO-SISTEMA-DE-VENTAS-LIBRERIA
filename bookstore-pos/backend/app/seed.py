from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import get_password_hash, validate_password
from app.models.document_sequence import DocumentSequence
from app.models.print_template import PrintTemplate, PrintTemplateVersion
from app.models.settings import SystemSettings
from app.models.warehouse import Warehouse
from app.models.permission import RolePermission
from app.models.user import User
from app.services.printing_templates.default_templates import default_template_schema


def default_permissions_for(role: str) -> list[str]:
    if role == "admin":
        return ["*"]
    if role == "cashier":
        return [
            "returns.read",
            "sales.read",
            "sales.create",
            "returns.create",
            "cash.open",
            "cash.close",
            "cash.movement",
            "customers.read",
            "customers.write",
            "products.read",
            "printing.documents.read",
        ]
    if role == "stock":
        return [
            "products.read",
            "products.write",
            "inventory.write",
            "inventory.read",
            "purchases.read",
            "purchases.create",
            "suppliers.read",
            "suppliers.write",
        ]
    return []


async def seed_admin(db: AsyncSession) -> None:
    settings_result = await db.execute(select(SystemSettings).limit(1))
    sys_settings = settings_result.scalar_one_or_none()
    if not sys_settings:
        sys_settings = SystemSettings(
            project_name="Bookstore POS",
            currency="PEN",
            tax_rate=0.0,
            tax_included=False,
            store_address="",
            store_phone="",
            store_tax_id="",
            logo_url="",
            payment_methods="CASH,CARD,TRANSFER",
            invoice_prefix="B001",
            invoice_next=1,
            receipt_header="",
            receipt_footer="Gracias por su compra",
            paper_width_mm=80,
            print_templates_enabled=False,
            default_warehouse_id=None,
        )
        db.add(sys_settings)
        await db.commit()

    # Ensure default warehouse exists
    wh_result = await db.execute(select(Warehouse).order_by(Warehouse.id))
    warehouse = wh_result.scalars().first()
    if not warehouse:
        warehouse = Warehouse(name="Almacen Principal", location="")
        db.add(warehouse)
        await db.commit()
        await db.refresh(warehouse)
    if sys_settings and not sys_settings.default_warehouse_id:
        sys_settings.default_warehouse_id = warehouse.id
        await db.commit()

    for role in ["admin", "cashier", "stock"]:
        res = await db.execute(select(RolePermission.permission).where(RolePermission.role == role))
        existing = {row[0] for row in res.all()}
        for perm in default_permissions_for(role):
            if perm not in existing:
                db.add(RolePermission(role=role, permission=perm))

    # Ensure template/printing permissions are available for manual role assignment UI.
    extra_perms = {"print_templates.read", "print_templates.write", "printing.documents.read"}
    for role in ["cashier", "stock"]:
        if role == "cashier":
            allowed = {"printing.documents.read"}
        else:
            allowed = set()
        if not allowed:
            continue
        res = await db.execute(select(RolePermission.permission).where(RolePermission.role == role))
        existing = {row[0] for row in res.all()}
        for perm in sorted(extra_perms & allowed):
            if perm not in existing:
                db.add(RolePermission(role=role, permission=perm))

    seq_res = await db.execute(select(DocumentSequence))
    if not seq_res.scalars().first():
        db.add(
            DocumentSequence(
                document_type="TICKET",
                series="T001",
                next_number=1,
                number_padding=6,
                is_active=True,
                scope_type="GLOBAL",
                scope_ref_id=None,
            )
        )
        db.add(
            DocumentSequence(
                document_type="BOLETA",
                series="B001",
                next_number=1,
                number_padding=6,
                is_active=True,
                scope_type="GLOBAL",
                scope_ref_id=None,
            )
        )
        db.add(
            DocumentSequence(
                document_type="FACTURA",
                series="F001",
                next_number=1,
                number_padding=6,
                is_active=True,
                scope_type="GLOBAL",
                scope_ref_id=None,
            )
        )

    tpl_res = await db.execute(select(PrintTemplate))
    if not tpl_res.scalars().first():
        ticket_tpl = PrintTemplate(
            name="Ticket Termico 80mm",
            document_type="TICKET",
            paper_code="THERMAL_80",
            paper_width_mm=80.0,
            paper_height_mm=None,
            margin_top_mm=2,
            margin_right_mm=2,
            margin_bottom_mm=2,
            margin_left_mm=2,
            scope_type="GLOBAL",
            scope_ref_id=None,
            is_active=True,
            is_default=True,
        )
        boleta_tpl = PrintTemplate(
            name="Boleta A4",
            document_type="BOLETA",
            paper_code="A4",
            paper_width_mm=210.0,
            paper_height_mm=297.0,
            margin_top_mm=8,
            margin_right_mm=8,
            margin_bottom_mm=8,
            margin_left_mm=8,
            scope_type="GLOBAL",
            scope_ref_id=None,
            is_active=True,
            is_default=True,
        )
        factura_tpl = PrintTemplate(
            name="Factura A4",
            document_type="FACTURA",
            paper_code="A4",
            paper_width_mm=210.0,
            paper_height_mm=297.0,
            margin_top_mm=8,
            margin_right_mm=8,
            margin_bottom_mm=8,
            margin_left_mm=8,
            scope_type="GLOBAL",
            scope_ref_id=None,
            is_active=True,
            is_default=True,
        )
        db.add(ticket_tpl)
        db.add(boleta_tpl)
        db.add(factura_tpl)
        await db.flush()

        for template in [ticket_tpl, boleta_tpl, factura_tpl]:
            schema = default_template_schema(template.document_type, template.paper_code)
            db.add(
                PrintTemplateVersion(
                    template_id=template.id,
                    version=1,
                    schema_json=schema,
                    checksum="",
                    is_published=True,
                    created_by=None,
                )
            )

    if settings.bootstrap_dev_admin and settings.environment.lower() not in {"prod", "production"}:
        raw_usernames = settings.bootstrap_admin_usernames.strip()
        password = settings.bootstrap_admin_password
        usernames = [
            username.strip()
            for username in raw_usernames.split(",")
            if username.strip()
        ] if raw_usernames else [settings.bootstrap_admin_username.strip()]
        usernames = list(dict.fromkeys([username for username in usernames if username]))
        if usernames and password:
            validate_password(password)
            for username in usernames:
                user_res = await db.execute(select(User).where(User.username == username))
                user = user_res.scalar_one_or_none()
                if user is None:
                    db.add(
                        User(
                            username=username,
                            password_hash=get_password_hash(password),
                            role="admin",
                            is_active=True,
                        )
                    )
    await db.commit()
