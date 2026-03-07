import pytest
from sqlalchemy import text

# Assuming an existing test fixture setup exists that mirrors test_smoke.py
# If there are additional imports from test_smoke.py needed, add them here.
from app.core.config import settings

async def _login_admin(client):
    resp = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    assert resp.status_code == 200
    csrf = resp.cookies.get("csrf_token")
    assert csrf
    return {"X-CSRF-Token": csrf}

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
    assert resp.status_code in {201, 409}

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
