import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.websocket.manager import ConnectionManager
from app.core import logger
from app.websocket.handler.text_handler import handle_text_event
from app.websocket.handler.voice_handler import handle_audio

router = APIRouter()
manager = ConnectionManager()

# Mapping event types to their respective async handlers
EVENT_HANDLERS = {
    "text": handle_text_event,
    "audio": handle_audio
}


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
            
            try:
                # Parse incoming JSON payload
                payload = json.loads(data)
                
                # Determine the event type (check for 'event', 'type', or default to 'text' if 'text' key is present)
                event_type = payload.get("event") or payload.get("type")
                
                # Intercept client-side logs for debugging
                if event_type == "log_error":
                    logger.error(f"CLIENT ERROR LOG -> {payload.get('text', '')}")
                    continue
                elif event_type == "log_warn":
                    logger.warning(f"CLIENT WARNING LOG -> {payload.get('text', '')}")
                    continue
                    
                if not event_type and "text" in payload:
                    event_type = "text"
                
                # Route to the registered event handler
                if event_type in EVENT_HANDLERS:
                    await EVENT_HANDLERS[event_type](payload, websocket)
                else:
                    logger.warning(f"No handler registered for event: '{event_type}'. Broadcasting as fallback.")
                    await manager.broadcast(data)
                    
            except json.JSONDecodeError:
                # Fallback if the received data is a raw non-JSON string
                logger.info(f"Raw string received: '{data}'. Broadcasting as fallback.")
                await manager.broadcast(data)
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket client {client_host}:{client_port} disconnected")
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"Error handling WebSocket client {client_host}:{client_port}: {e}")
        manager.disconnect(websocket)
