import base64
import io
import asyncio
import datetime
from fastapi import WebSocket
from app.core import logger
from app.SST.wisper_base_sst import WisperBase
from app.websocket.handler.text_handler import handle_text_event

# Initialize WisperBase singleton
whisper_base = WisperBase()

async def handle_audio(payload: dict, websocket: WebSocket):
    logger.info("Handler [audio] -> Processing voice stream event...")
    
    audio_b64 = payload.get("audio")
    if not audio_b64:
        logger.warning("Handler [audio] -> No audio data found in payload.")
        return
        
    try:
        # Decode base64 audio data back to binary bytes
        audio_bytes = base64.b64decode(audio_b64)
        audio_buffer = io.BytesIO(audio_bytes)
        
        logger.info(f"Handler [audio] -> Decoded {len(audio_bytes)} bytes of audio. Starting transcription...")
        
        # Run CPU/GPU bound Whisper transcription in a threadpool to keep FastAPI event loop non-blocking
        segments, info = await asyncio.to_thread(whisper_base.transcribe, audio_buffer)
        
        # Stitch all segments together
        transcript = "".join([segment.text for segment in segments]).strip()
        logger.info(f"Handler [audio] -> Transcription complete. Language: {info.language} ({info.language_probability:.2f}). Transcript: '{transcript}'")
        
        if not transcript:
            logger.info("Handler [audio] -> Transcript is empty, ignoring event.")
            return
            
        # Create a text event payload representing the transcribed input
        timestamp = datetime.datetime.now().strftime("%I:%M %p")
        if timestamp.startswith("0"):
            timestamp = timestamp[1:]
            
        text_payload = {
            "id": payload.get("id") or f"transcribed-{int(asyncio.get_event_loop().time() * 1000)}",
            "event": "text",
            "sender": "user",
            "text": transcript,
            "timestamp": timestamp
        }
        
        # Route to text handler to display user message and generate LLM & TTS voice reply
        await handle_text_event(text_payload, websocket)
        
    except Exception as e:
        logger.error(f"Handler [audio] -> Error transcribing or processing audio: {e}")