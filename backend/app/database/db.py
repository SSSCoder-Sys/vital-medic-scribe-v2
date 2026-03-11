import json
import os
from app.config import Config

def save_data(data: dict, filename: str = Config.DATABASE_PATH):
    """Save dictionary to JSON file."""
    with open(filename, "w") as f:
        json.dump(data, f, indent=2, default=str)

def load_data(filename: str = Config.DATABASE_PATH) -> dict:
    """Load dictionary from JSON file."""
    if os.path.exists(filename):
        with open(filename, "r") as f:
            return json.load(f)
    return {}