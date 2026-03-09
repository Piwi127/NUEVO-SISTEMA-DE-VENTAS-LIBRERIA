import pytest

from app.core.config import settings


async def _login_admin(client):
    response = await client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    assert response.status_code == 200
    csrf = response.cookies.get(settings.csrf_cookie_name)
    access = response.cookies.get(settings.auth_cookie_name)
    refresh = response.cookies.get(settings.refresh_cookie_name)
    assert csrf
    assert access
    assert refresh
    return {"csrf": csrf, "access": access, "refresh": refresh}


@pytest.mark.asyncio
async def test_refresh_rotation_revokes_family_on_token_reuse(client):
    first_login = await _login_admin(client)
    first_refresh_token = first_login["refresh"]

    refreshed = await client.post("/auth/refresh", headers={"X-CSRF-Token": first_login["csrf"]})
    assert refreshed.status_code == 200
    second_csrf = refreshed.cookies.get(settings.csrf_cookie_name)
    second_refresh = refreshed.cookies.get(settings.refresh_cookie_name)
    assert second_csrf
    assert second_refresh
    assert second_refresh != first_refresh_token

    reuse_attempt = await client.post(
        "/auth/refresh",
        headers={
            "Authorization": f"Bearer {first_refresh_token}",
            "X-CSRF-Token": second_csrf,
        },
    )
    assert reuse_attempt.status_code == 401
    assert "revocada" in (reuse_attempt.text or "").lower()

    me_after_reuse = await client.get("/auth/me")
    assert me_after_reuse.status_code == 401


@pytest.mark.asyncio
async def test_logout_all_revokes_all_active_sessions(client):
    first_login = await _login_admin(client)
    access_token_session_a = first_login["access"]

    second_login = await _login_admin(client)
    access_token_session_b = second_login["access"]

    me_session_a = await client.get("/auth/me", headers={"Authorization": f"Bearer {access_token_session_a}"})
    assert me_session_a.status_code == 200

    logout_all = await client.post("/auth/logout-all", headers={"X-CSRF-Token": second_login["csrf"]})
    assert logout_all.status_code == 200
    assert logout_all.json().get("ok") is True

    me_after_a = await client.get("/auth/me", headers={"Authorization": f"Bearer {access_token_session_a}"})
    me_after_b = await client.get("/auth/me", headers={"Authorization": f"Bearer {access_token_session_b}"})
    assert me_after_a.status_code == 401
    assert me_after_b.status_code == 401
