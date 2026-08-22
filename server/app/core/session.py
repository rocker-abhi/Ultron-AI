import os
from datetime import datetime, timezone, timedelta
from uuid import UUID, uuid4
from typing import Dict
from pydantic import BaseModel
from app.core.exceptions import AppException

class UserSession(BaseModel):
    """Memory representation of a client session."""
    session_id: str
    user_id: UUID
    tab_id: str
    created_at: datetime
    last_seen: datetime
    expires_at: datetime

    def is_expired(self) -> bool:
        """Check if the session has exceeded its expiration window."""
        return datetime.now(timezone.utc) > self.expires_at

class SessionManager:
    """In-memory thread-safe singleton session store."""
    def __init__(self, session_lifetime_minutes: int = 30):
        self.sessions: Dict[str, UserSession] = {}       # session_id -> UserSession
        self.user_to_session: Dict[UUID, str] = {}       # user_id -> session_id
        self.session_lifetime = timedelta(minutes=session_lifetime_minutes)

    def create_session(self, user_id: UUID, tab_id: str, force: bool = False) -> UserSession:
        """Create a new session or enforce tab lock rules."""
        now = datetime.now(timezone.utc)

        # Check for existing session for this user
        existing_session_id = self.user_to_session.get(user_id)
        if existing_session_id:
            existing_session = self.sessions.get(existing_session_id)
            if existing_session and not existing_session.is_expired():
                # Enforce tab lock rules:
                if existing_session.tab_id != tab_id:
                    if not force:
                        raise AppException(
                            message="Active session already exists in another browser tab or location.",
                            status_code=409,
                            error_details={"session_exists": True}
                        )
                # If same tab is logging in again or force override requested, delete previous active session
                self.delete_session(existing_session_id)

        # Create new unique session
        session_id = str(uuid4())
        session = UserSession(
            session_id=session_id,
            user_id=user_id,
            tab_id=tab_id,
            created_at=now,
            last_seen=now,
            expires_at=now + self.session_lifetime
        )
        
        self.sessions[session_id] = session
        self.user_to_session[user_id] = session_id
        return session

    def get_session(self, session_id: str) -> UserSession | None:
        """Verify, touch, and retrieve the active session."""
        session = self.sessions.get(session_id)
        if session:
            if session.is_expired():
                self.delete_session(session_id)
                return None
            
            # Slide session window
            now = datetime.now(timezone.utc)
            session.last_seen = now
            session.expires_at = now + self.session_lifetime
            return session
        return None

    def delete_session(self, session_id: str):
        """Remove active session credentials from cache and close associated WebSockets."""
        session = self.sessions.pop(session_id, None)
        if session:
            self.user_to_session.pop(session.user_id, None)
            
            # Forcibly terminate the websocket connection for the deleted session
            from app.websocket.manager import ConnectionManager
            import asyncio
            ws_manager = ConnectionManager()
            asyncio.create_task(ws_manager.disconnect_by_session(session_id))

# Global memory instance
session_manager = SessionManager()
