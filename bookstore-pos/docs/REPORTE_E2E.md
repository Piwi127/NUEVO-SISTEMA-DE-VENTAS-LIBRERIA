# Reporte E2E — Bookstore POS

Estado: En progreso  
Fecha: __________________  
Responsable: __________________

## Entorno
- Backend: __________________ (URL)
- Frontend: __________________ (URL)
- Base de datos: SQLite (dev)
- Commit/branch: __________________

---

## 1) Autenticación y Seguridad
- [x] Login válido (admin/cashier/stock).
- [x] Login inválido incrementa intentos y bloquea tras umbral.
- [x] 2FA: setup, confirm, login con OTP.
- [x] CSRF: cookie + header obligatorio en POST/PUT/PATCH/DELETE.
- [x] Logout revoca sesión (token antiguo inválido).
- [x] Acceso a rutas protegidas sin sesión devuelve 401.

Observaciones:
- 2FA activado con QR + Google Authenticator; login ahora solicita OTP.

---

## 2) Roles y Permisos
- [ ] Admin accede a todo.
- [x] Cashier no accede a inventario/compras sin permiso.
- [x] Stock no accede a ventas si no tiene permiso.
- [x] `purchases.read` permite listados/export sin `purchases.create`.

Observaciones:
- __________________

---

## 3) Caja
- [x] Abrir caja.
- [x] Movimiento IN/OUT.
- [x] Cierre de caja.
- [x] Auditoría de caja registrada.

Observaciones:
- __________________

---

## 4) Ventas (POS)
- [x] Venta con cliente (API).
- [x] Venta sin cliente ni promo (API).
- [x] Pago mixto (cash + otro) y validación de total (API).
- [x] Comprobante / ticket / ESC-POS (API).
- [x] WebSocket display actualiza carrito (API).
- [x] Stock decrementa en StockLevel (via movimiento + venta).

Observaciones:
- __________________

---

## 5) Compras
- [x] Crear OC con múltiples items.
- [x] Recepción parcial.
- [x] Pago a proveedor.
- [x] Historial filtra por fecha/proveedor.
- [x] Export CSV.

Observaciones:
- __________________

---

## 6) Inventario
- [x] Movimiento IN/OUT/ADJ.
- [x] Importación CSV (API).
- [x] Kardex muestra movimientos.
- [x] Transferencia entre almacenes (API).
- [x] Conteo cíclico (API).

Observaciones:
- __________________

---

## 7) Productos / Clientes / Proveedores
- [x] CRUD completo productos (API create/delete).
- [x] CRUD completo clientes (API create/delete).
- [x] CRUD completo proveedores (API create/delete).
- [ ] Búsqueda y filtros.

Observaciones:
- __________________

---

## 8) Listas de precios y Promociones
- [x] Crear lista de precios (API).
- [x] Reemplazar items de lista (API).
- [x] Aplicación en ventas (API).
- [x] Crear promoción y aplicar (API).

Observaciones:
- __________________

---

## 9) Reportes
- [x] Diario (consulta y export).
- [x] Top productos (consulta y export).
- [x] Stock bajo (consulta y export).

Observaciones:
- __________________

---

## 10) UI / Compacto
- [ ] Toggle compacto aplica globalmente.
- [ ] CardTable en compacto.
- [ ] Modales fullscreen en compacto.
- [ ] Header muestra chip “Compacto”.

Observaciones:
- __________________

---

## Resultado final
- Estado: En progreso
- Notas generales:
  - Validación API automatizada ejecutada para caja, ventas, compras, inventario, reportes, auditoría, listas de precios, promociones y WebSocket.
  - Pendiente validación manual UI (búsquedas/filtros, modo compacto, flujos UI completos).
