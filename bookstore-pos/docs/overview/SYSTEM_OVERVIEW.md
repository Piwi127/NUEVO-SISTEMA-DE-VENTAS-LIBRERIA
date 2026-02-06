# System Overview / Resumen / システム概要

## Español
Bookstore POS está compuesto por:
- Backend FastAPI (`backend/app`) con capas de `routers`, `services`, `models`, `schemas`.
- Frontend React + Vite (`frontend/src`) con módulos funcionales (`auth`, `pos`, `catalog`, `inventory`, `admin`, `reports`).
- DB SQLite (dev) con Alembic (`backend/alembic`).
- Observabilidad con métricas Prometheus (`/metrics`) y stack local en `monitoring/`.

Flujo base:
1. Usuario inicia sesión (`/auth/login`).
2. Frontend usa cookies + CSRF para mutaciones.
3. Módulos consumen API por permisos/rol.
4. Eventos críticos se registran en auditoría y métricas.

## English
Bookstore POS consists of:
- FastAPI backend (`backend/app`) layered as `routers`, `services`, `models`, `schemas`.
- React + Vite frontend (`frontend/src`) organized by functional modules.
- SQLite database in dev with Alembic migrations.
- Prometheus metrics and local monitoring stack in `monitoring/`.

Base flow:
1. User logs in (`/auth/login`).
2. Frontend uses cookie auth + CSRF for write operations.
3. Modules consume API endpoints based on role/permissions.
4. Critical actions are logged via audit and metrics.

## 日本語
Bookstore POS の構成:
- FastAPI バックエンド (`backend/app`): `routers`, `services`, `models`, `schemas` 構成。
- React + Vite フロントエンド (`frontend/src`): 機能別モジュール構成。
- 開発用 DB は SQLite、マイグレーションは Alembic。
- 監視は Prometheus メトリクスと `monitoring/` のローカルスタック。

基本フロー:
1. ユーザーが `/auth/login` でログイン。
2. フロントは Cookie 認証 + CSRF で更新系 API を実行。
3. ロール/権限に応じてモジュール機能を提供。
4. 重要操作は監査ログとメトリクスに記録。
