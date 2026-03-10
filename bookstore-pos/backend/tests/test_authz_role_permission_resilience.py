import pytest
from sqlalchemy import delete, func

import app.db.session as db_session
from app.core.security import get_password_hash
from app.models.permission import RolePermission
from app.models.user import User


async def _login(client, username: str, password: str):
    response = await client.post("/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200
    csrf = response.cookies.get("csrf_token")
    assert csrf
    return {"X-CSRF-Token": csrf}


async def _create_user(username: str, role: str, password: str = "Cashier123A"):
    async with db_session.AsyncSessionLocal() as session:
        session.add(
            User(
                username=username,
                password_hash=get_password_hash(password),
                role=role,
                is_active=True,
            )
        )
        await session.commit()


@pytest.mark.asyncio
async def test_customers_access_accepts_role_with_spaces_and_case(client):
    await _create_user("cashier_mixed_case", "  CaShIeR  ")
    headers = await _login(client, "cashier_mixed_case", "Cashier123A")

    customers = await client.get("/customers", headers=headers)
    assert customers.status_code == 200


@pytest.mark.asyncio
async def test_cashier_uses_default_permissions_when_table_is_empty(client):
    await _create_user("cashier_without_rows", "cashier")

    async with db_session.AsyncSessionLocal() as session:
        await session.execute(
            delete(RolePermission).where(func.lower(func.trim(RolePermission.role)) == "cashier")
        )
        await session.commit()

    headers = await _login(client, "cashier_without_rows", "Cashier123A")

    customers = await client.get("/customers", headers=headers)
    assert customers.status_code == 200

    users = await client.get("/users", headers=headers)
    assert users.status_code == 403

