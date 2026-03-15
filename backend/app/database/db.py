import json
import os

# This is our entire "database" for the hackathon.
# Instead of a real database (which needs extra servers and setup),
# we just read and write JSON files to disk.
# JSON files are basically just text files that store data in an organized way —
# like a structured notepad.

def save_data(data: dict, filepath: str):
    """
    Save a Python dictionary to a JSON file on disk.

    Example:
        save_data({"INC001": {...patient data...}}, "reports/active_patients.json")
        → Creates/overwrites that file with the latest data
    """
    # Make sure the folder exists before trying to write the file
    folder = os.path.dirname(filepath)
    if folder:
        os.makedirs(folder, exist_ok=True)

    with open(filepath, "w") as f:
        # indent=2 makes the JSON file human-readable (pretty printed)
        # default=str converts any non-JSON types (like datetime) to strings
        json.dump(data, f, indent=2, default=str)


def load_data(filepath: str) -> dict:
    """
    Load a JSON file from disk and return it as a Python dictionary.
    If the file doesn't exist yet, returns an empty dictionary instead of crashing.

    Example:
        patients = load_data("reports/active_patients.json")
        → Returns {"INC001": {...}} if file exists, or {} if not
    """
    if os.path.exists(filepath):
        with open(filepath, "r") as f:
            return json.load(f)
    return {}  # File doesn't exist yet — just return empty dict, no crash