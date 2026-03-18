"""
Server-Sent Events manager.
Maintains a dict of clinic_id -> list of asyncio.Queue.
When a file is uploaded or status changes, we push an event to all queues for that clinic.
"""

import asyncio
import json
from collections import defaultdict

_connections: dict[str, list[asyncio.Queue]] = defaultdict(list)


def subscribe(clinic_id: str) -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue()
    _connections[clinic_id].append(q)
    return q


def unsubscribe(clinic_id: str, q: asyncio.Queue):
    try:
        _connections[clinic_id].remove(q)
    except ValueError:
        pass


async def publish(clinic_id: str, event_type: str, data: dict):
    payload = json.dumps({"type": event_type, **data})
    dead = []
    for q in list(_connections.get(clinic_id, [])):
        try:
            await q.put(payload)
        except Exception:
            dead.append(q)
    for q in dead:
        unsubscribe(clinic_id, q)


async def event_generator(clinic_id: str, q: asyncio.Queue):
    """Async generator yielding SSE-formatted strings."""
    try:
        # Send a heartbeat immediately on connect
        yield f"data: {json.dumps({'type': 'connected'})}\n\n"
        while True:
            try:
                payload = await asyncio.wait_for(q.get(), timeout=25)
                yield f"data: {payload}\n\n"
            except asyncio.TimeoutError:
                # Heartbeat to keep connection alive
                yield f"data: {json.dumps({'type': 'heartbeat'})}\n\n"
    except asyncio.CancelledError:
        pass
    finally:
        unsubscribe(clinic_id, q)
