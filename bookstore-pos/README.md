# Bookstore POS

Sistema POS para librería con backend en FastAPI y frontend en React/Vite.

## Inicio rápido
- Backend: `backend/README.md`
- Frontend: `frontend/README.md`
- Guía general y módulos: `docs/README.md`

## Estructura principal
- `backend/`: API, dominio, servicios y migraciones.
- `frontend/`: interfaz web POS y paneles administrativos.
- `docs/`: documentación funcional, técnica y operativa.
- `scripts/`: utilidades de operación (admin, backup, validación).
- `monitoring/`: Prometheus + Grafana para observabilidad local.

## Calidad
- CI: `.github/workflows/quality-gate.yml`
- Backend checks: `ruff`, `pytest`
- Frontend checks: `lint`, `test`, `build`
- E2E: Playwright (`frontend/e2e`)
