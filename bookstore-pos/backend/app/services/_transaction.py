from contextlib import asynccontextmanager
from contextvars import ContextVar
from typing import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession


_service_transaction_depth: ContextVar[int] = ContextVar("service_transaction_depth", default=0)


def _transaction_origin_name(db: AsyncSession) -> str | None:
    transaction = db.get_transaction()
    if transaction is None:
        return None

    origin = getattr(transaction, "origin", None)
    if origin is None:
        origin = getattr(getattr(transaction, "sync_transaction", None), "origin", None)
    if origin is None:
        return None

    return getattr(origin, "name", str(origin).rsplit(".", 1)[-1])


@asynccontextmanager
async def service_transaction(db: AsyncSession) -> AsyncIterator[None]:
    # Services may enter here after a preflight SELECT, which starts an AUTOBEGIN transaction.
    # In that case the service still owns the root transaction and must commit it itself.
    depth = _service_transaction_depth.get()
    owns_autobegin = depth == 0 and db.in_transaction() and _transaction_origin_name(db) == "AUTOBEGIN"
    token = _service_transaction_depth.set(depth + 1)

    try:
        if owns_autobegin:
            try:
                yield
                await db.commit()
            except Exception:
                await db.rollback()
                raise
            return

        if db.in_transaction():
            yield
            return

        async with db.begin():
            yield
    finally:
        _service_transaction_depth.reset(token)
