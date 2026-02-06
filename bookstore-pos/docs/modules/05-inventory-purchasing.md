# 05. Inventory & Purchasing

## Español
Responsabilidad:
- Control de stock, kardex, movimientos, compras, recepciones y pagos a proveedor.

Backend:
- `backend/app/routers/inventory/inventory.py`
- `backend/app/routers/inventory/purchases.py`
- `backend/app/routers/inventory/purchasing.py`
- `backend/app/routers/inventory/warehouses.py`

Frontend:
- `frontend/src/modules/inventory/`

Funciones principales:
- Movimientos de inventario IN/OUT/ADJ.
- Compras con recepción parcial.
- Exportes CSV.
- Gestión de almacenes y transferencias.

## English
Scope:
- Stock movement lifecycle and purchasing operations.

Key backend routers:
- `inventory.py`, `purchases.py`, `purchasing.py`, `warehouses.py`

Frontend module:
- `frontend/src/modules/inventory/`

Features:
- Inventory IN/OUT/ADJ movements.
- Purchase order and receiving workflows.
- CSV exports and warehouse operations.

## 日本語
責務:
- 在庫移動、仕入れ、入庫処理、倉庫管理。

主要ファイル:
- `backend/app/routers/inventory/inventory.py`
- `backend/app/routers/inventory/purchases.py`
- `backend/app/routers/inventory/purchasing.py`
- `backend/app/routers/inventory/warehouses.py`
- `frontend/src/modules/inventory/`

機能:
- IN/OUT/ADJ 在庫移動。
- 仕入れ/部分入庫。
- CSV 出力と倉庫運用。
