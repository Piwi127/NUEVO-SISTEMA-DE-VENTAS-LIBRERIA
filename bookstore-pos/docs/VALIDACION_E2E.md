# Validacion E2E (fase 7)

## Checklist rapido
- Login admin/cashier/stock y acceso a menus segun permisos.
- Auth/Seguridad:
  - Login fallido incrementa intentos y bloqueo temporal.
  - 2FA: setup, confirm, login con OTP.
  - CSRF: cookie + header obligatorio en POST/PUT/PATCH/DELETE.
  - Revocación: logout invalida token antiguo.
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
  - Verificar permisos `purchases.read` para listados/export.
- Devoluciones:
  - Anular venta y recuperar stock.
- Productos/Clientes/Proveedores:
  - CRUD completo y filtros/busqueda.
- Listas de precios:
  - Crear lista, reemplazar items y validar en ventas.
- Promociones:
  - Crear promo y aplicar a venta.
- Almacenes:
  - CRUD, transferencias, conteo, lotes/batches.
- Reportes:
  - KPI, top/low stock, filtros.
- Auditoria:
  - Usuarios, productos, settings, permisos.

## Verificaciones tecnicas
- Migraciones aplicadas: `alembic upgrade head`.
- Compilacion python (sin errores):
  - `python -m compileall app`
 - CSP y CORS:
  - Respuesta incluye CSP con `connect-src` alineado a `CORS_ORIGINS`.
