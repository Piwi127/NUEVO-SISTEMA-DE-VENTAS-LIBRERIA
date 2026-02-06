# E2E Automatizado (Playwright)

## Cobertura actual (Fase 2)
- Login UI.
- Flujo de caja: apertura/movimiento/arqueo Z e historial.
- Historial de ventas con comprobante visible tras venta creada por API.
- Acceso a pestaña de permisos por rol.

## Requisitos
- Python 3.11+
- Node 20+
- Dependencias instaladas en `backend` y `frontend`

## Ejecutar local
Desde `frontend`:

```powershell
npm run e2e
```

Variables opcionales:
- `E2E_USERNAME` (default: `e2e_admin`)
- `E2E_PASSWORD` (default: `E2EAdmin1234`)
- `E2E_FRONTEND_PORT` (default: `4173`)
- `E2E_BACKEND_PORT` (default: `8010`)
- `E2E_BASE_URL` (default: `http://127.0.0.1:4173`)
- `E2E_API_URL` (default: `http://127.0.0.1:8010`)

## Nota
El runner inicia backend y frontend automaticamente con `webServer` en `frontend/playwright.config.ts`.
