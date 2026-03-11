import asyncio
import json
import base64
import ssl
import websockets
from app.config import Config

class NovaSonicStream:
    def __init__(self, on_transcription=None):
        self.ws = None
        self.on_transcription = on_transcription  # async callback(transcript: str)
        self._receive_task = None
        self._send_queue = asyncio.Queue()
        self._running = False

    async def connect(self):
        """Establish WebSocket connection to Nova Sonic and start background tasks."""
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE

        headers = {
            "Authorization": f"Bearer {Config.NOVA_API_KEY}",
            "Origin": "https://api.nova.amazon.com"
        }

        self.ws = await websockets.connect(
            Config.NOVA_SONIC_WS_URL,
            ssl=ssl_context,
            additional_headers=headers
        )
        self._running = True

        # Wait for session.created
        event = json.loads(await self.ws.recv())
        if event.get("type") != "session.created":
            raise Exception("Unexpected initial event")

        # Configure session (enable VAD, etc.)
        await self.ws.send(json.dumps({
            "type": "session.update",
            "session": {
                "type": "realtime",
                "audio": {
                    "input": {
                        "turn_detection": {"type": "server_vad", "threshold": 0.5}
                    }
                }
            }
        }))
        # Wait for session.updated
        event = json.loads(await self.ws.recv())
        if event.get("type") != "session.updated":
            raise Exception("Failed to update session")

        # Start receiver and sender tasks
        self._receive_task = asyncio.create_task(self._receive_loop())
        asyncio.create_task(self._send_loop())

    async def send_audio(self, audio_base64: str):
        """Queue an audio chunk to be sent to Nova Sonic."""
        await self._send_queue.put(audio_base64)

    async def _send_loop(self):
        """Continuously send audio chunks from the queue."""
        try:
            while self._running:
                audio = await self._send_queue.get()
                await self.ws.send(json.dumps({
                    "type": "input_audio_buffer.append",
                    "audio": audio
                }))
        except Exception as e:
            print(f"Send loop error: {e}")

    async def _receive_loop(self):
        """Receive messages from Nova Sonic and handle events."""
        try:
            async for message in self.ws:
                event = json.loads(message)
                event_type = event.get("type")

                if event_type == "conversation.item.input_audio_transcription.completed":
                    transcript = event.get("transcript", "").strip()
                    if transcript and self.on_transcription:
                        await self.on_transcription(transcript)

                elif event_type == "error":
                    print(f"Nova Sonic error: {event.get('error')}")

                # Other events can be ignored or logged
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            self._running = False

    async def close(self):
        """Cleanly close the connection."""
        self._running = False
        if self.ws:
            await self.ws.close()
        if self._receive_task:
            self._receive_task.cancel()
            try:
                await self._receive_task
            except asyncio.CancelledError:
                pass