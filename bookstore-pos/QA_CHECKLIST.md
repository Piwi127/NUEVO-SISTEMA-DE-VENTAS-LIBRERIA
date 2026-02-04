# QA Checklist — Bookstore POS

## 1) Autenticación y Seguridad
- [ ] Login válido devuelve token y rol correctos.
- [ ] Login inválido incrementa intentos y bloquea tras umbral.
- [ ] 2FA requerido: sin OTP debe rechazar ("2FA_REQUIRED").
- [ ] 2FA inválido incrementa intentos y bloquea tras umbral.
- [ ] Logout limpia sesión y bloquea rutas protegidas.

## 2) Permisos y Roles
- [ ] Rol sin permisos explícitos recibe 403 en endpoints protegidos.
- [ ] Admin accede a todo.
- [ ] Cashier no accede a inventario/compra si no tiene permiso.
- [ ] Stock no accede a ventas si no tiene permiso.

## 3) CORS
- [ ] Frontend en `http://localhost:5173` funciona sin errores CORS.
- [ ] Origen no listado en `CORS_ORIGINS` es bloqueado.

## 4) Ventas (POS)
- [ ] Registrar venta con cliente y promo.
- [ ] Registrar venta sin cliente ni promo.
- [ ] Venta actualiza caja (cash current).
- [ ] Imprimir ticket y descargar ESC/POS.
- [ ] WebSocket display recibe actualizaciones del carrito.

## 5) Compras
- [ ] Crear OC con múltiples items.
- [ ] Recepción parcial de OC (producto y cantidad).
- [ ] Pago a proveedor con referencia.
- [ ] Historial filtra por fecha/proveedor.
- [ ] Export CSV de compras.

## 6) Inventario
- [ ] Carga masiva CSV/XLSX con plantilla.
- [ ] Transferencia entre almacenes.
- [ ] Lotes y vencimientos.
- [ ] Conteo cíclico.
- [ ] Kardex muestra movimientos recientes.

## 7) Clientes / Proveedores / Productos
- [ ] CRUD básico con validaciones.
- [ ] Búsqueda funciona (filtros).
- [ ] Listados en compacto y desktop.

## 8) Reportes
- [ ] Reporte diario (consulta y exportación).
- [ ] Top productos (consulta y exportación).
- [ ] Stock bajo (consulta y exportación).

## 9) UI — Modo compacto
- [ ] Toggle en AdminPanel aplica globalmente.
- [ ] Listados cambian a `CardTable` en modo compacto.
- [ ] PaymentDialog se vuelve fullscreen en modo compacto.
- [ ] Header muestra chip “Compacto”.

## 10) Pruebas automatizadas
- [ ] Backend: `PYTHONPATH=. .venv/bin/python -m pytest -q` (OK).

## 11) Performance
- [ ] Búsqueda de productos con debounce (no spam de requests).
- [ ] `staleTime` reduce refetches innecesarios.

## 12) Validación final
- [ ] No hay errores en consola del navegador.
- [ ] No hay errores 500 en backend durante flujos normales.
- [ ] CORS no bloquea en entorno esperado.

---

## Estado / Responsable
- Estado: Pendiente | En progreso | OK | Bloqueado
- Responsable: ______________________________
- Fecha: ______________________________


# Criterios de Aceptación por Módulo

## Módulo: Autenticación / Seguridad
- [ ] Login válido devuelve token y rol, y permite acceso a rutas protegidas.
- [ ] Login inválido incrementa intentos; bloqueo ocurre al superar el umbral.
- [ ] 2FA obligatorio cuando está activo; OTP inválido bloquea según umbral.
- [ ] Logout revoca acceso a rutas protegidas.

## Módulo: Roles y Permisos
- [ ] Endpoints requieren permisos específicos según rol.
- [ ] Admin tiene acceso total.
- [ ] Rol sin permisos explícitos recibe 403 en endpoints protegidos.

## Módulo: POS / Ventas
- [ ] Venta completa: subtotal, impuesto, descuento, total coherentes.
- [ ] Venta impacta caja y genera comprobante.
- [ ] Impresión de ticket funciona (HTML y ESC/POS).
- [ ] WebSocket display recibe el carrito actualizado.

## Módulo: Compras
- [ ] OC se crea con items válidos.
- [ ] Recepción parcial actualiza stock.
- [ ] Pago a proveedor registrado correctamente.
- [ ] Historial filtra por fechas y proveedor.
- [ ] Exportación CSV descargable.

## Módulo: Inventario
- [ ] Importación masiva valida columnas requeridas.
- [ ] Transferencias mueven stock entre almacenes.
- [ ] Kardex refleja movimientos en orden correcto.
- [ ] Conteo cíclico ajusta stock según cantidad ingresada.

## Módulo: Productos
- [ ] CRUD completo con validaciones básicas.
- [ ] Búsqueda por SKU y nombre responde correctamente.
- [ ] Stock mínimo se refleja en reportes.

## Módulo: Clientes
- [ ] CRUD completo y búsqueda funcional.
- [ ] Asociar lista de precios a cliente funciona.

## Módulo: Proveedores
- [ ] CRUD completo y búsqueda funcional.

## Módulo: Reportes
- [ ] Reporte diario muestra métricas correctas.
- [ ] Top productos coincide con ventas en rango.
- [ ] Stock bajo coincide con stock mínimo.
- [ ] Exportaciones generan archivos válidos.

## Módulo: Configuración / Admin
- [ ] Cambios de settings persisten y se reflejan en frontend.
- [ ] Permisos por rol se actualizan correctamente.
- [ ] Backup se descarga correctamente.

## Módulo: UI / Modo Compacto
- [ ] Toggle compacto afecta todas las pantallas.
- [ ] Cards/Tablas cambian de layout según el modo.
- [ ] Modales se adaptan a fullscreen en compacto.
