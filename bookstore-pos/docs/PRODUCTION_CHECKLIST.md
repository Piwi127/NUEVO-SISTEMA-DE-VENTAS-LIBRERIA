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
- Validar backup/restauracion.

## Usuario administrador
- Crear admin con:
  - `python ..\scripts\create_admin.py --username <usuario> --password "<password-seguro>"`
- Forzar cambio de clave inicial en operacion.

## Observabilidad
- Verificar `GET /metrics`.
- Si usas Docker local, levantar:
  - `monitoring_up_windows.bat`
- Confirmar dashboard `Bookstore API Overview` en Grafana.

## Preflight automatico
- Ejecutar:
  - `scripts\check_production_env.bat`
- Debe responder `[OK] Preflight de produccion superado.`
