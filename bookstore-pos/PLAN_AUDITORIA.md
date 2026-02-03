# Plan de remediación (auditoría técnica)

## Fase 1 — Definición de diseño (stock)
- Fuente de verdad: `StockLevel` como único stock real.
- `Product.stock` pasa a derivado (solo lectura en UI/serialización). No escribir más desde routers.
- Stock global = suma de `StockLevel` por producto.
- Reglas:
  - Si no hay almacén por defecto, **se creará uno** automáticamente (`Almacen Principal`) y se asignará como default.
  - Cualquier operación de stock debe pasar por `StockLevel`.

## Fase 2 — Migraciones y refactor de stock
- Migración que:
  - Crea almacén por defecto si no existe.
  - Migra `Product.stock` a `StockLevel` en el almacén por defecto.
- Refactor:
  - Eliminar escrituras directas a `Product.stock` en routers.
  - Recalcular `Product.stock` desde `StockLevel` al leer (o mantener sincronización).

## Fase 3 — Permisos finos
- Introducir `sales.read`.
- Actualizar roles/seed.
- Aplicar `require_permission("sales.read")` en endpoints de lectura de ventas.

## Fase 4 — Auditoría administrativa
- Registrar cambios en:
  - Usuarios (create/update/status/password/2fa).
  - Productos (create/update/delete).
  - Settings (update).
  - Roles/permissions (update).

## Fase 5 — Transacciones en ventas
- Eliminar `begin_nested`.
- Asegurar una sola transacción real.
- Separar auth y transacción de negocio.

## Fase 6 — Compras (ciclo completo)
- Historial OC/compras (backend + UI).
- Estado OPEN/CLOSED visible.
- Exportaciones CSV.

## Fase 7 — Validación y pruebas
- Checklist E2E: ventas, stock, compras, permisos, auditoría.
- Pruebas de regresión.
