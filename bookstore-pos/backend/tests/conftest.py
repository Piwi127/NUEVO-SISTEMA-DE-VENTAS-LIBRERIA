import os
import tempfile
import uuid

import pytest_asyncio
import httpx
from sqlalchemy import event
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

# Configurar JWT_SECRET antes de importar app (minimo 32 caracteres)
os.environ["JWT_SECRET"] = "test_secret_key_for_unit_tests_minimum_32_characters_long_secure"

from app.db.base import Base


@pytest_asyncio.fixture(scope="function")
async def test_app():
    from app.main import app
    import app.db.session as db_session
    import app.core.deps as deps
    import app.main as main
    import app.routers.pos.sales as sales
    from app.db import models as db_models  # noqa: F401
    from app.core.security import get_password_hash
    from app.models.user import User

    db_path = os.path.join(tempfile.gettempdir(), f"bookstore_test_{uuid.uuid4().hex}.db")

    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}", future=True)

    @event.listens_for(engine.sync_engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, _connection_record) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_sessionmaker(engine, expire_on_commit=False)() as session:
        session.add(
            User(
                username="admin",
                password_hash=get_password_hash("admin123"),
                role="admin",
                is_active=True,
            )
        )
        await session.commit()

    TestSessionLocal = async_sessionmaker(engine, expire_on_commit=False)
    db_session.AsyncSessionLocal = TestSessionLocal
    deps.AsyncSessionLocal = TestSessionLocal
    main.AsyncSessionLocal = TestSessionLocal
    sales.AsyncSessionLocal = TestSessionLocal

    yield app

    await engine.dispose()
    if os.path.exists(db_path):
        os.remove(db_path)


@pytest_asyncio.fixture(autouse=True)
async def reset_template_cache():
    from app.services.printing_templates.template_service import TemplateService

    TemplateService.clear_cache()
    yield
    TemplateService.clear_cache()


@pytest_asyncio.fixture(autouse=True)
async def reset_rate_limiter():
    from app.core.rate_limit import rate_limiter

    await rate_limiter.reset_for_tests()
    yield
    await rate_limiter.reset_for_tests()


@pytest_asyncio.fixture
async def client(test_app):
    async with test_app.router.lifespan_context(test_app):
        transport = httpx.ASGITransport(app=test_app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            yield client

