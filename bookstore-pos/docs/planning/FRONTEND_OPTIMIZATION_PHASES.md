# Frontend Optimization Phases

## Phase 1: Alias-first imports
- Status: Done.
- Enforced in ESLint to avoid long relative imports and cross-folder `../*` imports.

## Phase 2: Domain folder discipline
- Status: Done.
- `hooks/` and `types/` folders were added to modules, starting with POS hooks and module-level type barrels.

## Phase 3: Extract business logic from pages/components
- Status: Done.
- Extracted POS logic to:
  - `frontend/src/modules/pos/hooks/usePosPricing.ts`
  - `frontend/src/modules/pos/hooks/usePosCheckout.ts`
- Extracted Cash logic to:
  - `frontend/src/modules/pos/hooks/useCashOperations.ts`

## Phase 4: Centralize DTO/domain types
- Status: Done.
- POS payment/totals moved to `frontend/src/modules/pos/types/index.ts`.
- Module type barrels added for admin/auth/catalog/inventory/reports.

## Phase 5: Unified HTTP client
- Status: Done (already established).
- Shared API client remains centralized in:
  - `frontend/src/modules/shared/api/client.ts`

## Phase 6: Selector layer for stores
- Status: Done.
- Added selectors:
  - `frontend/src/app/store/selectors.ts`

## Phase 7: Naming standards
- Status: Applied.
- New files follow consistent naming by concern (`use*.ts`, `index.ts`, `types/index.ts`).

## Phase 8: Shared vs domain utility split
- Status: Done.
- Added POS-domain utility:
  - `frontend/src/modules/pos/utils/number.ts`

## Phase 9: Barrel exports
- Status: Done.
- Added/updated barrels for POS hooks and module type folders.

## Phase 10: CI quality gate
- Status: Done.
- Added `npm run typecheck`.
- CI now runs lint + test + typecheck + build.
