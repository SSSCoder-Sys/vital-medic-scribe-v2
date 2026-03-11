from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.sonic_stream import NovaSonicStream
from app.services.pro_reasoner import analyze_transcript
import asyncio
import json

router = APIRouter()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("Frontend connected")

    # This queue will hold messages to send back to frontend
    output_queue = asyncio.Queue()

    async def on_transcription(transcript: str):
        """Called when Nova Sonic produces a transcription."""
        # Send transcript to frontend immediately
        await output_queue.put({"type": "transcript", "data": transcript})

        # Then analyze with Nova Pro (in background)
        structured = await asyncio.to_thread(analyze_transcript, transcript)
        await output_queue.put({"type": "structured", "data": structured})

    # Create and connect Nova Sonic stream
    sonic = NovaSonicStream(on_transcription=on_transcription)
    try:
        await sonic.connect()
        print("Connected to Nova Sonic")

        # Task to forward messages from sonic to frontend
        async def forward_output():
            try:
                while True:
                    msg = await output_queue.get()
                    await websocket.send_json(msg)
            except asyncio.CancelledError:
                pass

        forward_task = asyncio.create_task(forward_output())

        # Main loop: receive audio from frontend and send to sonic
        try:
            while True:
                message = await websocket.receive_text()
                data = json.loads(message)
                if data.get("type") == "audio":
                    await sonic.send_audio(data["audio"])
                # Other message types can be handled here
        except WebSocketDisconnect:
            print("Frontend disconnected")
        finally:
            forward_task.cancel()
            await sonic.close()
    except Exception as e:
        print(f"Error: {e}")
        await websocket.close()