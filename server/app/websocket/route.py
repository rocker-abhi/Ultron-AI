import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.websocket.manager import ConnectionManager
from app.core import logger
from app.websocket.handler.text_handler import handle_text_event
from app.websocket.handler.voice_handler import handle_audio
from app.discord.discordBotHandler import DiscordBot

import asyncio

router = APIRouter()
manager = ConnectionManager()
discord_bot = DiscordBot()

# Global dictionary to track active tasks per websocket connection
active_tasks = {}

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
    
    session_id = websocket.query_params.get("session_id")
    tab_id = websocket.query_params.get("tab_id")

    from app.core.session import session_manager
    session = session_manager.get_session(session_id) if session_id else None

    if not session or session.tab_id != tab_id:
        logger.warning(f"WebSocket connection rejected: invalid session or tab ID mismatch. Session: {session_id}, Tab: {tab_id}")
        await websocket.accept()
        await websocket.close(code=4001, reason="Invalid session or tab ID mismatch.")
        return

    await manager.connect(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_text()
            logger.info(f"Received message from {client_host}:{client_port} -> {data}")
            
            # Keep session alive on each received packet
            session_manager.get_session(session_id)
            
            try:
                # raise Exception("Testing Discord Bot")
                # Parse incoming JSON payload
                payload = json.loads(data)
                
                # Determine the event type (check for 'event', 'type', or default to 'text' if 'text' key is present)
                event_type = payload.get("event") or payload.get("type")
                # raise Exception("Testing Discord Bot")
                # Intercept client-side logs for debugging and Discord alerts
                if event_type == "log_error":
                    msg = payload.get("text", "")
                    logger.error(f"CLIENT ERROR LOG -> {msg}")
                    discord_bot.send(f"⚠️ **Client Error**: {msg}")
                    continue
                elif event_type == "log_warn":
                    msg = payload.get("text", "")
                    logger.warning(f"CLIENT WARNING LOG -> {msg}")
                    discord_bot.send(f"⚠️ **Client Warning**: {msg}")
                    continue
                    
                if not event_type and "text" in payload:
                    event_type = "text"
                
                # Interrupt logic: check for "interrupt" event
                if event_type == "interrupt":
                    logger.info(f"Received interrupt request from {client_host}:{client_port}")
                    old_task = active_tasks.get(websocket)
                    if old_task and not old_task.done():
                        old_task.cancel()
                        logger.info(f"Task for {client_host}:{client_port} cancelled due to interrupt event.")
                    continue
                
                # Route to the registered event handler
                if event_type in EVENT_HANDLERS:
                    # Cancel any existing active task for this connection first (auto-interrupt on new message)
                    old_task = active_tasks.get(websocket)
                    if old_task and not old_task.done():
                        old_task.cancel()
                        logger.info(f"Task for {client_host}:{client_port} auto-cancelled due to new incoming event '{event_type}'.")
                    
                    # Spawn the handler as an independent background task
                    async def task_wrapper(handler, payload_data, ws):
                        try:
                            await handler(payload_data, ws)
                        except asyncio.CancelledError:
                            logger.info(f"Active task handler execution for {client_host}:{client_port} was cancelled.")
                            raise
                        finally:
                            if active_tasks.get(ws) == asyncio.current_task():
                                active_tasks.pop(ws, None)

                    handler_task = asyncio.create_task(
                        task_wrapper(EVENT_HANDLERS[event_type], payload, websocket)
                    )
                    active_tasks[websocket] = handler_task
                else:
                    logger.warning(f"No handler registered for event: '{event_type}'. Broadcasting as fallback.")
                    await manager.broadcast(data)
                    
            except json.JSONDecodeError:
                # Fallback if the received data is a raw non-JSON string
                logger.info(f"Raw string received: '{data}'. Broadcasting as fallback.")
                await manager.broadcast(data)
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket client {client_host}:{client_port} disconnected")
        old_task = active_tasks.pop(websocket, None)
        if old_task and not old_task.done():
            old_task.cancel()
        manager.disconnect(websocket)
    except Exception as e:
        error_msg = f"Error handling WebSocket client {client_host}:{client_port}: {e}"
        logger.error(error_msg)
        discord_bot.send(f"🚨 **Server Exception**: {error_msg}")
        old_task = active_tasks.pop(websocket, None)
        if old_task and not old_task.done():
            old_task.cancel()
        manager.disconnect(websocket)
