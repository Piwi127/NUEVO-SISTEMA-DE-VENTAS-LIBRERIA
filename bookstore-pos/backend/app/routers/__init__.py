from app.routers.auth import router as auth_router
from app.routers.admin import admin as admin_router
from app.routers.admin import permissions as permissions_router
from app.routers.admin import users as users_router
from app.routers.admin import audit as audit_router
from app.routers.admin import settings as settings_router
from app.routers.catalog import products as products_router
from app.routers.catalog import customers as customers_router
from app.routers.catalog import suppliers as suppliers_router
from app.routers.catalog import price_lists as price_lists_router
from app.routers.catalog import promotions as promotions_router
from app.routers.inventory import inventory as inventory_router
from app.routers.inventory import purchases as purchases_router
from app.routers.inventory import purchasing as purchasing_router
from app.routers.inventory import warehouses as warehouses_router
from app.routers.pos import cash as cash_router
from app.routers.pos import sales as sales_router
from app.routers.pos import returns as returns_router
from app.routers.pos import display_ws as display_ws_router
from app.routers.pos import printing as printing_router
from app.routers.reports import reports as reports_router

__all__ = [
    "auth_router",
    "admin_router",
    "permissions_router",
    "users_router",
    "audit_router",
    "settings_router",
    "products_router",
    "customers_router",
    "suppliers_router",
    "price_lists_router",
    "promotions_router",
    "inventory_router",
    "purchases_router",
    "purchasing_router",
    "warehouses_router",
    "cash_router",
    "sales_router",
    "returns_router",
    "display_ws_router",
    "printing_router",
    "reports_router",
]
