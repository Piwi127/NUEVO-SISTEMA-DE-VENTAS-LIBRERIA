# 01. Auth & Security

## Español
Responsabilidad:
- Login/logout, sesión, 2FA, CSRF y control de headers de seguridad.

Backend clave:
- `backend/app/routers/auth/__init__.py`
- `backend/app/services/auth/auth_service.py`
- `backend/app/core/security.py`
- `backend/app/main.py` (middlewares y validaciones de seguridad)

Frontend clave:
- `frontend/src/modules/auth/pages/Login.tsx`
- `frontend/src/auth/AuthProvider.tsx`

Endpoints:
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/2fa/setup`
- `POST /auth/2fa/confirm`

Controles activos:
- Rate limit global y específico de login.
- Bloqueo temporal por intentos fallidos.
- Cookies seguras + header CSRF para métodos mutadores.
- Request ID y cabeceras de seguridad.

## English
Scope:
- Login/logout, sessions, 2FA, CSRF, and security headers.

Core files:
- `backend/app/routers/auth/__init__.py`
- `backend/app/services/auth/auth_service.py`
- `backend/app/core/security.py`
- `backend/app/main.py`
- `frontend/src/modules/auth/pages/Login.tsx`

Main endpoints:
- `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`
- `POST /auth/2fa/setup`, `POST /auth/2fa/confirm`

Security controls:
- Global and login-specific rate limiting.
- Temporary lockout after failed attempts.
- Cookie auth + CSRF validation.
- Request ID and response hardening headers.

## 日本語
責務:
- ログイン/ログアウト、セッション、2FA、CSRF、セキュリティヘッダー。

主要ファイル:
- `backend/app/routers/auth/__init__.py`
- `backend/app/services/auth/auth_service.py`
- `backend/app/core/security.py`
- `backend/app/main.py`
- `frontend/src/modules/auth/pages/Login.tsx`

主要エンドポイント:
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/2fa/setup`
- `POST /auth/2fa/confirm`

セキュリティ制御:
- 全体とログイン専用のレート制限。
- 連続失敗時の一時ロック。
- Cookie 認証 + CSRF 検証。
- Request ID と各種セキュリティヘッダー。
