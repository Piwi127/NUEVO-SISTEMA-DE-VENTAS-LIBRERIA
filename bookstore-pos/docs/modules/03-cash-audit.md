# 03. Cash & Audit

## Español
Responsabilidad:
- Apertura/cierre de caja, movimientos IN/OUT, arqueos X/Z y reporte de sesión.

Backend clave:
- `backend/app/routers/pos/cash.py`
- `backend/app/services/pos/cash_service.py`
- `backend/app/models/cash.py`

Frontend clave:
- `frontend/src/modules/pos/components/CashPanel.tsx`
- `frontend/src/modules/pos/api/cash.ts`

Reglas críticas:
- No se permite cerrar caja sin arqueo tipo Z válido.
- Historial de arqueos con reporte por sesión (vista + descarga).
- Validación de diferencias y estado de balance final.

## English
Scope:
- Cash open/close lifecycle, manual movements, X/Z audits, and session reporting.

Core files:
- `backend/app/routers/pos/cash.py`
- `backend/app/services/pos/cash_service.py`
- `frontend/src/modules/pos/components/CashPanel.tsx`

Critical rules:
- Cash cannot close without a valid Z audit.
- Session report includes movements, audits, and validation notes.
- Audit history supports report view/download.

## 日本語
責務:
- レジ開閉、IN/OUT 移動、X/Z 監査、セッションレポート。

主要ファイル:
- `backend/app/routers/pos/cash.py`
- `backend/app/services/pos/cash_service.py`
- `frontend/src/modules/pos/components/CashPanel.tsx`

重要ルール:
- 有効な Z 監査なしで閉店不可。
- セッションレポートに移動・監査・検証結果を記録。
- 監査履歴から閲覧/ダウンロード可能。
