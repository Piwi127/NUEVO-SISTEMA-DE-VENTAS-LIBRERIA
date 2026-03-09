import importlib.util

import pytest


async def _login_admin(client):
    resp = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    assert resp.status_code == 200
    csrf = resp.cookies.get("csrf_token")
    assert csrf
    return {"X-CSRF-Token": csrf}


async def _create_product(client, headers, sku: str):
    resp = await client.post(
        "/products",
        json={
            "sku": sku,
            "name": f"Producto {sku}",
            "category": "Pruebas",
            "price": 10.0,
            "cost": 4.0,
            "stock": 30,
            "stock_min": 1,
        },
        headers=headers,
    )
    assert resp.status_code == 201
    return resp.json()


@pytest.mark.asyncio
async def test_sale_document_type_validation(client):
    headers = await _login_admin(client)
    product = await _create_product(client, headers, "DOC-TYPE-001")
    open_cash = await client.post("/cash/open", json={"opening_amount": 100.0}, headers=headers)
    assert open_cash.status_code in {201, 409}

    base_payload = {
        "customer_id": None,
        "items": [{"product_id": product["id"], "qty": 1}],
        "payments": [{"method": "CASH", "amount": 10.0}],
        "subtotal": 10.0,
        "tax": 0.0,
        "discount": 0.0,
        "total": 10.0,
        "promotion_id": None,
        "document_type": "FACTURA",
    }

    no_customer = await client.post("/sales", json=base_payload, headers=headers)
    assert no_customer.status_code == 400

    customer_resp = await client.post(
        "/customers",
        json={"name": "Cliente Factura", "phone": None, "tax_id": "20111111111", "address": "Av 123", "email": "c@x.com"},
        headers=headers,
    )
    assert customer_resp.status_code == 201
    customer = customer_resp.json()

    ok_payload = {**base_payload, "customer_id": customer["id"]}
    ok_sale = await client.post("/sales", json=ok_payload, headers=headers)
    assert ok_sale.status_code == 201
    assert ok_sale.json()["document_type"] == "FACTURA"


@pytest.mark.asyncio
async def test_document_templates_crud_preview_and_render(client):
    headers = await _login_admin(client)

    list_resp = await client.get("/document-templates?document_type=TICKET", headers=headers)
    assert list_resp.status_code == 200

    schema_json = (
        '{"schema_version":1,"paper":{"code":"THERMAL_80","width_mm":80,"height_mm":null,'
        '"margins_mm":{"top":2,"right":2,"bottom":2,"left":2}},'
        '"styles":{"base_font_family":"Arial","base_font_size":9},'
        '"elements":[{"id":"t1","type":"text","x_mm":2,"y_mm":2,"w_mm":70,"h_mm":5,'
        '"visible":true,"content":"{{company_name}}"}]}'
    )
    create_resp = await client.post(
        "/document-templates",
        json={
            "name": "Ticket Test",
            "document_type": "TICKET",
            "paper_code": "THERMAL_80",
            "paper_width_mm": 80,
            "paper_height_mm": None,
            "margin_top_mm": 2,
            "margin_right_mm": 2,
            "margin_bottom_mm": 2,
            "margin_left_mm": 2,
            "scope_type": "GLOBAL",
            "scope_ref_id": None,
            "is_active": True,
            "is_default": False,
            "schema_json": schema_json,
        },
        headers=headers,
    )
    assert create_resp.status_code == 201
    template = create_resp.json()

    preview = await client.post(
        "/document-templates/preview",
        json={"document_type": "TICKET", "schema_json": schema_json},
        headers=headers,
    )
    assert preview.status_code == 200
    assert "Bookstore POS" in preview.json()["html"]

    product = await _create_product(client, headers, "DOC-PRINT-001")
    open_cash = await client.post("/cash/open", json={"opening_amount": 50.0}, headers=headers)
    assert open_cash.status_code in {201, 409}
    sale_resp = await client.post(
        "/sales",
        json={
            "customer_id": None,
            "items": [{"product_id": product["id"], "qty": 2}],
            "payments": [{"method": "CASH", "amount": 20.0}],
            "subtotal": 20.0,
            "tax": 0.0,
            "discount": 0.0,
            "total": 20.0,
            "promotion_id": None,
            "document_type": "TICKET",
        },
        headers=headers,
    )
    assert sale_resp.status_code == 201
    sale = sale_resp.json()

    set_default = await client.post(f"/document-templates/{template['id']}/set-default", headers=headers)
    assert set_default.status_code == 200

    html_resp = await client.get(f"/printing/document/{sale['id']}/html", headers=headers)
    assert html_resp.status_code == 200
    assert "text/html" in html_resp.headers.get("content-type", "")


@pytest.mark.asyncio
async def test_boleta_default_uses_legal_layout_with_dynamic_fields(client):
    headers = await _login_admin(client)
    product_one = await _create_product(client, headers, "DOC-LEGAL-001")
    product_two = await _create_product(client, headers, "DOC-LEGAL-002")

    customer_resp = await client.post(
        "/customers",
        json={
            "name": "Cliente Boleta",
            "phone": "999111222",
            "tax_id": "10445566771",
            "address": "Av Legal 123",
            "email": "cliente.boleta@test.com",
        },
        headers=headers,
    )
    assert customer_resp.status_code == 201
    customer = customer_resp.json()

    open_cash = await client.post("/cash/open", json={"opening_amount": 50.0}, headers=headers)
    assert open_cash.status_code in {201, 409}

    sale_resp = await client.post(
        "/sales",
        json={
            "customer_id": customer["id"],
            "items": [
                {"product_id": product_one["id"], "qty": 2},
                {"product_id": product_two["id"], "qty": 1},
            ],
            "payments": [{"method": "CASH", "amount": 30.0}],
            "subtotal": 30.0,
            "tax": 0.0,
            "discount": 0.0,
            "total": 30.0,
            "promotion_id": None,
            "document_type": "BOLETA",
        },
        headers=headers,
    )
    assert sale_resp.status_code == 201
    sale = sale_resp.json()

    html_resp = await client.get(f"/printing/document/{sale['id']}/html", headers=headers)
    assert html_resp.status_code == 200
    body = html_resp.text
    assert "Facturar a" in body
    assert "Cliente Boleta" in body
    assert "Producto DOC-LEGAL-001" in body
    assert "Producto DOC-LEGAL-002" in body
    assert "de Factura" in body
    assert sale["invoice_number"] in body
    assert "doc-shell" in body

    text_resp = await client.get(f"/printing/document/{sale['id']}/text", headers=headers)
    assert text_resp.status_code == 200
    assert "Cliente: Cliente Boleta" in text_resp.text

    pdf_resp = await client.get(f"/printing/document/{sale['id']}/pdf", headers=headers)
    if importlib.util.find_spec("reportlab") is not None:
        assert pdf_resp.status_code == 200
        assert "application/pdf" in pdf_resp.headers.get("content-type", "")
        assert pdf_resp.content.startswith(b"%PDF")
    else:
        assert pdf_resp.status_code == 500
        payload = pdf_resp.json()
        assert "No se pudo generar PDF legal" in payload.get("detail", "")
