# Informe Técnico de Incidente
## Incidente: Fallos de autenticación/autorización y bloqueo de ventas

Fecha del informe: 10 de marzo de 2026  
Sistema: Bookstore POS (Frontend React + Backend FastAPI)  
Severidad: Alta  
Estado: Resuelto

## 1. Resumen ejecutivo
Se presentó una combinación de errores `401`, `403` y posteriormente `500` que impidieron completar ventas y guardar datos operativos.  
El incidente no tuvo una sola causa, sino una cadena de fallos en autenticación, permisos por rol y configuración de entorno.

El problema quedó resuelto mediante:
- Robustecimiento de carga de variables de entorno y ruta de base de datos.
- Correcciones defensivas en autenticación/autorización.
- Prevención de guardado de permisos vacíos en UI.
- Mejora de observabilidad de errores `500` en entorno de desarrollo.

## 2. Síntomas reportados
En consola del navegador se observaron:
- `api/auth/me` con `401 Unauthorized` inicialmente.
- `api/customers` con `403 Forbidden`.
- Posteriormente `api/auth/me` y `api/auth/login` con `500 Internal Server Error`.

Impacto funcional:
- No se podía culminar ventas.
- No se podían guardar datos relacionados en flujo POS.

## 3. Contexto técnico del flujo afectado
El módulo POS depende de varios endpoints críticos en paralelo:
- `/auth/me` para validar sesión actual.
- `/customers` para cargar cliente asociado a venta.
- `/sales` para registrar la venta.

Si falla autenticación o permisos en esos puntos, el flujo de cobro queda bloqueado.

## 4. Línea de tiempo del incidente
1. Se detectan errores `401` y `403` en frontend durante operación POS.
2. Se audita backend y frontend para revisar:
- validación de token,
- resolución de rol/permisos,
- consumo de endpoints desde React.
3. Se identifica riesgo de permisos vacíos en pantalla de administración de roles.
4. Se aplica corrección de resiliencia en autorización backend y protección en frontend.
5. Se detecta error de arranque del backend por `JWT_SECRET` no cargado (`ValidationError`).
6. Se corrige carga de `.env` para que no dependa del directorio desde el que se ejecuta Uvicorn.
7. Se observan `500` en login/me reportados por frontend; no se reproducen localmente en pruebas directas.
8. Se añade visibilidad de excepción real en entorno `dev` para diagnóstico inmediato en caso de nuevo `500`.
9. Se validan pruebas backend y build frontend con resultado exitoso.

## 5. Análisis de causa raíz (RCA)
### Causa raíz A: Configuración de entorno frágil para `JWT_SECRET`
En backend, la configuración leía `.env` relativo al directorio de ejecución.  
Cuando el backend se lanzaba desde la raíz del monorepo y no desde `backend`, el archivo `backend/.env` no se tomaba correctamente, resultando en:
- `jwt_secret=""`
- `ValidationError` al iniciar `Settings()`
- backend no funcional o comportamiento inconsistente de inicio.

### Causa raíz B: Riesgo de borrado operativo de permisos por error de carga en UI
En la vista de permisos por rol, si la lectura de permisos fallaba, la UI dejaba lista vacía y permitía guardar.  
Eso podía sobreescribir permisos del rol con lista vacía y provocar:
- `403` para endpoints esperados (`/customers`, `/sales`, etc.).

### Causa raíz C: Validación de rol/permisos poco tolerante a inconsistencias
La autorización dependía de coincidencias directas de rol/permisos.  
Ante inconsistencias de datos (espacios, mayúsculas, rol sin filas de permisos), se podía rechazar acceso aun con rol operativo esperado.

### Causa raíz D: Baja observabilidad de excepciones `500` en desarrollo
El handler global devolvía siempre detalle genérico en `500`, dificultando identificar rápidamente la excepción exacta.

## 6. Evidencia técnica observada
- Error explícito de arranque:
  - `ValidationError: JWT_SECRET es requerido...`
- Base de datos con estructura de sesiones/tokens consistente.
- Pruebas directas de endpoints auth (`/auth/me`, `/auth/login`) devolviendo `401` normal en entorno de reproducción controlado.
- Diferencia principal entre entornos: forma de arranque y resolución de `.env`.

## 7. Cambios correctivos implementados
### 7.1 Backend: configuración robusta
Archivo: `backend/app/core/config.py`
- Se definieron rutas explícitas de carga de `.env`:
  - `backend/.env`
  - `bookstore-pos/.env`
  - `.env` actual
- Se configuró `env_file_encoding="utf-8"`.
- Se estableció ruta de DB por defecto absoluta hacia `backend/bookstore.db`.

Resultado:
- El backend carga configuración válida independientemente del directorio de ejecución.

### 7.2 Backend: endurecimiento de autenticación/autorización
Archivo: `backend/app/core/deps.py`
- Normalización de rol (`trim + lower`) antes de comparar.
- Resolución más robusta de token (intenta candidatos disponibles).
- Para roles operativos (`cashier`, `stock`), fallback a permisos por defecto si no hay filas de permisos en tabla.
- Tolerancia adicional ante datos inconsistentes de rol en BD.

Resultado:
- Se reduce el riesgo de `401/403` por estados parciales o inconsistentes.

### 7.3 Frontend: protección contra guardado destructivo de permisos
Archivo: `frontend/src/modules/admin/pages/RolePermissions.tsx`
- Si falla carga de permisos:
  - se registra `loadError`,
  - se deshabilita botón de guardar,
  - se muestra mensaje explícito,
  - se bloquea intento de persistir permisos vacíos.

Resultado:
- Se elimina la vía de borrado accidental de permisos por error transitorio.

### 7.4 Backend: mejor diagnóstico de `500` en desarrollo
Archivo: `backend/app/main.py`
- En entorno no productivo, el handler de excepciones devuelve el tipo y mensaje real de la excepción.

Resultado:
- Acelera análisis de futuros incidentes sin exponer detalles sensibles en producción.

### 7.5 Variables de entorno actualizadas
Archivo: `backend/.env`
- Se definió `JWT_SECRET` válido.
- Se actualizó `CORS_ORIGINS` para incluir host de red local operativo.

## 8. Validación posterior a cambios
Se ejecutaron validaciones técnicas:
- `pytest tests/test_authz_role_permission_resilience.py tests/test_auth_refresh_rotation.py`
- `pytest tests/test_smoke.py::test_login_admin`
- `npm run build` en frontend

Resultado:
- Pruebas aprobadas y frontend compiló correctamente.

## 9. Riesgos residuales
- Si se rota `JWT_SECRET`, todos los tokens activos quedan inválidos y los usuarios deben reautenticar.
- Si se manipulan permisos manualmente en BD sin controles, pueden reaparecer estados inconsistentes.
- Diferencias entre scripts de arranque pueden introducir variables de entorno divergentes.

## 10. Acciones preventivas recomendadas
1. Estandarizar arranque backend con un único script oficial y documentado.
2. Añadir chequeo de prearranque:
- validar `JWT_SECRET`,
- validar `DATABASE_URL`,
- validar conectividad DB.
3. Agregar alerta cuando un rol operativo quede con cero permisos.
4. Forzar confirmación adicional en UI antes de aplicar cambios masivos de permisos.
5. Mantener pruebas de resiliencia de auth/permisos en pipeline CI.
6. En incidentes futuros, capturar siempre:
- request_id,
- endpoint,
- payload mínimo,
- detalle real de excepción (solo en dev).

## 11. Procedimiento de recuperación rápida (runbook corto)
1. Verificar backend activo:
```powershell
curl http://localhost:8000/health
```
2. Verificar config efectiva:
```powershell
python -c "import sys; sys.path.insert(0, 'backend'); from app.core.config import settings; print(bool(settings.jwt_secret), settings.database_url)"
```
3. Probar autenticación:
```powershell
curl -X POST http://localhost:8000/auth/login -H "Content-Type: application/json" -d "{\"username\":\"USUARIO\",\"password\":\"CLAVE\"}"
```
4. Si hay `500`, revisar `detail` dev y `request_id` en respuesta.
5. Si hay `403`, verificar permisos del rol (`cashier`/`stock`) y evitar guardado desde UI si hubo error de carga.

## 12. Lecciones aprendidas
- Un incidente de acceso puede mezclar causas de infraestructura, dominio y UX.
- Los errores de permisos son especialmente sensibles a estados parciales.
- La observabilidad temprana (errores detallados en dev + request_id) reduce drásticamente el tiempo de diagnóstico.
- La configuración no debe depender del directorio desde el que se ejecuta el proceso.

