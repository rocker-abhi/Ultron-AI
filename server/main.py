from contextlib import asynccontextmanager
from fastapi import FastAPI
import uvicorn
from app.websocket.route import router as websocket_router
from app.core import logger

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("FastAPI application startup complete. Listening for incoming connections...")
    yield
    logger.info("FastAPI application is shutting down...")

app = FastAPI(lifespan=lifespan)
logger.info("Initializing FastAPI application...")

app.include_router(websocket_router)
logger.info("WebSocket router registered successfully.")

if __name__ == "__main__":
    logger.info("Starting Uvicorn server...")
    uvicorn.run(app, host='127.0.0.1', port=8000)