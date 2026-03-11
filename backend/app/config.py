import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    NOVA_API_KEY = os.getenv("NOVA_API_KEY")
    NOVA_BASE_URL = "https://api.nova.amazon.com/v1"
    NOVA_SONIC_WS_URL = "wss://api.nova.amazon.com/v1/realtime?model=nova-2-sonic-v1"
    NOVA_PRO_MODEL = "nova-pro-v1"

    # Audio format expected by Nova Sonic
    AUDIO_SAMPLE_RATE = 24000
    AUDIO_CHANNELS = 1
    AUDIO_SAMPLE_WIDTH = 2  # 16-bit