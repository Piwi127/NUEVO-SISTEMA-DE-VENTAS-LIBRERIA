# Bookstore POS Backend

## Requisitos
- Python 3.11+

## Configuracion
1) Crear entorno virtual e instalar dependencias:

```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

2) Copiar variables de entorno:

```powershell
Copy-Item .env.example .env
```

3) Ejecutar migraciones:

```powershell
alembic upgrade head
```

4) Levantar API:

```powershell
uvicorn app.main:app --reload --port 8000
```

## Usuario administrador inicial
El sistema no crea un usuario admin automaticamente al iniciar.

Para crear o actualizar el admin, usar:

```powershell
python ..\scripts\create_admin.py --username admin --password "TU_PASSWORD_SEGURA"
```

## Endpoints utiles
- Swagger: http://localhost:8000/docs

## Impresion termica (ESC/POS)
- Descargar ticket binario: `GET /printing/escpos/{sale_id}`
- Texto plano: `GET /printing/receipt-text/{sale_id}`

Ejemplo (Windows) para enviar el binario a una impresora compartida:
```
copy /b ticket_123.bin \\NOMBRE_PC\NOMBRE_IMPRESORA
```
