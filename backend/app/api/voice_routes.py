from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.sonic_stream import NovaSonicStream
from app.services.pro_reasoner import analyze_transcript
from app.models.patient import Patient, Vitals
from app.database.db import save_data, load_data
import asyncio
import json
from datetime import datetime


router = APIRouter()


# FIX: This dictionary now actually EXISTS.
# It's a "live session tracker" — think of it as a whiteboard in the ambulance.
# Key = incident_id (e.g. "INC001"), Value = Patient object with all their data.
# log_routes.py reads from this when it goes to save the final report.
active_patients: dict = {}


def update_patient_from_structured(incident_id: str, structured: dict):
    """
    Takes the JSON that Nova Pro extracted from the transcript and merges it
    into the patient's record in active_patients.

    structured might look like:
    {
        "age": 52,
        "gender": "male",
        "symptoms": ["chest pain", "left arm radiation"],
        "vitals": {"bp_systolic": 150, "bp_diastolic": 90, "heart_rate": 88},
        "medications": ["Aspirin 325mg"]
    }
    """
    # If this is the first voice message for this incident, create a blank patient record
    if incident_id not in active_patients:
        active_patients[incident_id] = Patient(incident_id=incident_id)

    patient = active_patients[incident_id]

    # Fill in basic demographics if Nova Pro found them and we don't have them yet
    if structured.get("age") and not patient.age:
        patient.age = structured["age"]

    if structured.get("gender") and not patient.gender:
        patient.gender = structured["gender"]

    # Add any new symptoms (avoid duplicates by checking first)
    for symptom in structured.get("symptoms", []):
        if symptom not in patient.symptoms:
            patient.symptoms.append(symptom)

    # Add any new medications (avoid duplicates)
    for med in structured.get("medications", []):
        if med not in patient.medications:
            patient.medications.append(med)

    # If Nova Pro found vitals, add them as a new timestamped reading
    vitals_data = structured.get("vitals", {})
    if vitals_data:
        new_vitals = Vitals(
            bp_systolic=vitals_data.get("bp_systolic"),
            bp_diastolic=vitals_data.get("bp_diastolic"),
            heart_rate=vitals_data.get("heart_rate"),
            oxygen_saturation=vitals_data.get("oxygen_saturation"),
            timestamp=datetime.now()
        )
        patient.vitals.append(new_vitals)

    # Save a snapshot of this patient to our JSON file so data isn't lost
    all_patients = load_data("reports/active_patients.json")
    all_patients[incident_id] = patient.model_dump()
    save_data(all_patients, "reports/active_patients.json")


@router.websocket("/ws/{incident_id}")
async def websocket_endpoint(websocket: WebSocket, incident_id: str):
    """
    The main WebSocket connection for a live EMS call.

    How it works:
    1. The paramedic's device connects here and starts streaming audio
    2. We forward that audio to Nova Sonic (the "ears")
    3. Nova Sonic sends back a text transcript
    4. We send that transcript to Nova Pro (the "brain") to extract structured data
    5. We update the patient record AND send both the transcript and
       structured data back to the frontend dashboard in real time
    """
    await websocket.accept()
    print(f"Frontend connected for incident: {incident_id}")

    # Create a blank patient record for this incident right away
    if incident_id not in active_patients:
        active_patients[incident_id] = Patient(incident_id=incident_id)

    # A queue is like a waiting line — we put messages in from one place
    # and send them out from another, so they don't interfere with each other
    output_queue = asyncio.Queue()

    async def on_transcription(transcript: str):
        """This gets called every time Nova Sonic finishes recognizing a phrase."""
        # Step 1: Send the raw transcript to the frontend immediately so the
        # paramedic can see what was heard in real time
        await output_queue.put({"type": "transcript", "data": transcript})

        # Step 2: Send that transcript to Nova Pro for analysis
        # asyncio.to_thread runs synchronous (blocking) code without freezing
        # the whole server — think of it as running it in a separate worker
        structured = await asyncio.to_thread(analyze_transcript, transcript)

        # Step 3: Update the patient record with what Nova Pro extracted
        update_patient_from_structured(incident_id, structured)

        # Step 4: Send the structured data to the frontend too so it can
        # update the vitals card and checklist in real time
        await output_queue.put({"type": "structured", "data": structured})

    # Connect to Nova Sonic's real-time audio stream
    sonic = NovaSonicStream(on_transcription=on_transcription)

    try:
        await sonic.connect()
        print(f"Connected to Nova Sonic for incident: {incident_id}")

        async def forward_output():
            """Continuously pull messages from our queue and send to frontend."""
            try:
                while True:
                    msg = await output_queue.get()
                    await websocket.send_json(msg)
            except asyncio.CancelledError:
                pass  # Server is shutting down this task — that's fine

        forward_task = asyncio.create_task(forward_output())

        try:
            while True:
                # Wait for the next message from the frontend
                message = await websocket.receive_text()
                data = json.loads(message)

                if data.get("type") == "audio":
                    # Forward raw audio bytes (encoded as base64 text) to Nova Sonic
                    await sonic.send_audio(data["audio"])

        except WebSocketDisconnect:
            print(f"Frontend disconnected from incident: {incident_id}")

        finally:
            forward_task.cancel()
            await sonic.close()

    except Exception as e:
        print(f"Error in WebSocket handler: {e}")
        await websocket.close()