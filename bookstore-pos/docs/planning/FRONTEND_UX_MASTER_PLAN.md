# Frontend UX Master Plan

## Estado
- Estado general: aprobado para ejecucion.
- Estado actual: Fase 2 completada. Fase 3 completada. Fase 4 en progreso.
- Base tecnica: `npm run lint` y `npm run build` pasan.

## Objetivo
Mejorar la experiencia del frontend para que el sistema sea mas claro, mas rapido de operar y mas consistente entre desktop y mobile.

## Principios
- Priorizar experiencia operativa sobre decoracion.
- No perder funcionalidad en modo compacto.
- Evitar prompts y confirms nativos del navegador.
- Validar en linea, no solo al final.
- Reducir carga cognitiva en POS, inventario y administracion.
- Mejorar feedback visible, persistente y contextual.

## Fase 1: Quick Wins Criticos
- Objetivo: eliminar fricciones graves y recuperar paridad funcional en mobile.
- Alcance: dialogs compartidos, acciones faltantes en vistas compactas, flujo de productos consistente y primeras correcciones de UX operativa.
- Estado: completada.

### Fase 1 - Entregables
- Reemplazar `window.confirm` y `window.prompt` por dialogs propios.
- Recuperar acciones de editar/eliminar/seguridad en vistas compactas.
- Corregir flujos inconsistentes como altas que abren otra pestana.
- Dejar una base comun para seguir con POS, productos y promociones.

### Fase 1 - Lote iniciado
- [x] Mejorar el componente compartido de confirmacion.
- [x] Aplicar dialogs propios en clientes.
- [x] Aplicar dialogs propios en proveedores.
- [x] Aplicar dialogs propios en usuarios.
- [x] Reemplazar el prompt OTP por un dialogo de 2FA en usuarios.
- [x] Reemplazar el prompt de ventas en espera en POS.
- [x] Reemplazar la eliminacion nativa en productos.
- [x] Corregir el alta de productos en nueva pestana.
- [x] Recuperar acciones compactas en promociones.

## Fase 2: App Shell y Navegacion
- Estado: completada.
- Objetivo: que el usuario entienda donde esta y llegue rapido a cualquier modulo.
- Cambios:
- Sidebar persistente en desktop.
- Drawer solo para mobile.
- Header superior mas limpio.
- Breadcrumbs y contexto de modulo.
- Tabs solo como navegacion secundaria.
- Ruta inicial resuelta por rol.

### Fase 2 - Lote iniciado
- [x] Rehacer el shell principal con sidebar persistente en desktop.
- [x] Mantener drawer temporal en mobile.
- [x] Limpiar la barra superior y reducir ruido visual.
- [x] Agregar breadcrumb y contexto de modulo.
- [x] Mover tabs del modulo al contexto de contenido.
- [x] Ajustar textos y microcopy del shell segun feedback visual.
- [x] Revisar acceso de ruta inicial segun rol para evitar rebotes innecesarios.

## Fase 3: Sistema de Formularios
- Estado: completada.
- Objetivo: que los formularios guien en vez de castigar.
- Cambios:
- Estandarizar `react-hook-form + zod`.
- Errores inline y helper text utiles.
- Botones deshabilitados cuando el estado es invalido.
- Aviso de cambios sin guardar.
- Mejor manejo de estados `loading`, `success` y `error`.

### Fase 3 - Lote iniciado
- [x] Crear utilidades compartidas de validacion para telefono y password.
- [x] Migrar `Login` con errores inline y estado de submit.
- [x] Migrar `Customers` con validacion, dirty state y cancelacion de edicion.
- [x] Migrar `Suppliers` con validacion, dirty state y cancelacion de edicion.
- [x] Migrar `Users` con validacion inline, password fuerte y mejor manejo de errores.
- [x] Migrar `ProductForm` a un esquema completo con validaciones numericas y secciones.
- [x] Migrar `Promotions` con validacion separada para globales y packs.
- [x] Migrar `Purchases` con formularios separados para orden, recepcion y pago.
- [x] Migrar `Inventory` y formularios operativos restantes para unificar el patron.

## Fase 4: Redisenio del POS
- Estado: en progreso.
- Enfoque actual: densidad final del POS, version simplificada de cajero y cierre operativo.
- Objetivo: reducir ruido visual y acelerar el cobro.
- Cambios:
- Simplificar cabecera y resumen.
- Mejorar foco en busqueda, carrito y cobro.
- Rehacer ventas en espera con dialogo propio.
- Unificar experiencia desktop/mobile.
- Mejorar lectura de descuentos, stock y totales.

### Fase 4 - Lote iniciado
- [x] Reducir la densidad del bloque superior con un resumen operativo mas corto.
- [x] Quitar el bloque movil duplicado y centralizar controles de cobro.
- [x] Reorganizar el panel de carrito y pago con contexto de cliente, promo y totales.
- [x] Mejorar el dialogo de pago con etiquetas legibles y resumen de importes.
- [x] Reforzar la lectura visual del carrito en mobile.
- [x] Ajustar el cierre final de cobro y postventa rapida.
- [x] Mejorar ProductSearch con mejor coincidencia visible, stock y precio aplicado.
- [x] Acelerar la seleccion con foco estable y agregado rapido por teclado.
- [x] Crear version simplificada de cajero con solo buscador y carrito visibles.
- [x] Separar buscador y lista de productos del cajero en pestanas minimalistas.
- [x] Compactar el panel de cobro del cajero y forzar carrito minimal tambien en desktop.
- [x] Reducir la interfaz general del POS a un layout mas limpio, plano y operativo.

## Fase 5: Catalogo y Mantenimiento
- Objetivo: hacer el catalogo mas administrable.
- Cambios:
- Mejorar filtros y acciones en productos.
- Rehacer formulario de producto por secciones.
- Unificar listas y editores de clientes/proveedores.
- Mejorar promociones globales y packs en mobile.

## Fase 6: Inventario y Compras
- Objetivo: que inventario escale con catalogos grandes.
- Cambios:
- Reemplazar selects gigantes por autocompletado.
- Separar mejor carga, ajustes, transferencias, lotes y conteo.
- Rehacer el importador con validacion y preview robusta.
- Mejorar kardex y lectura de movimientos.

## Fase 7: Reportes y Administracion
- Objetivo: subir claridad gerencial y operativa.
- Cambios:
- Filtros mas visibles y presets de fecha.
- KPIs mejor jerarquizados.
- Mejor flujo de 2FA, auditoria y diagnostico.
- Mejor navegacion interna del panel admin.

## Fase 8: Performance, Accesibilidad y QA
- Objetivo: que la mejora UX no cueste robustez.
- Cambios:
- Reducir peso del bundle inicial.
- Mejorar foco visible y navegacion por teclado.
- Revisar estados deshabilitados, contraste y accesibilidad.
- Aumentar cobertura E2E en mobile y flujos criticos.

## Orden recomendado
1. Cerrar Fase 4 con ajustes finales de densidad, mensajes operativos y pruebas de uso rapido.
2. Pasar a Fase 5 y Fase 6.
3. Cerrar con Fase 7 y Fase 8.

## KPIs
- Cero dialogs nativos del navegador.
- Paridad funcional total entre desktop y mobile en modulos criticos.
- Menos pasos para completar una venta.
- Formularios criticos con validacion inline.
- Menor peso del bundle inicial.
- Mas cobertura E2E en acciones sensibles.
