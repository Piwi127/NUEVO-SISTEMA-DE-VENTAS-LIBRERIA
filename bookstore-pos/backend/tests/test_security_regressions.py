from types import SimpleNamespace

import pytest
from sqlalchemy import select

import app.db.session as db_session
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import User
from app.seed import seed_admin
from app.services.admin.users_service import UsersService


async def _login_admin(client):
    resp = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    assert resp.status_code == 200
    csrf = resp.cookies.get("csrf_token")
    assert csrf
    return csrf


@pytest.mark.asyncio
async def test_logout_requires_csrf_header(client):
    csrf = await _login_admin(client)

    blocked = await client.post("/auth/logout")
    assert blocked.status_code == 403
    assert "CSRF" in blocked.text

    allowed = await client.post("/auth/logout", headers={"X-CSRF-Token": csrf})
    assert allowed.status_code == 200
    assert allowed.json() == {"ok": True}


@pytest.mark.asyncio
async def test_service_transaction_commits_after_autobegin_reads(test_app):
    async with db_session.AsyncSessionLocal() as session:
        admin = (await session.execute(select(User).where(User.username == "admin"))).scalar_one()
        service = UsersService(session, admin)

        created = await service.create_user(
            SimpleNamespace(
                username="autobegin_tx_user",
                password="Autobegin123",
                role="cashier",
                is_active=True,
            )
        )

        assert created.id is not None

    async with db_session.AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.username == "autobegin_tx_user"))
        persisted = result.scalar_one_or_none()
        assert persisted is not None
        assert persisted.role == "cashier"

@pytest.mark.asyncio
async def test_nested_service_transactions_do_not_commit_outer_transaction(test_app):
    async with db_session.AsyncSessionLocal() as session:
        try:
            async with session.begin():
                admin = (await session.execute(select(User).where(User.username == "admin"))).scalar_one()
                service = UsersService(session, admin)
                await service.create_user(
                    SimpleNamespace(
                        username="nested_tx_user",
                        password="NestedTx123",
                        role="cashier",
                        is_active=True,
                    )
                )
                raise RuntimeError("force rollback")
        except RuntimeError:
            pass

        result = await session.execute(select(User).where(User.username == "nested_tx_user"))
        assert result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_bootstrap_seed_does_not_reset_existing_user(test_app):
    username = "seed_guard_user"
    original_hash = get_password_hash("Original123A")
    original_settings = (
        settings.bootstrap_dev_admin,
        settings.bootstrap_admin_username,
        settings.bootstrap_admin_password,
        settings.environment,
    )

    try:
        async with db_session.AsyncSessionLocal() as session:
            session.add(
                User(
                    username=username,
                    password_hash=original_hash,
                    role="cashier",
                    is_active=False,
                )
            )
            await session.commit()

            settings.bootstrap_dev_admin = True
            settings.bootstrap_admin_username = username
            settings.bootstrap_admin_password = "Bootstrap123A"
            settings.environment = "dev"

            await seed_admin(session)

            user = (await session.execute(select(User).where(User.username == username))).scalar_one()
            assert user.password_hash == original_hash
            assert user.role == "cashier"
            assert user.is_active is False
    finally:
        (
            settings.bootstrap_dev_admin,
            settings.bootstrap_admin_username,
            settings.bootstrap_admin_password,
            settings.environment,
        ) = original_settings
