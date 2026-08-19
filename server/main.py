from fastapi import FastAPI
import uvicorn
from app.websocket.route import router as websocket_router

app = FastAPI()
app.include_router(websocket_router)

if __name__ == "__main__":
    uvicorn.run(app, host='127.0.0.1', port=8000)