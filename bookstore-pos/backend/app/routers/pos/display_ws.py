"""
Router de WebSocket para displays en tiempo real.
Endpoints: WS /ws/display/{session_id}
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from datetime import datetime, timezone
from sqlalchemy import select

from app.core.config import settings
from app.core.security import decode_token
from app.db.session import AsyncSessionLocal
from app.models.session import UserSession
from app.models.user import User

router = APIRouter(tags=["display"])


class ConnectionManager:
    def __init__(self) -> None:
        self.rooms: dict[str, set[WebSocket]] = {}

    async def connect(self, session_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.rooms.setdefault(session_id, set()).add(websocket)

    def disconnect(self, session_id: str, websocket: WebSocket) -> None:
        if session_id in self.rooms:
            self.rooms[session_id].discard(websocket)
            if not self.rooms[session_id]:
                del self.rooms[session_id]

    async def broadcast(self, session_id: str, message: str) -> None:
        if session_id not in self.rooms:
            return
        for ws in list(self.rooms[session_id]):
            try:
                await ws.send_text(message)
            except Exception:
                self.disconnect(session_id, ws)


manager = ConnectionManager()


async def _validate_display_token(token: str) -> bool:
    try:
        payload = decode_token(token)
        username = payload.get("sub")
        jti = payload.get("jti")
    except Exception:
        return False
    if not username or not jti:
        return False
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.username == username))
        user = result.scalar_one_or_none()
        if not user or not user.is_active:
            return False
        sess_result = await db.execute(
            select(UserSession).where(UserSession.jti == jti)
        )
        session = sess_result.scalar_one_or_none()
        if not session or session.revoked_at is not None:
            return False
        expires_at = session.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            return False
    return True


@router.websocket("/ws/display/{session_id}")
async def display_ws(websocket: WebSocket, session_id: str):
    origin = websocket.headers.get("origin")
    allowed = {o.strip() for o in settings.cors_origins.split(",") if o.strip()}
    if origin and allowed and origin not in allowed:
        await websocket.close(code=1008)
        return
    token = websocket.query_params.get("token")
    if not token:
        cookie_header = websocket.headers.get("cookie") or ""
        for part in cookie_header.split(";"):
            name, _, value = part.strip().partition("=")
            if name == settings.auth_cookie_name:
                token = value
                break

    if not token or not await _validate_display_token(token):
        await websocket.close(code=1008)
        return

    await manager.connect(session_id, websocket)
    try:
        while True:
            message = await websocket.receive_text()
            await manager.broadcast(session_id, message)
    except WebSocketDisconnect:
        manager.disconnect(session_id, websocket)
