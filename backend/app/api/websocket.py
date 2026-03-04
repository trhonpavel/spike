import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from app.config import settings
from app.api.auth import validate_token

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        self.rooms: dict[str, list[WebSocket]] = {}

    async def connect(self, slug: str, ws: WebSocket):
        await ws.accept()
        self.rooms.setdefault(slug, []).append(ws)

    def disconnect(self, slug: str, ws: WebSocket):
        if slug in self.rooms:
            self.rooms[slug] = [c for c in self.rooms[slug] if c is not ws]

    async def broadcast(self, slug: str, event: str, data: dict | None = None):
        msg = json.dumps({"event": event, "data": data})
        for ws in self.rooms.get(slug, []):
            try:
                await ws.send_text(msg)
            except Exception:
                pass


manager = ConnectionManager()


@router.websocket("/ws/{slug}")
async def websocket_endpoint(
    websocket: WebSocket,
    slug: str,
    token: str = Query(default=""),
):
    if settings.app_password and not validate_token(token):
        await websocket.close(code=4001, reason="Unauthorized")
        return

    await manager.connect(slug, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(slug, websocket)
