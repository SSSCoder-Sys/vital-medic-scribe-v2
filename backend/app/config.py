import os
from dotenv import load_dotenv

# load_dotenv() reads your .env file and makes its values available
# via os.getenv(). Without this line, all your API keys would be None.
load_dotenv()

class Config:
    # --- Nova AI Credentials ---
    NOVA_API_KEY = os.getenv("NOVA_API_KEY")  # Loaded from your .env file

    # The base URL tells the OpenAI Python library to talk to Amazon
    # instead of OpenAI — same library, different destination
    NOVA_BASE_URL = "https://api.nova.amazon.com/v1"

    # WebSocket URL for Nova Sonic's real-time audio stream
    NOVA_SONIC_WS_URL = "wss://api.nova.amazon.com/v1/realtime?model=nova-2-sonic-v1"

    # The model name for Nova Pro (the reasoning/extraction model)
    NOVA_PRO_MODEL = "nova-pro-v1"

    # --- JSON File Storage ---
    # This is where we save our "database" files for the demo
    # Instead of a real database, we just use JSON files in this folder
    DATABASE_PATH = "reports/all_reports.json"

    # --- Audio Settings for Nova Sonic ---
    # These must match exactly what Nova Sonic expects, like tuning a radio to
    # the right frequency — wrong values = garbled or no audio
    AUDIO_SAMPLE_RATE = 24000    # 24,000 samples per second (high quality)
    AUDIO_CHANNELS = 1           # Mono audio (one channel, not stereo)
    AUDIO_SAMPLE_WIDTH = 2       # 16-bit audio (standard for voice)