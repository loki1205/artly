"""WebSocket broadcast hub.

Clients connect to /ws and receive small JSON events like
{"type": "changed", "resource": "ideas"}. On any event a client invalidates its
cached queries and refetches, so every browser stays in sync with no manual
refresh. Keeping the payload tiny (no data) avoids races and keeps it robust.
"""
from __future__ import annotations

import asyncio
import json

from fastapi import WebSocket


class Hub:
    def __init__(self) -> None:
        self._clients: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self._clients.add(ws)

    async def disconnect(self, ws: WebSocket) -> None:
        async with self._lock:
            self._clients.discard(ws)

    async def broadcast(self, resource: str, origin: str | None = None) -> None:
        message = json.dumps({"type": "changed", "resource": resource, "origin": origin})
        async with self._lock:
            targets = list(self._clients)
        dead: list[WebSocket] = []
        for ws in targets:
            try:
                await ws.send_text(message)
            except Exception:  # noqa: BLE001
                dead.append(ws)
        if dead:
            async with self._lock:
                for ws in dead:
                    self._clients.discard(ws)


hub = Hub()
