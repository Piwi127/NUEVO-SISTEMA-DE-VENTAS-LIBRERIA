import pytest
from sqlalchemy import text

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
async def test_sqlite_foreign_keys_enabled_in_test_db(client):
    import app.db.session as db_session

    async with db_session.AsyncSessionLocal() as session:
        pragma_result = await session.execute(text("PRAGMA foreign_keys"))
        assert pragma_result.scalar() == 1


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


import pytest
from sqlalchemy import text

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
async def test_sqlite_foreign_keys_enabled_in_test_db(client):
    import app.db.session as db_session

    async with db_session.AsyncSessionLocal() as session:
        pragma_result = await session.execute(text("PRAGMA foreign_keys"))
        assert pragma_result.scalar() == 1


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
async def test_delete_product_with_stock_only_succeeds(client):
    headers = await _login_admin(client)
    resp = await client.post(
        "/products",
        json={
            "sku": "BK-DEL-OK-001",
            "name": "Libro borrar stock",
            "category": "Pruebas",
            "price": 12.0,
            "cost": 6.0,
            "stock": 4,
            "stock_min": 0,
        },
        headers=headers,
    )
    assert resp.status_code == 201
    product_id = resp.json()["id"]

    delete_resp = await client.delete(f"/products/{product_id}", headers=headers)
    assert delete_resp.status_code == 200
    assert delete_resp.json()["ok"] is True

    get_resp = await client.get(f"/products/{product_id}", headers=headers)
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_product_used_in_sale_returns_409(client):
    headers = await _login_admin(client)
    resp = await client.post(
        "/products",
        json={
            "sku": "BK-DEL-USED-001",
            "name": "Libro borrar usado",
            "category": "Pruebas",
            "price": 25.0,
            "cost": 10.0,
            "stock": 3,
            "stock_min": 0,
        },
        headers=headers,
    )
    assert resp.status_code == 201
    product = resp.json()

    open_resp = await client.post("/cash/open", json={"opening_amount": 100.0}, headers=headers)
    assert open_resp.status_code in {201, 409}

    sale_resp = await client.post(
        "/sales",
        json={
            "customer_id": None,
            "items": [{"product_id": product["id"], "qty": 1}],
            "payments": [{"method": "CASH", "amount": 25.0}],
            "subtotal": 25.0,
            "tax": 0.0,
            "discount": 0.0,
            "total": 25.0,
            "promotion_id": None,
        },
        headers=headers,
    )
    assert sale_resp.status_code == 201

    delete_resp = await client.delete(f"/products/{product['id']}", headers=headers)
    assert delete_resp.status_code == 409
    assert "No se puede eliminar el producto" in delete_resp.text


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
async def test_csrf_protects_2fa_setup(client):
    resp = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    assert resp.status_code == 200

    blocked = await client.post("/auth/2fa/setup")
    assert blocked.status_code == 403
    assert "CSRF" in blocked.text

    csrf = resp.cookies.get("csrf_token")
    allowed = await client.post("/auth/2fa/setup", headers={"X-CSRF-Token": csrf})
    assert allowed.status_code == 200
    payload = allowed.json()
    assert payload.get("secret")
    assert payload.get("otpauth")


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
async def test_cash_movement_rejects_invalid_payload(client):
    headers = await _login_admin(client)
    open_resp = await client.post("/cash/open", json={"opening_amount": 70.0}, headers=headers)
    assert open_resp.status_code in {201, 409}

    invalid_type = await client.post(
        "/cash/movement",
        json={"type": "BAD", "amount": 10.0, "reason": "Tipo invalido"},
        headers=headers,
    )
    assert invalid_type.status_code == 400

    invalid_amount = await client.post(
        "/cash/movement",
        json={"type": "IN", "amount": 0, "reason": "Monto invalido"},
        headers=headers,
    )
    assert invalid_amount.status_code == 400


@pytest.mark.asyncio
async def test_sales_cash_summary_counts_lowercase_cash_method(client):
    headers = await _login_admin(client)
    open_resp = await client.post("/cash/open", json={"opening_amount": 120.0}, headers=headers)
    assert open_resp.status_code in {201, 409}

    summary_before_resp = await client.get("/cash/summary", headers=headers)
    assert summary_before_resp.status_code == 200
    summary_before = summary_before_resp.json()

    product_resp = await client.post(
        "/products",
        json={
            "sku": "BK-CASH-LOWER-001",
            "name": "Libro cash lower",
            "category": "Caja",
            "price": 17.0,
            "cost": 6.0,
            "stock": 3,
            "stock_min": 0,
        },
        headers=headers,
    )
    assert product_resp.status_code == 201
    product = product_resp.json()

    sale_resp = await client.post(
        "/sales",
        json={
            "customer_id": None,
            "items": [{"product_id": product["id"], "qty": 1}],
            "payments": [{"method": "cash", "amount": 17.0}],
            "subtotal": 17.0,
            "tax": 0.0,
            "discount": 0.0,
            "total": 17.0,
            "promotion_id": None,
        },
        headers=headers,
    )
    assert sale_resp.status_code == 201

    summary_after_resp = await client.get("/cash/summary", headers=headers)
    assert summary_after_resp.status_code == 200
    summary_after = summary_after_resp.json()

    before_sales_cash = float(summary_before["sales_cash"])
    after_sales_cash = float(summary_after["sales_cash"])
    assert after_sales_cash - before_sales_cash == pytest.approx(17.0)


@pytest.mark.asyncio
async def test_cash_audit_log_persists_entity_id(client):
    headers = await _login_admin(client)
    open_resp = await client.post("/cash/open", json={"opening_amount": 60.0}, headers=headers)
    assert open_resp.status_code in {201, 409}

    summary_resp = await client.get("/cash/summary", headers=headers)
    assert summary_resp.status_code == 200
    expected = summary_resp.json()["expected_amount"]

    audit_resp = await client.post(
        "/cash/audit",
        json={"type": "X", "counted_amount": expected},
        headers=headers,
    )
    assert audit_resp.status_code == 201
    audit_id = audit_resp.json()["id"]

    logs_resp = await client.get("/audit", headers=headers)
    assert logs_resp.status_code == 200
    logs = logs_resp.json()
    row = next((item for item in logs if item["action"] == "cash_audit" and item["entity_id"] == str(audit_id)), None)
    assert row is not None


@pytest.mark.asyncio
async def test_warehouse_batch_audit_log_persists_entity_id(client):
    headers = await _login_admin(client)

    product_resp = await client.post(
        "/products",
        json={
            "sku": "BK-BATCH-AUDIT-001",
            "name": "Libro batch audit",
            "category": "Inventario",
            "price": 21.0,
            "cost": 9.0,
            "stock": 0,
            "stock_min": 0,
        },
        headers=headers,
    )
    assert product_resp.status_code == 201
    product_id = product_resp.json()["id"]

    warehouses_resp = await client.get("/warehouses", headers=headers)
    assert warehouses_resp.status_code == 200
    warehouse_id = warehouses_resp.json()[0]["id"]

    batch_resp = await client.post(
        "/warehouses/batch",
        json={
            "product_id": product_id,
            "warehouse_id": warehouse_id,
            "lot": "BATCH-AUDIT-001",
            "expiry_date": "",
            "qty": 2,
            "unit_cost": 9.0,
            "direct_cost_allocated": 0,
            "source_type": "TEST",
            "source_ref": "SMOKE",
        },
        headers=headers,
    )
    assert batch_resp.status_code == 201

    logs_resp = await client.get("/audit", headers=headers)
    assert logs_resp.status_code == 200
    logs = logs_resp.json()
    row = next((item for item in logs if item["action"] == "warehouse_batch"), None)
    assert row is not None
    assert row["entity_id"] not in {"", "None"}


@pytest.mark.asyncio
async def test_close_cash_requires_z_audit(client):
    headers = await _login_admin(client)
    open_resp = await client.post("/cash/open", json={"opening_amount": 30.0}, headers=headers)
    assert open_resp.status_code in {201, 409}

    close_resp = await client.post("/cash/close", json={}, headers=headers)
    assert close_resp.status_code == 409
    assert "tipo Z" in (close_resp.text or "")


@pytest.mark.asyncio
async def test_purchase_total_is_calculated_server_side(client):
    headers = await _login_admin(client)

    supplier_resp = await client.post("/suppliers", json={"name": "Prov test", "phone": "999"}, headers=headers)
    assert supplier_resp.status_code == 201
    supplier_id = supplier_resp.json()["id"]

    product_resp = await client.post(
        "/products",
        json={
            "sku": "BK-PUR-001",
            "name": "Libro compra",
            "category": "Compras",
            "price": 20.0,
            "cost": 5.0,
            "stock": 0,
            "stock_min": 0,
        },
        headers=headers,
    )
    assert product_resp.status_code == 201
    product_id = product_resp.json()["id"]

    purchase_resp = await client.post(
        "/purchases",
        json={
            "supplier_id": supplier_id,
            "items": [{"product_id": product_id, "qty": 3, "unit_cost": 7.5}],
            "total": 1.0,
        },
        headers=headers,
    )
    assert purchase_resp.status_code == 201
    assert purchase_resp.json()["total"] == pytest.approx(22.5)


@pytest.mark.asyncio
async def test_purchase_rejects_negative_qty(client):
    headers = await _login_admin(client)

    supplier_resp = await client.post("/suppliers", json={"name": "Prov qty", "phone": "111"}, headers=headers)
    assert supplier_resp.status_code == 201
    supplier_id = supplier_resp.json()["id"]

    product_resp = await client.post(
        "/products",
        json={
            "sku": "BK-PUR-NEG-001",
            "name": "Libro negativo",
            "category": "Compras",
            "price": 18.0,
            "cost": 4.0,
            "stock": 0,
            "stock_min": 0,
        },
        headers=headers,
    )
    assert product_resp.status_code == 201
    product_id = product_resp.json()["id"]

    purchase_resp = await client.post(
        "/purchases",
        json={
            "supplier_id": supplier_id,
            "items": [{"product_id": product_id, "qty": -2, "unit_cost": 4.0}],
            "total": 0,
        },
        headers=headers,
    )
    assert purchase_resp.status_code == 422


@pytest.mark.asyncio
async def test_purchase_rejects_unknown_supplier(client):
    headers = await _login_admin(client)

    product_resp = await client.post(
        "/products",
        json={
            "sku": "BK-PUR-UNK-001",
            "name": "Libro proveedor invalido",
            "category": "Compras",
            "price": 18.0,
            "cost": 4.0,
            "stock": 0,
            "stock_min": 0,
        },
        headers=headers,
    )
    assert product_resp.status_code == 201
    product_id = product_resp.json()["id"]

    purchase_resp = await client.post(
        "/purchases",
        json={
            "supplier_id": 999999,
            "items": [{"product_id": product_id, "qty": 1, "unit_cost": 4.0}],
            "total": 0,
        },
        headers=headers,
    )
    assert purchase_resp.status_code == 404
    assert "Proveedor" in purchase_resp.text


@pytest.mark.asyncio
async def test_purchase_order_rejects_unknown_supplier(client):
    headers = await _login_admin(client)

    product_resp = await client.post(
        "/products",
        json={
            "sku": "BK-PO-UNK-001",
            "name": "Libro OC invalida",
            "category": "Compras",
            "price": 22.0,
            "cost": 6.0,
            "stock": 0,
            "stock_min": 0,
        },
        headers=headers,
    )
    assert product_resp.status_code == 201
    product_id = product_resp.json()["id"]

    po_resp = await client.post(
        "/purchasing/orders",
        json={
            "supplier_id": 999999,
            "items": [{"product_id": product_id, "qty": 2, "unit_cost": 6.0}],
        },
        headers=headers,
    )
    assert po_resp.status_code == 404
    assert "Proveedor" in po_resp.text


@pytest.mark.asyncio
async def test_receive_order_rejects_product_not_in_order(client):
    headers = await _login_admin(client)

    supplier_resp = await client.post("/suppliers", json={"name": "Prov receive", "phone": "555"}, headers=headers)
    assert supplier_resp.status_code == 201
    supplier_id = supplier_resp.json()["id"]

    product_a_resp = await client.post(
        "/products",
        json={
            "sku": "BK-PO-REC-A-001",
            "name": "Libro OC A",
            "category": "Compras",
            "price": 20.0,
            "cost": 7.0,
            "stock": 0,
            "stock_min": 0,
        },
        headers=headers,
    )
    assert product_a_resp.status_code == 201
    product_a_id = product_a_resp.json()["id"]

    product_b_resp = await client.post(
        "/products",
        json={
            "sku": "BK-PO-REC-B-001",
            "name": "Libro OC B",
            "category": "Compras",
            "price": 24.0,
            "cost": 8.0,
            "stock": 0,
            "stock_min": 0,
        },
        headers=headers,
    )
    assert product_b_resp.status_code == 201
    product_b_id = product_b_resp.json()["id"]

    po_resp = await client.post(
        "/purchasing/orders",
        json={
            "supplier_id": supplier_id,
            "items": [{"product_id": product_a_id, "qty": 3, "unit_cost": 7.0}],
        },
        headers=headers,
    )
    assert po_resp.status_code == 201
    order_id = po_resp.json()["id"]

    receive_resp = await client.post(
        f"/purchasing/orders/{order_id}/receive",
        json={"items": [{"product_id": product_b_id, "qty": 1}]},
        headers=headers,
    )
    assert receive_resp.status_code == 400
    assert "fuera de la OC" in receive_resp.text


@pytest.mark.asyncio
async def test_supplier_payment_rejects_unknown_supplier(client):
    headers = await _login_admin(client)

    pay_resp = await client.post(
        "/purchasing/payments",
        json={"supplier_id": 999999, "amount": 50.0, "method": "CASH", "reference": "R-1"},
        headers=headers,
    )
    assert pay_resp.status_code == 404
    assert "Proveedor" in pay_resp.text


@pytest.mark.asyncio
async def test_inventory_upload_rejects_invalid_numeric_values(client):
    await rate_limiter.reset_for_tests()
    headers = await _login_admin(client)
    content = "\n".join(
        [
            "sku,name,category,price,cost,stock,stock_min",
            "BK-BAD-001,Libro malo,Errores,abc,2,1,1",
        ]
    )
    resp = await client.post(
        "/inventory/upload",
        files={"file": ("inventory_bad.csv", content, "text/csv")},
        headers=headers,
    )
    assert resp.status_code == 400
    assert "Fila 2" in resp.text


@pytest.mark.asyncio
async def test_inventory_upload_ignores_empty_rows(client):
    await rate_limiter.reset_for_tests()
    headers = await _login_admin(client)
    content = "\n".join(
        [
            "sku,name,category,price,cost,stock,stock_min",
            "BK-OK-EMPTY-001,Libro ok,Import,10,5,2,1",
            "",
        ]
    )
    resp = await client.post(
        "/inventory/upload",
        files={"file": ("inventory_empty_rows.csv", content, "text/csv")},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["count"] == 1


@pytest.mark.asyncio
async def test_inventory_upload_xlsx_without_headers_returns_400(client):
    await rate_limiter.reset_for_tests()
    headers = await _login_admin(client)
    try:
        from openpyxl import Workbook
    except Exception:
        pytest.skip("openpyxl no disponible")

    import io

    wb = Workbook()
    ws = wb.active
    ws["A1"] = ""
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    resp = await client.post(
        "/inventory/upload",
        files={
            "file": (
                "inventory_no_headers.xlsx",
                buffer.getvalue(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
        headers=headers,
    )
    assert resp.status_code == 400
    assert "encabezados" in resp.text.lower()
