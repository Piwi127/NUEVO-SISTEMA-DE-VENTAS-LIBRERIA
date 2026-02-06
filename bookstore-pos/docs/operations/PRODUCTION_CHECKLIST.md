# Production Checklist

## Seguridad
- Definir `JWT_SECRET` fuerte (no usar valores por defecto).
- Configurar `COOKIE_SECURE=true`.
- Configurar `COOKIE_SAMESITE` (`lax` o `strict` recomendado).
- Configurar `COOKIE_DOMAIN` segun dominio real.
- Definir `TWOFA_ENCRYPTION_KEY`.
- Configurar `CORS_ORIGINS` sin `localhost` ni `127.0.0.1`.

## Base de datos y migraciones
- Ejecutar `alembic upgrade head`.
- Crear backup: `scripts\backup_db.bat`
- Restaurar backup: `scripts\restore_db.bat "RUTA\backup.db"`
- Validar backup/restauracion en entorno de prueba.
- Verificar integridad backup: `scripts\verify_backup.bat "RUTA\backup.db"`

## Usuario administrador
- Crear admin con:
  - `python ..\scripts\create_admin.py --username <usuario> --password "<password-seguro>"`
- Forzar cambio de clave inicial en operacion.

## Observabilidad
- Verificar `GET /metrics`.
- Verificar `GET /health/ready` responde `200` y `database: ok`.
- Si usas Docker local, levantar:
  - `monitoring_up_windows.bat`
- Confirmar dashboard `Bookstore API Overview` en Grafana.
- Revisar alertas en Prometheus: `BookstoreApiDown`, `BookstoreHighErrorRate`, `BookstoreHighLatencyP95`.

## Preflight automatico
- Ejecutar:
  - `scripts\check_production_env.bat`
- Debe responder `[OK] Preflight de produccion superado.`

## QA de regresion
- Ejecutar backend:
  - `.venv\Scripts\python.exe -m pytest -q`
- Ejecutar frontend:
  - `npm run lint`
  - `npm run test`
  - `npm run build`
- Ejecutar E2E:
  - `npm run e2e` (desde `frontend`)
