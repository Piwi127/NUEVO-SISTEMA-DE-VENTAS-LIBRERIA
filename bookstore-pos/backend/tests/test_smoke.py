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
async def test_readiness_endpoint(client):
    resp = await client.get("/health/ready")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["checks"]["database"] == "ok"


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
async def test_login_rate_limit_returns_429(client):
    old_login_limit = settings.auth_login_rate_limit_count
    old_login_window = settings.auth_login_rate_limit_window_seconds
    try:
        settings.auth_login_rate_limit_count = 2
        settings.auth_login_rate_limit_window_seconds = 60
        await rate_limiter.reset_for_tests()

        r1 = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})
        r2 = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})
        r3 = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})

        assert r1.status_code == 200
        assert r2.status_code == 200
        assert r3.status_code == 429
    finally:
        settings.auth_login_rate_limit_count = old_login_limit
        settings.auth_login_rate_limit_window_seconds = old_login_window
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


@pytest.mark.asyncio
async def test_returns_history_endpoint(client):
    headers = await _login_admin(client)

    product_payload = {
        "sku": "BK-RET-001",
        "name": "Libro Retorno",
        "category": "Pruebas",
        "price": 15.0,
        "cost": 7.0,
        "stock": 6,
        "stock_min": 1,
    }
    resp = await client.post("/products", json=product_payload, headers=headers)
    assert resp.status_code == 201
    product = resp.json()

    open_resp = await client.post("/cash/open", json={"opening_amount": 50.0}, headers=headers)
    assert open_resp.status_code in {201, 409}

    sale_resp = await client.post(
        "/sales",
        json={
            "customer_id": None,
            "items": [{"product_id": product["id"], "qty": 1}],
            "payments": [{"method": "CASH", "amount": 15.0}],
            "subtotal": 15.0,
            "tax": 0.0,
            "discount": 0.0,
            "total": 15.0,
            "promotion_id": None,
        },
        headers=headers,
    )
    assert sale_resp.status_code == 201
    sale_id = sale_resp.json()["id"]

    ret_resp = await client.post(f"/returns/{sale_id}", json={"reason": "Cliente cancelo"}, headers=headers)
    assert ret_resp.status_code == 201

    hist_resp = await client.get("/returns?limit=20", headers=headers)
    assert hist_resp.status_code == 200
    rows = hist_resp.json()
    match = next((r for r in rows if r["sale_id"] == sale_id), None)
    assert match is not None
    assert match["sale_status"] == "VOID"


@pytest.mark.asyncio
async def test_cash_session_report_endpoint(client):
    headers = await _login_admin(client)
    open_resp = await client.post("/cash/open", json={"opening_amount": 80.0}, headers=headers)
    if open_resp.status_code == 201:
        session_id = open_resp.json()["id"]
    else:
        assert open_resp.status_code == 409
        current = await client.get("/cash/current", headers=headers)
        assert current.status_code == 200
        current_data = current.json()
        assert current_data
        session_id = current_data["id"]

    move_resp = await client.post(
        "/cash/movement",
        json={"type": "IN", "amount": 20.0, "reason": "Ajuste prueba"},
        headers=headers,
    )
    assert move_resp.status_code == 201

    summary_resp = await client.get("/cash/summary", headers=headers)
    assert summary_resp.status_code == 200
    expected = summary_resp.json()["expected_amount"]

    audit_resp = await client.post(
        "/cash/audit",
        json={"type": "Z", "counted_amount": expected},
        headers=headers,
    )
    assert audit_resp.status_code == 201

    report_resp = await client.get(f"/cash/sessions/{session_id}/report", headers=headers)
    assert report_resp.status_code == 200
    report = report_resp.json()
    assert report["session"]["id"] == session_id
    assert report["validation"]["audit_count"] >= 1

    export_resp = await client.get(f"/cash/sessions/{session_id}/report/export", headers=headers)
    assert export_resp.status_code == 200
    assert "REPORTE DE CAJA" in export_resp.text


@pytest.mark.asyncio
async def test_close_cash_requires_z_audit(client):
    headers = await _login_admin(client)
    open_resp = await client.post("/cash/open", json={"opening_amount": 30.0}, headers=headers)
    assert open_resp.status_code in {201, 409}

    close_resp = await client.post("/cash/close", json={}, headers=headers)
    assert close_resp.status_code == 409
    assert "tipo Z" in (close_resp.text or "")
