# Plan de ejecucion: Centro ejecutivo premium

## Objetivo general
Reorganizar el sistema con un lenguaje premium y operativo, priorizando vistas de control, mejores decisiones rapidas y una interfaz mas clara para administracion, reportes e inventario, sin corromper la logica del proyecto.

## Fases completadas
- [x] Fase 1. Convertir `Reportes` en un centro ejecutivo con KPIs, alertas y accesos rapidos.
- [x] Fase 2. Reorganizar `Administracion` como centro de control premium con resumen operativo y acciones directas.
- [x] Fase 3. Reforzar `Inventario` con radar de abastecimiento, riesgo de stock y atajos operativos.
- [x] Fase 4. Endurecer la experiencia frente a APIs desfasadas para evitar errores visibles en rentabilidad.
- [x] Fase 5. Validar estabilidad tecnica del frontend despues de todos los cambios.

## Cambios ejecutados
### Reportes
- Apertura con `Centro ejecutivo` como vista principal.
- KPIs de ventas, margen, stock y producto lider.
- Alertas operativas y accesos rapidos.
- Fallback visual cuando la API activa no expone rentabilidad.

### Administracion
- Nueva banda premium con resumen del estado del sistema.
- KPIs de almacenes, metodos de pago, auditoria y modo UI.
- Bloque de estado administrativo con alertas claras.
- Panel de acciones rapidas para backup, 2FA, auditoria y guardado.

### Inventario
- Nuevo radar de abastecimiento en la cabecera.
- KPIs de productos, categorias, alertas, faltantes y unidades.
- Resumen de riesgo operativo y cargas pendientes.
- Atajos rapidos para carga masiva, operaciones y kardex.

## Resultado funcional
- El sistema tiene ahora una linea visual y operativa mas coherente en modulos clave.
- La informacion importante aparece antes y con mejor jerarquia.
- El frontend evita insistir con rutas de rentabilidad cuando el backend activo aun no las expone.
- No fue necesario alterar la logica central de ventas, inventario o seguridad para estas mejoras.

## Verificacion
- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run build`
