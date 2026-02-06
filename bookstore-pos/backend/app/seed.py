from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import get_password_hash, validate_password
from app.models.settings import SystemSettings
from app.models.warehouse import Warehouse
from app.models.permission import RolePermission
from app.models.user import User


def default_permissions_for(role: str) -> list[str]:
    if role == "admin":
        return ["*"]
    if role == "cashier":
        return [
            "sales.read",
            "sales.create",
            "returns.create",
            "cash.open",
            "cash.close",
            "cash.movement",
            "customers.read",
            "customers.write",
            "products.read",
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

    if settings.bootstrap_dev_admin and settings.environment.lower() not in {"prod", "production"}:
        username = settings.bootstrap_admin_username.strip()
        password = settings.bootstrap_admin_password
        if username and password:
            validate_password(password)
            user_res = await db.execute(select(User).where(User.username == username))
            user = user_res.scalar_one_or_none()
            password_hash = get_password_hash(password)
            if user:
                user.password_hash = password_hash
                user.role = "admin"
                user.is_active = True
            else:
                db.add(
                    User(
                        username=username,
                        password_hash=password_hash,
                        role="admin",
                        is_active=True,
                    )
                )
    await db.commit()
