import json
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import redis.asyncio as aioredis
from app.config import settings

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/logs/{job_id}")
async def websocket_logs(websocket: WebSocket, job_id: str):
    """WebSocket endpoint for real-time log streaming."""
    await websocket.accept()

    redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    pubsub = redis_client.pubsub()

    try:
        await pubsub.subscribe(f"job_logs:{job_id}")

        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message and message["type"] == "message":
                log_data = json.loads(message["data"])
                await websocket.send_json(log_data)

            # Small delay to prevent tight loops
            await asyncio.sleep(0.1)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"level": "ERROR", "message": f"WebSocket error: {str(e)}"})
        except Exception:
            pass
    finally:
        await pubsub.unsubscribe(f"job_logs:{job_id}")
        await pubsub.close()
        await redis_client.close()
