from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import (
    auth,
    users,
    products,
    customers,
    suppliers,
    inventory,
    cash,
    sales,
    purchases,
    reports,
    display_ws,
    settings as settings_router,
    admin,
    permissions,
    audit,
    warehouses,
    price_lists,
    promotions,
    returns,
    purchasing,
    printing,
)
from app.seed import seed_admin
from app.db.session import AsyncSessionLocal


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with AsyncSessionLocal() as session:
        await seed_admin(session)
    yield


app = FastAPI(title="Bookstore POS API", lifespan=lifespan)

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
origin_regex = r"^https?://(localhost|127\\.0\\.0\\.1)(:\\d+)?$"
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_origin_regex=origin_regex,
    allow_credentials=True,
    allow_methods=["*"] ,
    allow_headers=["*"] ,
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(products.router)
app.include_router(customers.router)
app.include_router(suppliers.router)
app.include_router(inventory.router)
app.include_router(cash.router)
app.include_router(sales.router)
app.include_router(purchases.router)
app.include_router(reports.router)
app.include_router(display_ws.router)
app.include_router(settings_router.router)
app.include_router(admin.router)
app.include_router(permissions.router)
app.include_router(audit.router)
app.include_router(warehouses.router)
app.include_router(price_lists.router)
app.include_router(promotions.router)
app.include_router(returns.router)
app.include_router(purchasing.router)
app.include_router(printing.router)


@app.get("/")
async def root():
    return {"status": "ok"}
