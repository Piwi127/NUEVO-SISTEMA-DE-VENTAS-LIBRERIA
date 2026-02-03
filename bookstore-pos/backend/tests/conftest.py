import os
import tempfile
import asyncio

import pytest
import pytest_asyncio
import httpx
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.db.base import Base


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def test_app():
    from app.main import app
    import app.db.session as db_session
    import app.core.deps as deps
    import app.main as main
    import app.routers.sales as sales

    db_path = os.path.join(tempfile.gettempdir(), "bookstore_test.db")
    if os.path.exists(db_path):
        os.remove(db_path)

    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}", future=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    TestSessionLocal = async_sessionmaker(engine, expire_on_commit=False)
    db_session.AsyncSessionLocal = TestSessionLocal
    deps.AsyncSessionLocal = TestSessionLocal
    main.AsyncSessionLocal = TestSessionLocal
    sales.AsyncSessionLocal = TestSessionLocal

    yield app

    await engine.dispose()
    if os.path.exists(db_path):
        os.remove(db_path)


@pytest_asyncio.fixture
async def client(test_app):
    async with test_app.router.lifespan_context(test_app):
        transport = httpx.ASGITransport(app=test_app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            yield client
