from app.core import logger
import asyncio
import json
import datetime
import base64
from fastapi import WebSocket
from app.LLM.groq_client import groq
from app.TTS.voxi_client import VoxiClient

# Queue to hold text sentences ready for Text-to-Speech conversion
text_queue = asyncio.Queue()


async def llm_producer(text: str, websocket: WebSocket):
    full_response = ""
    logger.info("Starting LLM stream processing...")
    
    current_sentence = ""
    sentence_delimiters = {".", "?", "!", "\n"}
    
    # Iterate over the async generator
    async for chunk in groq.get_response(text):
        full_response += chunk
        current_sentence += chunk
        
        # Aggregate tokens into full sentences to ensure natural speech output from Voxi-TTS
        if any(d in chunk for d in sentence_delimiters) or len(current_sentence) > 100:
            sentence_to_send = current_sentence.strip()
            if sentence_to_send:
                await text_queue.put(sentence_to_send)
            current_sentence = ""
            
    # Send any remaining text left in the buffer
    if current_sentence.strip():
        await text_queue.put(current_sentence.strip())
    
    # Generate timestamp matching frontend format (e.g., "04:30 PM" -> "4:30 PM")
    timestamp = datetime.datetime.now().strftime("%I:%M %p")
    if timestamp.startswith("0"):
        timestamp = timestamp[1:]
        
    # Send the final accumulated text AI response back to the specific client
    ai_payload = {
        "id": f"ai-{int(asyncio.get_event_loop().time() * 1000)}",
        "sender": "ai",
        "text": full_response,
        "timestamp": timestamp
    }
    await websocket.send_text(json.dumps(ai_payload))


async def tts_consumer(websocket: WebSocket):
    while True:
        text = await text_queue.get()
        if text is None:
            text_queue.task_done()
            break
            
        logger.info(f"Synthesizing audio for sentence: '{text}'")
        try:
            # Run CPU/GPU bound TTS inference in a separate thread to keep the event loop non-blocking
            audio = await asyncio.to_thread(VoxiClient.convert_to_audio_bytes, text)
            audio_b64 = base64.b64encode(audio).decode('utf-8')
            
            audio_payload = {
                "id": f"audio-{int(asyncio.get_event_loop().time() * 1000)}",
                "sender": "ai",
                "audio": audio_b64,
                "timestamp": datetime.datetime.now().strftime("%I:%M %p").lstrip('0')
            }
            print(f"dumping audio byte .............. {len(audio_b64)}")
            await websocket.send_text(json.dumps(audio_payload))
        except Exception as e:
            logger.error(f"Error in TTS synthesis: {e}")
        finally:
            text_queue.task_done()


# Handler for text event
async def handle_text_event(payload: dict, websocket: WebSocket):
    text = payload.get("text", "")
    logger.info(f"Handler [text] -> Input text received: '{text}'")

    # Send the user's message back to the specific client so it appears in the chat UI
    await websocket.send_text(json.dumps(payload))

    # Spawn the tts_consumer task in the background
    consumer_task = asyncio.create_task(tts_consumer(websocket))

    try:
        # Trigger LLM response generation and wait for completion
        await llm_producer(text, websocket)
    finally:
        # Put None into the queue to signal consumer completion
        await text_queue.put(None)
        # Wait for the background tts_consumer task to finish clean up
        await consumer_task