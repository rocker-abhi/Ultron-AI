from contextlib import asynccontextmanager
from fastapi import FastAPI
import uvicorn
from app.websocket.route import router as websocket_router
from app.core import logger, settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"FastAPI application '{settings.SERVER_APP_NAME}' startup complete. Listening on {settings.SERVER_HOST}:{settings.SERVER_PORT}...")
    yield
    logger.info(f"FastAPI application '{settings.SERVER_APP_NAME}' is shutting down...")

app = FastAPI(
    title=settings.SERVER_APP_NAME,
    lifespan=lifespan
)
logger.info(f"Initializing '{settings.SERVER_APP_NAME}' application...")

app.include_router(websocket_router)
logger.info("WebSocket router registered successfully.")

if __name__ == "__main__":
    logger.info("Starting Uvicorn server...")
    uvicorn.run(
        "main:app", 
        host=settings.SERVER_HOST, 
        port=settings.SERVER_PORT, 
        reload=True
    )