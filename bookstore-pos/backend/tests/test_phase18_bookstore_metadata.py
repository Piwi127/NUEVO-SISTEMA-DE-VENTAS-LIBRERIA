import pytest


async def _login_admin(client):
    resp = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    assert resp.status_code == 200
    csrf = resp.cookies.get("csrf_token")
    assert csrf
    return {"X-CSRF-Token": csrf}


@pytest.mark.asyncio
async def test_product_bookstore_metadata_is_searchable(client):
    headers = await _login_admin(client)
    payload = {
        "sku": "BK-META-001",
        "name": "Matematica 5 Primaria",
        "author": "Ana Perez",
        "publisher": "Editorial Horizonte",
        "isbn": "978-612-0000001",
        "barcode": "750123450001",
        "shelf_location": "A1-P2",
        "category": "Libros escolares",
        "tags": "texto primaria matematica",
        "price": 55.0,
        "cost": 24.0,
        "stock": 7,
        "stock_min": 2,
    }

    create_resp = await client.post("/products", json=payload, headers=headers)
    assert create_resp.status_code == 201
    created = create_resp.json()
    assert created["author"] == "Ana Perez"
    assert created["publisher"] == "Editorial Horizonte"
    assert created["isbn"] == "9786120000001"
    assert created["barcode"] == "750123450001"
    assert created["shelf_location"] == "A1-P2"

    author_search = await client.get("/products?search=Ana%20Perez", headers=headers)
    assert author_search.status_code == 200
    assert any(item["id"] == created["id"] for item in author_search.json())

    isbn_search = await client.get("/products?search=9786120000001", headers=headers)
    assert isbn_search.status_code == 200
    assert any(item["id"] == created["id"] for item in isbn_search.json())

    barcode_search = await client.get("/products?search=750123450001", headers=headers)
    assert barcode_search.status_code == 200
    assert any(item["id"] == created["id"] for item in barcode_search.json())


@pytest.mark.asyncio
async def test_product_rejects_duplicate_book_identifiers(client):
    headers = await _login_admin(client)

    first_resp = await client.post(
        "/products",
        json={
            "sku": "BK-META-002",
            "name": "Lenguaje 4 Primaria",
            "author": "Luis Gomez",
            "publisher": "Editorial Centro",
            "isbn": "9786120000002",
            "barcode": "750123450002",
            "shelf_location": "B2-P1",
            "category": "Libros escolares",
            "tags": "lenguaje primaria",
            "price": 48.0,
            "cost": 21.0,
            "stock": 5,
            "stock_min": 1,
        },
        headers=headers,
    )
    assert first_resp.status_code == 201

    dup_isbn_resp = await client.post(
        "/products",
        json={
            "sku": "BK-META-003",
            "name": "Lenguaje 4 Primaria guia",
            "isbn": "9786120000002",
            "barcode": "750123450003",
            "price": 42.0,
            "cost": 20.0,
            "stock": 1,
            "stock_min": 0,
        },
        headers=headers,
    )
    assert dup_isbn_resp.status_code == 409
    assert "ISBN duplicado" in dup_isbn_resp.text

    dup_barcode_resp = await client.post(
        "/products",
        json={
            "sku": "BK-META-004",
            "name": "Lenguaje 4 Primaria practica",
            "isbn": "9786120000004",
            "barcode": "750123450002",
            "price": 42.0,
            "cost": 20.0,
            "stock": 1,
            "stock_min": 0,
        },
        headers=headers,
    )
    assert dup_barcode_resp.status_code == 409
    assert "Codigo de barras duplicado" in dup_barcode_resp.text
