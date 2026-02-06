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

sales_total = Counter(
    "bookstore_sales_total",
    "Total paid sales created",
)

sales_amount_total = Counter(
    "bookstore_sales_amount_total",
    "Accumulated amount from paid sales",
)

purchases_total = Counter(
    "bookstore_purchases_total",
    "Total purchases created",
)

purchases_amount_total = Counter(
    "bookstore_purchases_amount_total",
    "Accumulated amount from purchases",
)

rate_limit_blocked_total = Counter(
    "bookstore_rate_limit_blocked_total",
    "Total blocked requests due to rate limiting",
    ["scope"],
)


def render_metrics() -> bytes:
    return generate_latest()


__all__ = [
    "CONTENT_TYPE_LATEST",
    "http_requests_total",
    "http_request_duration_seconds",
    "sales_total",
    "sales_amount_total",
    "purchases_total",
    "purchases_amount_total",
    "rate_limit_blocked_total",
    "render_metrics",
]
