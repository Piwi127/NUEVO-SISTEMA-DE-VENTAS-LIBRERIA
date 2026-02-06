# 06. Admin, Users & Role Permissions

## Español
Responsabilidad:
- Administración de usuarios, roles y permisos operativos.

Backend:
- `backend/app/routers/admin/users.py`
- `backend/app/routers/admin/permissions.py`
- `backend/app/routers/admin/audit.py`
- `backend/app/routers/admin/settings.py`

Frontend:
- `frontend/src/modules/admin/pages/AdminPanel.tsx`
- `frontend/src/modules/admin/pages/Users.tsx`
- `frontend/src/modules/admin/pages/RolePermissions.tsx`

Puntos clave:
- Permisos por rol en pestaña separada.
- Control de acceso por `ProtectedRoute` y `RoleGuard`.
- Auditoría de eventos administrativos.

## English
Scope:
- User administration, role-based permissions, and administrative auditing.

Core files:
- `backend/app/routers/admin/*.py`
- `frontend/src/modules/admin/pages/*`

Highlights:
- Dedicated role-permission tab.
- Route and component-level access guards.
- Audit visibility for critical admin actions.

## 日本語
責務:
- ユーザー管理、権限管理、管理操作監査。

主要ファイル:
- `backend/app/routers/admin/users.py`
- `backend/app/routers/admin/permissions.py`
- `backend/app/routers/admin/audit.py`
- `frontend/src/modules/admin/pages/RolePermissions.tsx`

ポイント:
- 役割別権限タブ。
- ルート/コンポーネントレベルのアクセス制御。
- 管理系操作の監査ログ確認。
