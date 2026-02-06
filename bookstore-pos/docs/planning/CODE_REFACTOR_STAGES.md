# Code Refactor Stages / Etapas / リファクタ段階

## Etapa 1 (aplicada)
Objetivo: ordenar sin riesgo funcional.
- Crear capa `frontend/src/app/` para componentes/store/utils compartidos.
- Mantener compatibilidad de imports actuales.
- Validar con `lint`, `test`, `build`.

Estado:
- Completada.

## Etapa 2 (siguiente)
Objetivo: reducir acoplamiento entre módulos.
- Migrar imports de `../components`, `../store`, `../utils` a `../app/...` por lotes.
- Consolidar APIs transversales en `modules/shared`.
- Añadir reglas de lint para prevenir nuevos imports legacy.

## Etapa 3
Objetivo: estructura por dominio limpia y estable.
- Frontend:
  - `app/` (shell, providers, global UI)
  - `domains/` o `modules/` (features por negocio)
  - `shared/` (tipos/utilidades transversales)
- Backend:
  - reforzar separación `routers -> services -> models/schemas`.
  - normalizar nombres y contratos por dominio.

## English
### Stage 1 (done)
- Introduced `frontend/src/app/` as a stable shared layer.
- Kept backward-compatible imports.
- Verified via lint/test/build.

### Stage 2 (next)
- Migrate legacy imports progressively to `app/...`.
- Consolidate cross-cutting APIs and enforce lint guardrails.

### Stage 3
- Final domain-driven source layout and stricter module boundaries.

## 日本語
### ステージ1（完了）
- `frontend/src/app/` 共通レイヤーを導入。
- 既存 import 互換を維持。
- lint/test/build で検証済み。

### ステージ2（次）
- 既存 import を段階的に `app/...` へ移行。
- 横断 API を整理し、lint で境界を強化。

### ステージ3
- ドメイン中心の最終構成とモジュール境界の厳格化。
