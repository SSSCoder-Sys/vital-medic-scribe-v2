# Architectural Patterns

## Data Flow (One Voice Message, End to End)
1. Paramedic speaks → browser captures audio
2. Frontend sends base64-encoded audio chunk over WebSocket to `/voice/ws/{incident_id}`
3. `voice_routes.py` forwards audio to `sonic_stream.py`
4. `sonic_stream.py` streams audio to Nova Sonic, receives transcript text back
5. `on_transcription()` callback fires in `voice_routes.py`
6. Transcript sent to frontend immediately (so paramedic sees it live)
7. Transcript sent to `pro_reasoner.py` which calls Nova Pro
8. Nova Pro returns structured JSON: age, symptoms, vitals, medications
9. `update_patient_from_structured()` merges data into `active_patients[incident_id]`
10. Structured data also sent to frontend (updates vitals card, checklist)
11. Patient snapshot saved to `reports/active_patients.json`

## State Management
- **Live session state**: `active_patients` dict in `voice_routes.py` (memory only)
- **Checklist state**: `_active_checklists` dict in `protocol_engine.py` (memory only)
- **Persistent state**: JSON files in `reports/` folder (survives server restart)

## Pattern: Callback-Based Async
`NovaSonicStream` accepts an `on_transcription` async function at creation time.
This decouples the audio streaming logic from the business logic that handles
what to do with a transcript.

## Pattern: In-Memory + File Backup
Live data lives in Python dictionaries for speed.
On every meaningful update, a snapshot is written to a JSON file.
On server restart, JSON files can be used to restore state if needed.
```

---

## Step 4: Your First Claude Code Prompts

Once you've done Steps 1-3, open Claude Code in your `VITAL-MEDIC-SCRIBE/` folder and use these prompts in order:

**Prompt 1 (Plan Mode — review first):**
```
Read CLAUDE.md to understand the project. Then review the backend 
codebase for any remaining bugs, missing imports, or broken 
references. Do not make changes yet — just report what you find.
```

**Prompt 2 (Normal Mode — after you've reviewed the plan):**
```
The backend has no tests and I don't know if it runs correctly. 
Add a test route to main.py that returns a health check, and tell 
me the exact command to start the server and verify it's working.
```

**Prompt 3 (when ready for frontend):**
```
Read CLAUDE.md. I need to build a React frontend for this project. 
Start with a single Dashboard page that connects to the WebSocket 
at /voice/ws/{incident_id} and displays live transcripts as they 
come in. Use Tailwind CSS. Keep it simple — medical monitor aesthetic 
with dark background and green text.