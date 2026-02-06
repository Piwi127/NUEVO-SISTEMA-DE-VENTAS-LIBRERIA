# 02. POS & Sales

## Español
Responsabilidad:
- Flujo de venta, carrito, pagos, ticket/comprobante y display en tiempo real.

Backend clave:
- `backend/app/routers/pos/sales.py`
- `backend/app/routers/pos/printing.py`
- `backend/app/routers/pos/display_ws.py`
- `backend/app/services/pos/sales_service.py`

Frontend clave:
- `frontend/src/modules/pos/pages/POS.tsx`
- `frontend/src/modules/pos/components/ProductSearch.tsx`
- `frontend/src/modules/pos/components/Cart.tsx`
- `frontend/src/modules/pos/components/PaymentDialog.tsx`
- `frontend/src/modules/pos/pages/SalesHistory.tsx`

Funciones:
- Venta con múltiples medios de pago.
- Historial de ventas con filtros y comprobante clickable.
- Descarga de ticket ESC/POS.
- Búsqueda avanzada de productos (SKU, nombre, categoría, términos relacionados).

## English
Scope:
- Sales checkout flow, cart, payments, receipts, and customer display updates.

Key files:
- `backend/app/routers/pos/sales.py`
- `backend/app/routers/pos/printing.py`
- `backend/app/routers/pos/display_ws.py`
- `frontend/src/modules/pos/pages/POS.tsx`
- `frontend/src/modules/pos/pages/SalesHistory.tsx`

Features:
- Multi-method payment handling.
- Sales history with filters and clickable receipt number.
- ESC/POS binary download.
- Advanced product search with semantic term expansion.

## 日本語
責務:
- 販売フロー、カート、支払い、レシート、表示連携。

主要ファイル:
- `backend/app/routers/pos/sales.py`
- `backend/app/routers/pos/printing.py`
- `backend/app/routers/pos/display_ws.py`
- `frontend/src/modules/pos/pages/POS.tsx`
- `frontend/src/modules/pos/pages/SalesHistory.tsx`

機能:
- 複数支払い方法対応。
- フィルタ付き売上履歴とクリック可能な伝票番号。
- ESC/POS ダウンロード。
- SKU/名称/カテゴリ/関連語による高度検索。
