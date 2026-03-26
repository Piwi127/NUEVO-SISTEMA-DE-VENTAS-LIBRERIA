# Documentación del Proyecto Bookstore POS

## Descripción General

**Bookstore POS** es un sistema de punto de venta (POS) completo para una librería, desarrollado con backend en FastAPI (Python) y frontend en React/Vite con TypeScript. El sistema incluye gestión de ventas, inventario, clientes, proveedores, reportes, caja, promociones, precios, usuarios y permisos.

---

## Estructura del Proyecto

```
bookstore-pos/
├── backend/              # API REST con FastAPI
│   ├── app/
│   │   ├── core/        # Configuración, seguridad, dependencias
│   │   ├── routers/    # Endpoints de la API
│   │   ├── services/   # Lógica de negocio
│   │   ├── models/     # Modelos de base de datos (SQLAlchemy)
│   │   ├── schemas/    # Schemas de validación (Pydantic)
│   │   └── db/         # Configuración de base de datos
│   ├── alembic/        # Migraciones de base de datos
│   └── tests/          # Pruebas unitarias y de integración
├── frontend/            # Interfaz web React
│   └── src/
│       ├── modules/    # Módulos funcionales (POS, catálogo, inventario, admin)
│       ├── components/ # Componentes reutilizables
│       ├── auth/       # Autenticación y autorización
│       └── app/        # Configuración global y estado
├── scripts/            # Utilidades de operación
└── monitoring/         # Prometheus + Grafana
```

---

## Backend - Descripción de Funciones

### Core (app/core/)

#### config.py
- **settings**: Configuración global de la aplicación mediante variables de entorno
- Configura: base de datos, JWT, cookies, CORS, rate limiting, límites de tasa

#### security.py
- **verify_password()**: Verifica contraseña vs hash bcrypt
- **get_password_hash()**: Genera hash de contraseña
- **validate_password()**: Valida requisitos de contraseña (largo, mayúsculas, minúsculas, números)
- **create_access_token()**: Crea token JWT de acceso
- **create_refresh_token()**: Crea token JWT de refresh
- **decode_token()**: Decodifica y valida token JWT
- **encrypt_2fa_secret()**: Encripta secreto 2FA
- **decrypt_2fa_secret()**: Desencripta secreto 2FA

#### deps.py
- **get_db()**: Proveedor de sesión de base de datos async
- **get_current_user()**: Extrae usuario actual del token JWT
- **require_role()**: Dependencia para verificar rol de usuario
- **require_permission()**: Dependencia para verificar permisos específicos

#### rate_limit.py
- **RateLimiter**: Clase para limitar tasa de requests por IP/usuario
- **is_limited()**: Verifica si se excedió el límite

#### audit.py
- **log_event()**: Registra eventos de auditoría en la base de datos

#### stock.py
- **get_stock_level()**: Obtiene nivel de stock de un producto
- **apply_stock_delta()**: Aplica incremento/decremento de stock
- **require_default_warehouse_id()**: Obtiene ID del almacén por defecto

#### search.py
- **normalize_search_text()**: Normaliza texto para búsqueda
- **compact_search_text()**: Compacta texto quitando acentos y espacios
- **split_search_terms()**: Divide términos de búsqueda

---

### Modelos (app/models/)

#### product.py
- **Product**: Modelo de producto con campos: sku, name, author, publisher, isbn, barcode, category, tags, price, cost, sale_price, stock, stock_min, tax_rate, y campos de costos y márgenes

#### sale.py
- **Sale**: Modelo de venta con totales, descuentos, puntos de lealtad
- **SaleItem**: Línea de item en una venta
- **Payment**: Método de pago de una venta

#### customer.py
- **Customer**: Modelo de cliente con datos personales, RUC, puntos de lealtad

#### user.py
- **User**: Modelo de usuario con username, password hash, rol, 2FA

#### cash.py
- **CashSession**: Sesión de caja con apertura/cierre y arqueos

#### purchase.py / purchasing.py
- **Purchase**: Modelo de compra a proveedores
- **PurchaseItem**: Items de una compra

#### warehouse.py
- **Warehouse**: Modelo de almacén

#### promotion.py / promotion_rule.py
- **Promotion**: Promociones globales (descuentos)
- **PromotionRule**: Reglas de promoción por producto (packs, precios por cantidad)

#### price_list.py
- **PriceList**: Lista de precios por cliente
- **PriceListItem**: Precio específico de producto en lista

---

### Servicios (app/services/)

#### pos/sales_service.py
- **SalesService**: Servicio principal de ventas
  - **create_sale()**: Crea una nueva venta con items, pagos, descuentos
  - **_process_sale_item()**: Procesa cada item de venta (precio, stock)
  - **_calculate_totals()**: Calcula subtotal, impuesto, total
  - **_calculate_loyalty_discount()**: Calcula descuento por puntos de lealtad
  - **_validate_payments()**: Valida métodos y montos de pago
  - **_create_document_snapshot()**: Crea snapshot del documento para impresión

#### pos/pricing.py
- **select_best_product_rule()**: Selecciona mejor regla de precio para producto

#### pos/returns_service.py
- **ReturnsService**: Servicio para procesar devoluciones de ventas

#### pos/cash_service.py
- **CashService**: Servicio para operaciones de caja (apertura, cierre, arqueo)

#### catalog/products_service.py
- **ProductsService**: CRUD de productos

#### catalog/customers_service.py
- **CustomersService**: CRUD de clientes

#### catalog/suppliers_service.py
- **SuppliersService**: CRUD de proveedores

#### catalog/promotions_service.py
- **PromotionsService**: CRUD de promociones y reglas

#### catalog/price_lists_service.py
- **PriceListsService**: CRUD de listas de precios

#### inventory/stock_service.py
- **StockService**: Gestión de stock y movimientos

#### inventory/purchases_service.py
- **PurchasesService**: CRUD de compras

#### inventory/import_jobs_service.py
- **ImportJobsService**: Importación masiva de productos desde Excel/CSV

#### reports/reports_service.py
- **ReportsService**: Generación de reportes de ventas, inventario, finanzas

#### printing_templates/ (Módulo de Impresión)
- **template_service.py**: Gestiona plantillas de impresión
- **document_render_service.py**: Renderiza documentos desde plantillas
- **document_snapshot_service.py**: Guarda snapshots de documentos generados
- **document_sequence_service.py**: Gestiona secuencia de números de documentos

#### admin/users_service.py
- **UsersService**: CRUD de usuarios

#### admin/permissions_service.py
- **PermissionsService**: Gestión de roles y permisos

#### admin/audit_service.py
- **AuditService**: Consulta de logs de auditoría

#### admin/settings_service.py
- **SettingsService**: Configuración del sistema

---

### Routers (app/routers/)

#### auth/__init__.py
- **POST /auth/login**: Inicio de sesión
- **POST /auth/refresh**: Refresh de token
- **POST /auth/logout**: Cierre de sesión
- **GET /auth/me**: Información del usuario actual
- **POST /auth/2fa/setup**: Configurar 2FA
- **POST /auth/2fa/confirm**: Confirmar 2FA

#### pos/sales.py
- **GET /sales**: Lista ventas con filtros y búsqueda
- **POST /sales**: Crea nueva venta
- **GET /sales/{id}/receipt**: Obtiene datos del recibo

#### pos/returns.py
- **POST /returns**: Procesa devolución de venta

#### pos/cash.py
- **GET /cash/current**: Estado actual de caja
- **POST /cash/open**: Abre caja
- **POST /cash/close**: Cierra caja
- **POST /cash/audit**: Realiza arqueo de caja

#### catalog/products.py
- **GET /products**: Lista productos con búsqueda inteligente
- **GET /products/categories**: Lista categorías
- **POST /products**: Crea producto
- **PUT /products/{id}**: Actualiza producto
- **DELETE /products/{id}**: Elimina producto

#### catalog/customers.py
- **GET /customers**: Lista clientes
- **POST /customers**: Crea cliente
- **PUT /customers/{id}**: Actualiza cliente

#### catalog/suppliers.py
- **GET /suppliers**: Lista proveedores
- **POST /suppliers**: Crea proveedor

#### catalog/promotions.py
- **GET /promotions**: Lista promociones activas
- **POST /promotions**: Crea promoción

#### catalog/price_lists.py
- **GET /price-lists**: Lista listas de precios
- **POST /price-lists**: Crea lista de precios

#### inventory/inventory.py
- **GET /inventory/stock**: Consulta stock de productos
- **POST /inventory/adjust**: Ajusta stock

#### inventory/purchases.py
- **GET /purchases**: Lista compras
- **POST /purchases**: Crea compra

#### inventory/purchasing.py
- **GET /purchasing/orders**: Lista órdenes de compra
- **POST /purchasing/orders**: Crea orden de compra

#### inventory/warehouses.py
- **GET /warehouses**: Lista almacenes

#### reports/reports.py
- **GET /reports/sales**: Reporte de ventas
- **GET /reports/inventory**: Reporte de inventario
- **GET /reports/finances**: Reporte financiero

#### admin/users.py
- **GET /admin/users**: Lista usuarios
- **POST /admin/users**: Crea usuario
- **PUT /admin/users/{id}**: Actualiza usuario

#### admin/permissions.py
- **GET /admin/roles**: Lista roles
- **PUT /admin/roles/{role}**: Actualiza permisos de rol

#### admin/audit.py
- **GET /admin/audit**: Consulta logs de auditoría

#### admin/settings.py
- **GET /admin/settings**: Obtiene configuración
- **PUT /admin/settings**: Actualiza configuración

#### admin/document_templates.py
- **GET /admin/document-templates**: Lista plantillas
- **POST /admin/document-templates**: Crea plantilla
- **PUT /admin/document-templates/{id}**: Actualiza plantilla

---

### main.py (Punto de Entrada)

- **verify_schema_compatibility()**: Verifica que el esquema de BD esté actualizado
- **lifespan()**: Context manager para inicio/apagado de la app
- **RateLimitMiddleware**: Middleware de rate limiting
- **RequestContextMiddleware**: Middleware para logging de requests
- **SecurityHeadersMiddleware**: Middleware para headers de seguridad (CSP, CORS, etc.)
- **HealthGuardMiddleware**: Middleware para protección de health checks
- **CsrfMiddleware**: Middleware para protección CSRF

---

## Frontend - Descripción de Componentes y Funciones

### Módulos (src/modules/)

#### POS (Point of Sale)
- **POS.tsx**: Página principal del punto de venta
  - Búsqueda de productos por nombre, SKU, ISBN, código de barras
  - Carrito de compras con gestión de cantidades
  - Selección de cliente
  - Aplicación de promociones y descuentos
  - Sistema de puntos de lealtad
  - Panel de pago con múltiples métodos
  - Guardado y recuperación de ventas
  - Generación de tickets, PDFs y exportación ESC/POS

- **Cart.tsx**: Componente del carrito de compras
- **ProductSearch.tsx**: Búsqueda de productos con autocompletado
- **PaymentDialog.tsx**: Diálogo de pago con métodos
- **CashPanel.tsx**: Panel de operaciones de caja
- **Calculator.tsx**: Calculadora integrada

#### Catálogo (Catalog)
- **Products.tsx**: Lista y gestión de productos
- **ProductForm.tsx / ProductFormModal.tsx**: Formulario de producto
- **Customers.tsx**: Gestión de clientes
- **Suppliers.tsx**: Gestión de proveedores
- **Promotions.tsx**: Gestión de promociones
- **PriceLists.tsx**: Listas de precios por cliente

#### Inventario (Inventory)
- **Inventory.tsx**: Consulta de stock
- **Purchases.tsx**: Registro de compras a proveedores

#### Admin
- **Users.tsx**: Gestión de usuarios
- **RolePermissions.tsx**: Configuración de roles y permisos
- **DocumentTemplates.tsx**: Plantillas de impresión
- **AdminPanel.tsx**: Panel de administración general

#### Reports
- **Reports.tsx**: Visualización de reportes y gráficos

#### Auth
- **Login.tsx**: Página de inicio de sesión

---

### Hooks Personalizados (src/modules/*/hooks/)

- **usePosCheckout**: Lógica de checkout de ventas
- **usePosPricing**: Cálculo de precios y descuentos
- **usePosKeyboard**: Atajos de teclado para POS
- **usePosWebSocket**: Conexión WebSocket para display de precios
- **useHeldCarts**: Gestión de ventas guardadas
- **useCashOperations**: Operaciones de caja
- **useProductsList**: Lista de productos con búsqueda
- **useProductForm**: Formulario de producto

---

### Servicios de API (src/modules/shared/api/)

- **client.ts**: Cliente Axios con interceptores
  - Manejo de tokens JWT
  - Refresh automático de tokens
  - CSRF token management
  - Redirección a login en errores 401

---

## Funcionalidades Principales

### 1. Sistema de Ventas (POS)
- Búsqueda inteligente de productos
- Carrito de compras interactivo
- Múltiples métodos de pago (efectivo, tarjeta, etc.)
- Descuentos por promociones
- Sistema de puntos de lealtad
- Generación de documentos (Ticket, Boleta, Factura)
- Impresión de tickets y exportación PDF
- Guardado y recuperación de ventas

### 2. Gestión de Inventario
- Control de stock por almacén
- Movimiento de stock (entradas/salidas)
- Importación masiva de productos
- Ajuste de inventario
- Stock mínimo y alertas

### 3. Gestión de Clientes y Proveedores
- Catálogo de clientes con datos fiscales
- Sistema de puntos de lealtad
- Listas de precios por cliente
- Gestión de proveedores

### 4. Promociones y Descuentos
- Promociones globales (porcentaje/monto)
- Reglas de packs (comprar X llevar Y)
- Precios por cantidad
- Descuentos por puntos de lealtad

### 5. Caja y Arqueos
- Apertura y cierre de caja
- Arqueo de caja con detalle
- Control de efectivo

### 6. Reportes
- Reporte de ventas por período
- Reporte de inventario
- Reporte financiero (margen de ganancia)
- Gráficos y visualizaciones

### 7. Seguridad y Permisos
- Autenticación con JWT
- Roles: admin, cashier, stock
- Permisos granulares por acción
- 2FA opcional
- Rate limiting
- Logs de auditoría

### 8. Sistema de Impresión
- Plantillas personalizables de documentos
- Renderizado de tickets/boletas/facturas
- Exportación ESC/POS para impresoras térmicas
- Snapshot de documentos generados

---

## Tecnologías Utilizadas

### Backend
- **FastAPI**: Framework web async
- **SQLAlchemy**: ORM async
- **Pydantic**: Validación de datos
- **Alembic**: Migraciones de BD
- **PyJWT**: Tokens JWT
- **Bcrypt**: Hash de contraseñas
- **Python-dotenv**: Variables de entorno

### Frontend
- **React**: Framework UI
- **TypeScript**: Tipado estático
- **Vite**: Build tool
- **Material UI**: Componentes UI
- **TanStack Query**: Estado y caching
- **Axios**: Cliente HTTP
- **Recharts**: Gráficos
- **React Router**: Enrutamiento

### Base de Datos
- **SQLite**: Desarrollo
- **PostgreSQL**: Producción

### DevOps
- **Prometheus**: Métricas
- **Grafana**: Dashboard de monitoreo
- **Playwright**: Tests E2E
- **Ruff**: Linting Python

---

## Notas de Configuración

### Variables de Entorno (Backend)
- `DATABASE_URL`: URL de conexión a BD
- `JWT_SECRET`: Clave secreta para JWT
- `ENVIRONMENT`: dev/staging/prod
- Configuración de cookies, CORS, rate limiting

### Ejecución
- Backend: `uvicorn app.main:app --reload`
- Frontend: `npm run dev`
- Scripts: `scripts/run_project.bat` (Windows)

---

*Documento generado automáticamente para el proyecto Bookstore POS*
