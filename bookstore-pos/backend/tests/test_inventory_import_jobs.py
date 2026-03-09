import asyncio

import pytest


async def _login_admin(client) -> dict[str, str]:
    response = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    assert response.status_code == 200
    csrf = response.cookies.get("csrf_token")
    assert csrf
    return {"X-CSRF-Token": csrf}


async def _wait_import_job_done(client, job_id: int, headers: dict[str, str]) -> dict:
    for _ in range(30):
        status_response = await client.get(f"/inventory/import-jobs/{job_id}", headers=headers)
        assert status_response.status_code == 200
        payload = status_response.json()
        if payload["status"] not in {"pending", "running"}:
            return payload
        await asyncio.sleep(0.1)
    raise AssertionError("El job no termino en el tiempo esperado")


@pytest.mark.asyncio
async def test_inventory_import_job_partial_and_errors_export(client):
    headers = await _login_admin(client)
    content = "\n".join(
        [
            "sku,name,category,price,cost,stock,stock_min",
            "BK-IMP-001,Libro bueno,Importacion,12.5,6.0,5,1",
            "BK-IMP-ERR,Libro malo,Importacion,abc,4.0,1,1",
        ]
    )

    create_response = await client.post(
        "/inventory/import-jobs",
        files={"file": ("inventory_job.csv", content, "text/csv")},
        headers=headers,
    )
    assert create_response.status_code == 201
    job_id = create_response.json()["id"]

    final_job = await _wait_import_job_done(client, job_id, headers)
    assert final_job["status"] == "partial"
    assert final_job["success_rows"] == 1
    assert final_job["error_rows"] == 1

    errors_response = await client.get(f"/inventory/import-jobs/{job_id}/errors", headers=headers)
    assert errors_response.status_code == 200
    payload = errors_response.json()
    assert payload["job_id"] == job_id
    assert payload["total_errors"] == 1
    assert len(payload["items"]) == 1
    assert "price" in payload["items"][0]["detail"]

    csv_response = await client.get(f"/inventory/import-jobs/{job_id}/errors?format=csv", headers=headers)
    assert csv_response.status_code == 200
    assert "text/csv" in (csv_response.headers.get("content-type") or "")
    assert "row_number" in csv_response.text


@pytest.mark.asyncio
async def test_kardex_cursor_pagination_and_filters(client):
    headers = await _login_admin(client)
    product_response = await client.post(
        "/products",
        json={
            "sku": "BK-KARDEX-001",
            "name": "Libro kardex",
            "category": "Inventario",
            "price": 10.0,
            "cost": 4.0,
            "stock": 0,
            "stock_min": 0,
        },
        headers=headers,
    )
    assert product_response.status_code == 201
    product_id = product_response.json()["id"]

    for index in range(4):
        movement_response = await client.post(
            "/inventory/movement",
            json={"product_id": product_id, "type": "ADJ", "qty": index + 1, "ref": f"KARDEX-{index}"},
            headers=headers,
        )
        assert movement_response.status_code == 201

    first_page = await client.get(f"/inventory/kardex/{product_id}?limit=2&type=ADJ", headers=headers)
    assert first_page.status_code == 200
    first_payload = first_page.json()
    assert len(first_payload["items"]) == 2
    assert first_payload["has_more"] is True
    assert first_payload["next_cursor"]

    second_page = await client.get(
        f"/inventory/kardex/{product_id}?limit=2&type=ADJ&cursor={first_payload['next_cursor']}",
        headers=headers,
    )
    assert second_page.status_code == 200
    second_payload = second_page.json()
    assert len(second_payload["items"]) >= 2

    first_ids = {item["id"] for item in first_payload["items"]}
    second_ids = {item["id"] for item in second_payload["items"]}
    assert first_ids.isdisjoint(second_ids)
