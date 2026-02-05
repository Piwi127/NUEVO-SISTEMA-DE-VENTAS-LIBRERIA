import pytest

from app.core.config import settings
from app.core.rate_limit import rate_limiter


async def _login_admin(client):
    resp = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    assert resp.status_code == 200
    csrf = resp.cookies.get("csrf_token")
    assert csrf
    return {"X-CSRF-Token": csrf}


@pytest.mark.asyncio
async def test_public_settings(client):
    resp = await client.get("/settings/public")
    assert resp.status_code == 200
    data = resp.json()
    assert data["project_name"] == "Bookstore POS"
    assert data["default_warehouse_id"] is not None


@pytest.mark.asyncio
async def test_security_headers_present(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    csp = resp.headers.get("content-security-policy", "")
    assert "object-src 'none'" in csp
    assert "script-src 'self'" in csp
    assert "script-src 'self' 'unsafe-inline'" not in csp
    assert resp.headers.get("cross-origin-opener-policy") == "same-origin"
    assert resp.headers.get("cross-origin-resource-policy") == "same-origin"


@pytest.mark.asyncio
async def test_request_id_header_is_returned(client):
    custom_id = "req-test-123"
    resp = await client.get("/health", headers={"X-Request-ID": custom_id})
    assert resp.status_code == 200
    assert resp.headers.get("x-request-id") == custom_id


@pytest.mark.asyncio
async def test_metrics_endpoint_exposes_prometheus_metrics(client):
    # Generate some traffic first so counters are present with sample values.
    ping = await client.get("/health")
    assert ping.status_code == 200

    metrics = await client.get("/metrics")
    assert metrics.status_code == 200
    body = metrics.text
    assert "bookstore_http_requests_total" in body
    assert "bookstore_http_request_duration_seconds" in body
    assert "text/plain" in (metrics.headers.get("content-type") or "")


@pytest.mark.asyncio
async def test_login_admin(client):
    headers = await _login_admin(client)
    assert headers.get("X-CSRF-Token")


@pytest.mark.asyncio
async def test_product_sale_flow(client):
    headers = await _login_admin(client)

    product_payload = {
        "sku": "BK-TEST-001",
        "name": "Libro Test",
        "category": "Ficcion",
        "price": 20.0,
        "cost": 8.0,
        "stock": 10,
        "stock_min": 1,
    }
    resp = await client.post("/products", json=product_payload, headers=headers)
    assert resp.status_code == 201
    product = resp.json()
    assert product["stock"] == 10

    resp = await client.post("/cash/open", json={"opening_amount": 100.0}, headers=headers)
    assert resp.status_code == 201

    qty = 2
    subtotal = product["price"] * qty
    sale_payload = {
        "customer_id": None,
        "items": [{"product_id": product["id"], "qty": qty}],
        "payments": [{"method": "CASH", "amount": subtotal}],
        "subtotal": subtotal,
        "tax": 0,
        "discount": 0,
        "total": subtotal,
        "promotion_id": None,
    }
    sale_resp = await client.post("/sales", json=sale_payload, headers=headers)
    assert sale_resp.status_code == 201
    sale = sale_resp.json()
    assert sale["status"] == "PAID"

    list_resp = await client.get("/sales?status=PAID", headers=headers)
    assert list_resp.status_code == 200
    assert any(s["id"] == sale["id"] for s in list_resp.json())

    products_resp = await client.get("/products?search=BK-TEST-001", headers=headers)
    assert products_resp.status_code == 200
    updated = products_resp.json()[0]
    assert updated["stock"] == 8


@pytest.mark.asyncio
async def test_audit_log_contains_entries(client):
    headers = await _login_admin(client)
    resp = await client.get("/audit", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


@pytest.mark.asyncio
async def test_csrf_rejects_cookie_auth_without_header(client):
    resp = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    assert resp.status_code == 200

    payload = {
        "sku": "BK-CSRF-001",
        "name": "Libro CSRF",
        "category": "Seguridad",
        "price": 10.0,
        "cost": 5.0,
        "stock": 1,
        "stock_min": 0,
    }
    blocked = await client.post("/products", json=payload)
    assert blocked.status_code == 403
    assert "CSRF" in blocked.text


@pytest.mark.asyncio
async def test_rate_limit_returns_429(client):
    old_limit = settings.rate_limit_per_minute
    old_window = settings.rate_limit_window_seconds
    try:
        settings.rate_limit_per_minute = 2
        settings.rate_limit_window_seconds = 60
        await rate_limiter.reset_for_tests()

        r1 = await client.get("/health")
        r2 = await client.get("/health")
        r3 = await client.get("/health")

        assert r1.status_code == 200
        assert r2.status_code == 200
        assert r3.status_code == 429
    finally:
        settings.rate_limit_per_minute = old_limit
        settings.rate_limit_window_seconds = old_window
        await rate_limiter.reset_for_tests()


@pytest.mark.asyncio
async def test_login_lockout_after_failed_attempts(client):
    headers = await _login_admin(client)
    create_resp = await client.post(
        "/users",
        headers=headers,
        json={
            "username": "lock_user",
            "password": "TestLock123",
            "role": "cashier",
            "is_active": True,
        },
    )
    assert create_resp.status_code == 201

    for _ in range(5):
        bad = await client.post("/auth/login", json={"username": "lock_user", "password": "wrong-pass"})
        assert bad.status_code == 401

    locked = await client.post("/auth/login", json={"username": "lock_user", "password": "TestLock123"})
    assert locked.status_code == 403
    assert "bloqueada" in (locked.text or "").lower()
