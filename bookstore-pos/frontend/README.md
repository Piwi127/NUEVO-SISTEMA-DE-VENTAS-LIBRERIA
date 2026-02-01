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

## Notas
- API por defecto: `http://localhost:8000`
- Customer Display: abrir `http://localhost:5173/display/{sessionId}` (el POS genera el link)
