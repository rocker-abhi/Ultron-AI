from typing import List, Dict
from fastapi import WebSocket
from app.core import logger

class ConnectionManager:
    _instance = None
    active_connections: List[WebSocket]
    session_to_websocket: Dict[str, WebSocket]

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(ConnectionManager, cls).__new__(cls)
            cls._instance.active_connections = []
            cls._instance.session_to_websocket = {}
        return cls._instance

    async def connect(self, websocket: WebSocket, session_id: str = None):
        """Register a new active client connection, mapping it to its session ID."""
        await websocket.accept()
        self.active_connections.append(websocket)
        if session_id:
            self.session_to_websocket[session_id] = websocket
        logger.info(f"WebSocket client registered. Active connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        """Deregister active connection and clean up session mapping cache."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        
        # Safely remove session mappings pointing to this socket
        for sid, ws in list(self.session_to_websocket.items()):
            if ws == websocket:
                self.session_to_websocket.pop(sid, None)
        logger.info(f"WebSocket client removed. Active connections: {len(self.active_connections)}")

    async def disconnect_by_session(self, session_id: str):
        """Forcibly disconnect a client socket matching the given session ID with code 4001."""
        websocket = self.session_to_websocket.get(session_id)
        if websocket:
            logger.info(f"Forcibly terminating WebSocket connection for session: {session_id}")
            try:
                # Send logout notice payload to frontend before dropping
                await websocket.send_json({
                    "event": "session_terminated",
                    "message": "Your session has been terminated because you logged in from another browser tab."
                })
                # Close socket with policy violation close code 4001
                await websocket.close(code=4001, reason="Session terminated by another login.")
            except Exception as e:
                logger.error(f"Error during force disconnect of session {session_id}: {e}")
            finally:
                self.disconnect(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        logger.info(f"Broadcasting message to {len(self.active_connections)} client(s)")
        # Create a copy of active_connections list to prevent issues if a connection is modified during broadcast
        for connection in list(self.active_connections):
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Error broadcasting message: {e}")
                self.disconnect(connection)
