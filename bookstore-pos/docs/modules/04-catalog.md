# 04. Catalog (Products, Customers, Suppliers, Price Lists, Promotions)

## Español
Responsabilidad:
- Gestión de entidades comerciales del catálogo.

Backend:
- `backend/app/routers/catalog/products.py`
- `backend/app/routers/catalog/customers.py`
- `backend/app/routers/catalog/suppliers.py`
- `backend/app/routers/catalog/price_lists.py`
- `backend/app/routers/catalog/promotions.py`

Frontend:
- `frontend/src/modules/catalog/`

Incluye:
- CRUD de productos/clientes/proveedores.
- Listas de precio por cliente.
- Promociones aplicables al POS.
- Búsqueda por texto y filtros.

## English
Scope:
- Management of core commercial entities used by POS and operations.

Key API routers:
- `products.py`, `customers.py`, `suppliers.py`, `price_lists.py`, `promotions.py`

Frontend module:
- `frontend/src/modules/catalog/`

Capabilities:
- Full CRUD for product/customer/supplier.
- Price list assignment and retrieval.
- Promotion rules consumed by checkout flow.

## 日本語
責務:
- POS と運用で使用する商品/顧客/仕入先/価格/プロモーション管理。

主要 API:
- `backend/app/routers/catalog/products.py`
- `backend/app/routers/catalog/customers.py`
- `backend/app/routers/catalog/suppliers.py`
- `backend/app/routers/catalog/price_lists.py`
- `backend/app/routers/catalog/promotions.py`

主な機能:
- 各マスタの CRUD。
- 顧客別価格表。
- POS で適用されるプロモーション設定。
