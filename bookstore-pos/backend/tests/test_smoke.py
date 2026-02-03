import pytest


async def _login_admin(client):
    resp = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    assert resp.status_code == 200
    data = resp.json()
    return data["access_token"]


@pytest.mark.asyncio
async def test_public_settings(client):
    resp = await client.get("/settings/public")
    assert resp.status_code == 200
    data = resp.json()
    assert data["project_name"] == "Bookstore POS"
    assert data["default_warehouse_id"] is not None


@pytest.mark.asyncio
async def test_login_admin(client):
    token = await _login_admin(client)
    assert token


@pytest.mark.asyncio
async def test_product_sale_flow(client):
    token = await _login_admin(client)
    headers = {"Authorization": f"Bearer {token}"}

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
    token = await _login_admin(client)
    headers = {"Authorization": f"Bearer {token}"}
    resp = await client.get("/audit", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 1
