from openai import OpenAI
from app.config import Config
import json

client = OpenAI(
    api_key=Config.NOVA_API_KEY,
    base_url=Config.NOVA_BASE_URL
)

def analyze_transcript(transcript: str) -> dict:
    """
    Send transcript to Nova Pro with tool calling to get structured medical data.
    """
    # Define the tool that forces structured output
    tools = [
        {
            "type": "function",
            "function": {
                "name": "log_patient_care_report",
                "description": "Extract medical data from the scene.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "vitals": {
                            "type": "object",
                            "properties": {
                                "bp_systolic": {"type": "integer"},
                                "bp_diastolic": {"type": "integer"},
                                "heart_rate": {"type": "integer"},
                                "oxygen_saturation": {"type": "number"}
                            }
                        },
                        "medications": {
                            "type": "array",
                            "items": {"type": "string"}
                        },
                        "symptoms": {
                            "type": "array",
                            "items": {"type": "string"}
                        },
                        "age": {"type": "integer"},
                        "gender": {"type": "string"}
                    },
                    "required": []
                }
            }
        }
    ]

    try:
        response = client.chat.completions.create(
            model=Config.NOVA_PRO_MODEL,
            messages=[
                {"role": "system", "content": "You are a medical scribe. Extract key information."},
                {"role": "user", "content": transcript}
            ],
            tools=tools,
            tool_choice="auto",
            temperature=0.0
        )
        # Extract tool call arguments
        message = response.choices[0].message
        if message.tool_calls:
            args = message.tool_calls[0].function.arguments
            return json.loads(args)
        else:
            # Fallback: try to parse content as JSON
            return json.loads(message.content)
    except Exception as e:
        print(f"Error in Nova Pro: {e}")
        return {}