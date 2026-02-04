from fastapi import APIRouter, WebSocket, WebSocketDisconnect

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


@router.websocket("/ws/display/{session_id}")
async def display_ws(websocket: WebSocket, session_id: str):
    await manager.connect(session_id, websocket)
    try:
        while True:
            message = await websocket.receive_text()
            await manager.broadcast(session_id, message)
    except WebSocketDisconnect:
        manager.disconnect(session_id, websocket)
