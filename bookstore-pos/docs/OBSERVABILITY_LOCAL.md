# Observabilidad Local (Prometheus + Grafana)

## Requisitos
- Docker Desktop activo en Windows
- Backend corriendo en `http://localhost:8000`

## Levantar monitoreo
Desde la raiz del proyecto:

```powershell
.\monitoring_up_windows.bat
```

Esto levanta:
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001` (usuario `admin`, clave `admin`)
- Dashboard preconfigurado: `Bookstore API Overview` (carpeta `Bookstore POS`)

## Apagar monitoreo

```powershell
.\monitoring_down_windows.bat
```

## Verificacion rapida
1. Abrir `http://localhost:8000/metrics` y confirmar que responde.
2. En Prometheus, consultar:
   - `bookstore_http_requests_total`
   - `bookstore_http_request_duration_seconds_count`
3. En Grafana, abrir el dashboard `Bookstore API Overview`.
4. Opcional: en Grafana `Explore`, ejecutar la misma metrica.

## Nota de red en Windows
Prometheus usa `host.docker.internal:8000` para llegar al backend local desde contenedores.
