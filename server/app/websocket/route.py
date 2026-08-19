from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.websocket.manager import ConnectionManager
from app.core import logger

router = APIRouter()
manager = ConnectionManager()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    client_host = websocket.client.host if websocket.client else "unknown"
    client_port = websocket.client.port if websocket.client else "unknown"
    logger.info(f"Incoming WebSocket connection request from {client_host}:{client_port}")
    
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            logger.info(f"Received message from {client_host}:{client_port} -> {data}")
            # Broadcast the received message to all connected clients
            await manager.broadcast(data)
    except WebSocketDisconnect:
        logger.info(f"WebSocket client {client_host}:{client_port} disconnected")
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"Error handling WebSocket client {client_host}:{client_port}: {e}")
        manager.disconnect(websocket)
