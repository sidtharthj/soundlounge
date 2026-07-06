"""WebSocket connection manager for real-time download progress."""

import json
import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages active WebSocket connections and broadcasts messages."""

    def __init__(self) -> None:
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        """Accept and register a new WebSocket connection."""
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info("WebSocket client connected (%d total)", len(self.active_connections))

    def disconnect(self, websocket: WebSocket) -> None:
        """Remove a WebSocket connection from the active list."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info("WebSocket client disconnected (%d total)", len(self.active_connections))

    async def send_personal(self, message: dict[str, Any], websocket: WebSocket) -> None:
        """Send a JSON message to a single client."""
        try:
            await websocket.send_json(message)
        except Exception:
            self.disconnect(websocket)

    async def broadcast(self, message: dict[str, Any]) -> None:
        """Broadcast a JSON message to all connected clients."""
        dead: list[WebSocket] = []
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except Exception:
                dead.append(connection)
        for conn in dead:
            self.disconnect(conn)

    async def broadcast_download_progress(
        self,
        queue_id: int,
        status: str,
        progress: float,
        speed: str | None = None,
        eta: str | None = None,
        title: str | None = None,
        error: str | None = None,
    ) -> None:
        """Convenience helper to broadcast download progress updates."""
        await self.broadcast(
            {
                "type": "download_progress",
                "data": {
                    "id": queue_id,
                    "status": status,
                    "progress": progress,
                    "speed": speed,
                    "eta": eta,
                    "title": title,
                    "error": error,
                },
            }
        )

    async def broadcast_download_complete(
        self, queue_id: int, song_id: int | None = None, title: str | None = None
    ) -> None:
        """Broadcast that a download has completed."""
        await self.broadcast(
            {
                "type": "download_complete",
                "data": {
                    "id": queue_id,
                    "song_id": song_id,
                    "title": title,
                },
            }
        )

    async def broadcast_download_error(
        self, queue_id: int, error: str, title: str | None = None
    ) -> None:
        """Broadcast that a download has failed."""
        await self.broadcast(
            {
                "type": "download_error",
                "data": {
                    "id": queue_id,
                    "error": error,
                    "title": title,
                },
            }
        )


# Singleton instance used across the application
ws_manager = ConnectionManager()
