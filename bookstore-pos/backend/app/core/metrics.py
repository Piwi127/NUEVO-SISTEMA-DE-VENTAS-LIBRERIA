from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest

http_requests_total = Counter(
    "bookstore_http_requests_total",
    "Total HTTP requests",
    ["method", "path", "status"],
)

http_request_duration_seconds = Histogram(
    "bookstore_http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "path"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0),
)


def render_metrics() -> bytes:
    return generate_latest()


__all__ = [
    "CONTENT_TYPE_LATEST",
    "http_requests_total",
    "http_request_duration_seconds",
    "render_metrics",
]
