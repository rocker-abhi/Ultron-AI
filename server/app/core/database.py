import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings


class DatabaseSessionManager:
    _instance = None
    
    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
        
    def __init__(self):
        # Ensure initialization logic only runs once
        if not hasattr(self, "_initialized"):
            database_url = settings.DATABASE_URL
            if not database_url:
                raise ValueError("DATABASE_URL is not set in environmental variables.")
                
            # Create async engine
            self.engine = create_async_engine(
                database_url,
                echo=False,
                future=True
            )
            # Async Session maker
            self.session_factory = async_sessionmaker(
                bind=self.engine,
                class_=AsyncSession,
                expire_on_commit=False
            )
            self._initialized = True
            
    def get_session(self) -> AsyncSession:
        return self.session_factory()
        
    async def close(self):
        if hasattr(self, "engine"):
            await self.engine.dispose()

# Instantiate global singleton instance
db_manager = DatabaseSessionManager()
