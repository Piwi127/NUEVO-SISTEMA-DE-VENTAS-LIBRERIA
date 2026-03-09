from datetime import date

import pytest


async def _login_admin(client) -> dict[str, str]:
    response = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    assert response.status_code == 200
    csrf = response.cookies.get("csrf_token")
    assert csrf
    return {"X-CSRF-Token": csrf}


@pytest.mark.asyncio
async def test_reports_operational_alerts_include_low_stock(client):
    headers = await _login_admin(client)
    create_product = await client.post(
        "/products",
        json={
            "sku": "BK-ALERT-001",
            "name": "Libro alerta",
            "category": "Alertas",
            "price": 10.0,
            "cost": 5.0,
            "stock": 0,
            "stock_min": 3,
        },
        headers=headers,
    )
    assert create_product.status_code == 201

    today = date.today().isoformat()
    response = await client.get(
        "/reports/alerts",
        params={"from_date": today, "to": today, "limit": 50},
        headers=headers,
    )
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)
    assert any(alert.get("code") in {"stock_critical", "stock_low"} for alert in payload)
