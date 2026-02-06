# 08. Observability & DevOps

## Español
Responsabilidad:
- Salud operativa, métricas, alertas, pipeline de calidad y backups.

Componentes:
- Health: `/health`, `/healthz`, `/health/ready`
- Métricas: `/metrics`
- Monitor local: `monitoring/` (Prometheus + Grafana)
- CI: `.github/workflows/quality-gate.yml`
- Backups: `scripts/backup_db.bat`, `scripts/restore_db.bat`, `scripts/verify_backup.bat`

Checks recomendados:
- `backend`: `ruff`, `pytest`
- `frontend`: `lint`, `test`, `build`, `e2e`

## English
Scope:
- Runtime health, telemetry, quality gates, and backup verification.

Operational assets:
- Readiness and health endpoints.
- Prometheus metrics endpoint.
- Local monitoring stack.
- CI workflow with backend, frontend, and E2E jobs.
- Backup + restore + integrity verification scripts.

## 日本語
責務:
- 稼働監視、品質ゲート、バックアップ検証。

主な構成:
- ヘルス/レディネス: `/health`, `/healthz`, `/health/ready`
- メトリクス: `/metrics`
- 監視: `monitoring/` (Prometheus/Grafana)
- CI: `.github/workflows/quality-gate.yml`
- バックアップ検証: `scripts/verify_backup.bat`
