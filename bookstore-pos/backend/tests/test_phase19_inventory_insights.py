from datetime import datetime, timezone

import pytest


async def _login_admin(client):
    resp = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    assert resp.status_code == 200
    csrf = resp.cookies.get("csrf_token")
    assert csrf
    return {"X-CSRF-Token": csrf}


async def _create_product(client, headers, *, sku: str, name: str, stock: int, stock_min: int):
    resp = await client.post(
        "/products",
        json={
            "sku": sku,
            "name": name,
            "author": "Autor de prueba",
            "publisher": "Editorial de prueba",
            "isbn": f"978{sku[-6:]}",
            "category": "Reportes",
            "price": 10.0,
            "cost": 4.0,
            "stock": stock,
            "stock_min": stock_min,
        },
        headers=headers,
    )
    assert resp.status_code == 201
    return resp.json()


@pytest.mark.asyncio
async def test_rotation_report_exposes_stock_coverage_and_status(client):
    headers = await _login_admin(client)
    product = await _create_product(
        client,
        headers,
        sku="BK-P19-ROT-001",
        name="Libro de alta rotacion",
        stock=5,
        stock_min=3,
    )

    open_resp = await client.post("/cash/open", json={"opening_amount": 100.0}, headers=headers)
    assert open_resp.status_code in {201, 409}

    sale_resp = await client.post(
        "/sales",
        json={
            "customer_id": None,
            "items": [{"product_id": product["id"], "qty": 4}],
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

    today = datetime.now(timezone.utc).date().isoformat()
    report_resp = await client.get(f"/reports/rotation?from_date={today}&to={today}&limit=50", headers=headers)
    assert report_resp.status_code == 200

    row = next(item for item in report_resp.json() if item["product_id"] == product["id"])
    assert row["sku"] == product["sku"]
    assert row["qty_sold"] == 4
    assert row["sales_total"] == pytest.approx(40.0)
    assert row["avg_daily_sales"] == pytest.approx(4.0)
    assert row["stock_coverage_days"] == pytest.approx(0.25)
    assert row["stock_status"] == "critical"
    assert row["author"] == "Autor de prueba"


@pytest.mark.asyncio
async def test_replenishment_report_suggests_purchase_and_exports_csv(client):
    headers = await _login_admin(client)
    product = await _create_product(
        client,
        headers,
        sku="BK-P19-REP-001",
        name="Cuaderno para reponer",
        stock=6,
        stock_min=4,
    )

    open_resp = await client.post("/cash/open", json={"opening_amount": 100.0}, headers=headers)
    assert open_resp.status_code in {201, 409}

    sale_resp = await client.post(
        "/sales",
        json={
            "customer_id": None,
            "items": [{"product_id": product["id"], "qty": 4}],
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

    today = datetime.now(timezone.utc).date().isoformat()
    report_resp = await client.get(
        f"/reports/replenishment?from_date={today}&to={today}&target_days=7&limit=50",
        headers=headers,
    )
    assert report_resp.status_code == 200

    row = next(item for item in report_resp.json() if item["product_id"] == product["id"])
    assert row["qty_sold"] == 4
    assert row["avg_daily_sales"] == pytest.approx(4.0)
    assert row["stock_coverage_days"] == pytest.approx(0.5)
    assert row["target_stock"] == 28
    assert row["suggested_qty"] == 26
    assert row["urgency"] == "urgent"

    export_resp = await client.get(
        f"/reports/replenishment/export?from_date={today}&to={today}&target_days=7&limit=50",
        headers=headers,
    )
    assert export_resp.status_code == 200
    assert "suggested_qty" in export_resp.text
    assert product["sku"] in export_resp.text
