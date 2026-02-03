# Validacion E2E (fase 7)

## Checklist rapido
- Login admin/cashier/stock y acceso a menus segun permisos.
- Caja:
  - Abrir caja, movimiento, cerrar caja.
  - Verificar auditoria en eventos de caja.
- Ventas:
  - Venta con descuento, impuesto incluido/excluido.
  - Pago con efectivo y mixto (validacion de total).
  - Confirmar descuento/promocion y recibo.
  - Stock decrementa en StockLevel y Product.stock sincronizado.
- Inventario:
  - Movimiento IN/OUT/ADJ.
  - Importacion CSV/XLSX y kardex visible.
- Compras:
  - Crear OC, cerrar OC, verificar estado CLOSED.
  - Historial de compras y exportacion CSV.
- Reportes:
  - KPI, top/low stock, filtros.
- Auditoria:
  - Usuarios, productos, settings, permisos.

## Verificaciones tecnicas
- Migraciones aplicadas: `alembic upgrade head`.
- Compilacion python (sin errores):
  - `python -m compileall app`

