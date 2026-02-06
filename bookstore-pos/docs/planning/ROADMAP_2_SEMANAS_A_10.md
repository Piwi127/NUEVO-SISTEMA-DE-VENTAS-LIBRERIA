# Roadmap 2 Semanas (8.6 -> 10)

## Fase 1 (Dias 1-4): Quality Gate y estabilidad base
Objetivo: que ningun cambio rompa el sistema sin ser detectado.

Entregables:
- CI automatizado para backend y frontend.
- Script local en Windows para validacion integral en un clic.
- Criterio de aceptacion: backend tests pasando y frontend lint/test/build en cada PR.

Estado:
- [x] Workflow CI: `.github/workflows/quality-gate.yml`
- [x] Script local: `scripts/phase1_quality_check.bat`

## Fase 2 (Dias 5-9): Pruebas E2E de flujos criticos
Objetivo: validar comportamiento real de punta a punta.

Entregables:
- Suite E2E (Playwright) para:
  - apertura/cierre de caja con arqueo Z obligatorio
  - venta en POS
  - devolucion y validacion en historial
  - permisos por rol
- Criterio de aceptacion: flujos criticos en verde en CI.

Estado:
- [x] Base Playwright con `webServer` para backend/frontend.
- [x] Specs criticos (`caja`, `historial de ventas`, `permisos por rol`).
- [x] Integrado en CI (`quality-gate.yml`, job `e2e`).
- [x] Ejecucion local validada: `3 passed`.

## Fase 3 (Dias 10-14): Observabilidad, seguridad y cierre UX
Objetivo: dejar el sistema listo para operacion empresarial.

Entregables:
- Alertas de salud, errores y latencia.
- Fortalecimiento de seguridad operativa (hardening de auth y secretos).
- Pulido final UX/accesibilidad y checklist de salida a produccion.
- Criterio de aceptacion: checklist de produccion completo y evidencia de monitoreo activo.

Estado:
- [x] Endpoint de readiness `GET /health/ready`.
- [x] Rate limit dedicado para intentos de login.
- [x] Metrica de bloqueos por rate limit (`bookstore_rate_limit_blocked_total`).
- [x] Verificacion automatizada de backups (`scripts/verify_backup.py`, `.bat`).
- [x] Checklist de produccion actualizado.

---

## Como ejecutar Fase 1 localmente
Desde la raiz del proyecto:

```bat
scripts\phase1_quality_check.bat
```
