# Bookstore POS Frontend

## Requisitos
- Node 18+

## Configuracion
1) Instalar dependencias:

```powershell
npm install
```

2) Variables de entorno:

```powershell
Copy-Item .env.example .env
```

3) Ejecutar:

```powershell
npm run dev
```

## E2E (Playwright)

```powershell
npm run e2e
```

Detalle de flujo: `../docs/qa/E2E_AUTOMATION.md`

## Notas
- API por defecto: `http://localhost:8000`
- Customer Display: abrir `http://localhost:5173/display/{sessionId}` (el POS genera el link)
