from datetime import datetime, timezone

import pytest


async def _login_admin(client):
    resp = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    assert resp.status_code == 200
    csrf = resp.cookies.get("csrf_token")
    assert csrf
    return {"X-CSRF-Token": csrf}


@pytest.mark.asyncio
async def test_receive_order_applies_direct_costs_to_purchase_total(client):
    headers = await _login_admin(client)

    supplier_resp = await client.post("/suppliers", json={"name": "Prov Fase17", "phone": "777"}, headers=headers)
    assert supplier_resp.status_code == 201
    supplier_id = supplier_resp.json()["id"]

    product_resp = await client.post(
        "/products",
        json={
            "sku": "BK-P17-PO-001",
            "name": "Producto PO costo real",
            "category": "Compras",
            "price": 20.0,
            "cost": 8.0,
            "stock": 0,
            "stock_min": 0,
        },
        headers=headers,
    )
    assert product_resp.status_code == 201
    product_id = product_resp.json()["id"]

    order_resp = await client.post(
        "/purchasing/orders",
        json={
            "supplier_id": supplier_id,
            "items": [{"product_id": product_id, "qty": 3, "unit_cost": 10.0}],
        },
        headers=headers,
    )
    assert order_resp.status_code == 201
    order_id = order_resp.json()["id"]

    receive_resp = await client.post(
        f"/purchasing/orders/{order_id}/receive",
        json={
            "items": [{"product_id": product_id, "qty": 3}],
            "direct_costs_breakdown": {"transport": 3.0},
        },
        headers=headers,
    )
    assert receive_resp.status_code == 200
    payload = receive_resp.json()
    assert payload["subtotal"] == pytest.approx(30.0)
    assert payload["direct_costs_total"] == pytest.approx(3.0)
    assert payload["total"] == pytest.approx(33.0)

    history_resp = await client.get("/purchases?limit=5", headers=headers)
    assert history_resp.status_code == 200
    purchase_row = next((row for row in history_resp.json() if row["id"] == payload["purchase_id"]), None)
    assert purchase_row is not None
    assert purchase_row["direct_costs_total"] == pytest.approx(3.0)


@pytest.mark.asyncio
async def test_bulk_pricing_apply_updates_multiple_products(client):
    headers = await _login_admin(client)

    first_resp = await client.post(
        "/products",
        json={
            "sku": "BK-P17-BULK-001",
            "name": "Producto bulk 1",
            "category": "Ajuste",
            "price": 10.0,
            "cost": 5.0,
            "stock": 1,
            "stock_min": 0,
        },
        headers=headers,
    )
    second_resp = await client.post(
        "/products",
        json={
            "sku": "BK-P17-BULK-002",
            "name": "Producto bulk 2",
            "category": "Ajuste",
            "price": 12.0,
            "cost": 6.0,
            "stock": 1,
            "stock_min": 0,
        },
        headers=headers,
    )
    assert first_resp.status_code == 201
    assert second_resp.status_code == 201
    first = first_resp.json()
    second = second_resp.json()

    bulk_resp = await client.post(
        "/catalog/pricing/bulk-apply",
        json={"desired_margin": "0.40", "product_ids": [first["id"], second["id"]]},
        headers=headers,
    )
    assert bulk_resp.status_code == 200
    payload = bulk_resp.json()
    assert payload["updated_count"] == 2
    assert payload["scope"] == "product_ids:2"
    for row in payload["items"]:
        assert row["new_margin"] == pytest.approx(0.4, abs=0.0001)
        assert row["new_sale_price"] > 0


@pytest.mark.asyncio
async def test_profitability_report_uses_sale_item_cost_snapshot(client):
    headers = await _login_admin(client)

    product_resp = await client.post(
        "/products",
        json={
            "sku": "BK-P17-PROFIT-001",
            "name": "Producto rentabilidad",
            "category": "Reportes",
            "price": 20.0,
            "cost": 10.0,
            "stock": 10,
            "stock_min": 1,
        },
        headers=headers,
    )
    assert product_resp.status_code == 201
    product = product_resp.json()

    open_resp = await client.post("/cash/open", json={"opening_amount": 100.0}, headers=headers)
    assert open_resp.status_code in {201, 409}

    sale_resp = await client.post(
        "/sales",
        json={
            "customer_id": None,
            "items": [{"product_id": product["id"], "qty": 2}],
            "payments": [{"method": "CASH", "amount": 40.0}],
            "subtotal": 40.0,
            "tax": 0.0,
            "discount": 0.0,
            "total": 40.0,
            "promotion_id": None,
        },
        headers=headers,
    )
    assert sale_resp.status_code == 201

    update_resp = await client.put(
        f"/products/{product['id']}",
        json={**product, "cost": 2.0, "unit_cost": 2.0},
        headers=headers,
    )
    assert update_resp.status_code == 200

    today = datetime.now(timezone.utc).date().isoformat()
    summary_resp = await client.get(f"/reports/profitability?from_date={today}&to={today}", headers=headers)
    assert summary_resp.status_code == 200
    summary = summary_resp.json()
    assert summary["sales_total"] == pytest.approx(40.0)
    assert summary["estimated_cost_total"] == pytest.approx(20.0)
    assert summary["gross_profit"] == pytest.approx(20.0)
    assert summary["margin_percent"] == pytest.approx(50.0)
