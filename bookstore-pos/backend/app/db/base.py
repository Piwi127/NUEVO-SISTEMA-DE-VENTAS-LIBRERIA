from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Import models for Alembic
from app.models.user import User  # noqa: E402,F401
from app.models.product import Product  # noqa: E402,F401
from app.models.customer import Customer  # noqa: E402,F401
from app.models.supplier import Supplier  # noqa: E402,F401
from app.models.sale import Sale, SaleItem, Payment  # noqa: E402,F401
from app.models.cash import CashSession, CashMovement, CashAudit  # noqa: E402,F401
from app.models.inventory import StockMovement  # noqa: E402,F401
from app.models.purchase import Purchase, PurchaseItem  # noqa: E402,F401
from app.models.settings import SystemSettings  # noqa: E402,F401
from app.models.permission import RolePermission  # noqa: E402,F401
from app.models.audit import AuditLog  # noqa: E402,F401
from app.models.warehouse import Warehouse, StockLevel, StockBatch, StockTransfer, StockTransferItem, InventoryCount  # noqa: E402,F401
from app.models.price_list import PriceList, PriceListItem  # noqa: E402,F401
from app.models.promotion import Promotion  # noqa: E402,F401
from app.models.sale_return import SaleReturn, SaleReturnItem  # noqa: E402,F401
from app.models.purchasing import PurchaseOrder, PurchaseOrderItem, SupplierPayment  # noqa: E402,F401
