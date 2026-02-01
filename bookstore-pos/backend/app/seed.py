from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.models.user import User
from app.models.settings import SystemSettings
from app.models.permission import RolePermission


def default_permissions_for(role: str) -> list[str]:
    if role == "admin":
        return ["*"]
    if role == "cashier":
        return [
            "sales.create",
            "cash.open",
            "cash.close",
            "cash.movement",
            "customers.read",
            "customers.write",
            "products.read",
        ]
    if role == "stock":
        return [
            "products.write",
            "inventory.write",
            "inventory.read",
            "purchases.create",
            "suppliers.write",
        ]
    return []


async def seed_admin(db: AsyncSession) -> None:
    result = await db.execute(select(User).where(User.username == "admin"))
    if not result.scalar():
        admin = User(
            username="admin",
            password_hash=get_password_hash("admin123"),
            role="admin",
            is_active=True,
        )
        db.add(admin)
        await db.commit()

    settings_result = await db.execute(select(SystemSettings).limit(1))
    if not settings_result.scalar():
        settings = SystemSettings(
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
        )
        db.add(settings)
        await db.commit()

    for role in ["admin", "cashier", "stock"]:
        res = await db.execute(select(RolePermission).where(RolePermission.role == role).limit(1))
        if res.scalar():
            continue
        for perm in default_permissions_for(role):
            db.add(RolePermission(role=role, permission=perm))
    await db.commit()
