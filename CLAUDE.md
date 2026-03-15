# V.I.T.A.L. — Voice Integrated Triage & Assistance Logic

## What This Project Is
A hands-free voice AI documentation assistant for paramedics.
Paramedics speak during an emergency; the system listens, transcribes,
extracts medical data, and auto-fills an incident report.

Built for the Amazon Nova AI Hackathon.

## Tech Stack
- **Backend**: Python, FastAPI, WebSockets
- **AI Models**: Amazon Nova 2 Sonic (real-time transcription),
  Amazon Nova 2 Pro (medical data extraction)
- **API Access**: Nova models accessed via OpenAI-compatible SDK,
  pointed at Amazon's base URL
- **Storage**: JSON files on disk (no database — intentional for demo simplicity)
- **Frontend**: React (not yet built)

## Project Structure
```
VITAL-MEDIC-SCRIBE/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry point, registers all routers
│   │   ├── config.py            # All env vars and constants live here
│   │   ├── api/                 # Route handlers ("doors" to the backend)
│   │   │   ├── voice_routes.py  # WebSocket endpoint for live audio streaming
│   │   │   ├── protocol_routes.py # Checklist management endpoints
│   │   │   └── log_routes.py    # Report saving/retrieval endpoints
│   │   ├── services/            # Core logic ("workers")
│   │   │   ├── sonic_stream.py  # Connects to Nova Sonic via WebSocket
│   │   │   ├── pro_reasoner.py  # Sends transcripts to Nova Pro for extraction
│   │   │   ├── protocol_engine.py # EMS checklist logic and state
│   │   │   └── note_formatter.py  # Assembles final EMS report text
│   │   ├── models/              # Data shape definitions (Pydantic)
│   │   │   ├── patient.py       # Patient + Vitals structure
│   │   │   ├── checklist.py     # ProtocolChecklist + ChecklistItem
│   │   │   └── report.py        # FinalReport structure
│   │   └── database/
│   │       └── db.py            # save_data/load_data JSON file helpers
│   ├── .env                     # API keys (never commit this)
│   └── requirements.txt
└── frontend/                    # React app (not yet built)
```

## How to Run the Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```
Server runs at: http://localhost:8000
API docs auto-generated at: http://localhost:8000/docs

## Environment Variables
All secrets live in `backend/.env`. See `backend/app/config.py` for how
they are loaded. Required variable:
- `NOVA_API_KEY` — Amazon Nova API key

## Important Architectural Decisions
- **No real database**: Data is stored in JSON files under `reports/`.
  `active_patients` in `voice_routes.py` holds live session data in memory.
- **Dual-model pipeline**: Nova Sonic handles audio→text only (fast, low latency).
  Nova Pro handles text→structured JSON (slower, runs in background thread).
- **Router prefixes**: Prefixes are set ONLY in `main.py`, not in the router
  files themselves. Do not add prefix= to APIRouter() declarations.
- **WebSocket URL includes incident_id**: `/voice/ws/{incident_id}` so each
  ambulance call is tracked separately.

## Additional Documentation
- See `.claude/docs/architectural_patterns.md` for data flow and design patterns

## What's Not Built Yet
- Frontend (React) — needs to be built from scratch
### Planned Frontend Structure
frontend/
├── public/
└── src/
    ├── components/
    │   ├── VoiceConsole.jsx       # Mic button, start/stop call controls
    │   ├── LiveTranscript.jsx     # Scrolling live transcript display
    │   ├── ProtocolChecklist.jsx  # Checklist with completed/incomplete steps
    │   ├── PatientVitalsCard.jsx  # Real-time vitals display
    │   └── FinalReport.jsx        # Report preview before saving
    ├── pages/
    │   ├── Dashboard.jsx          # Main paramedic view during active call
    │   └── IncidentReport.jsx     # Post-call report review page
    ├── services/
    │   └── api.js                 # All WebSocket and HTTP calls to backend
    └── App.jsx                    # Root component, handles routing
- PDF generation — currently saves as .txt (stub in note_formatter.py)
- Real protocol auto-detection — Nova Pro output doesn't yet auto-trigger
  protocol_engine checklist creation

## Current Build Status

### Backend — COMPLETE ✅
- All routes tested and verified via Swagger UI
- JSON file storage working
- WebSocket endpoint ready at /voice/ws/{incident_id}

### Frontend — IN PROGRESS 🔄
- Vite 6 + React + Tailwind v4 installed and working
- Dark medical monitor aesthetic established (#0a0a0a bg, #00ff41 text)
- Monospace font (Courier New) applied globally

### Components Built So Far
- App.jsx — points to Dashboard, no routing yet
- services/api.js — all backend URLs centralized here
- pages/Dashboard.jsx — skeleton with 4 placeholder boxes
- components/VoiceConsole.jsx — incident ID input + START/END button
- components/LiveTranscript.jsx
- components/PatientVitalsCard.jsx
- components/ProtocolChecklist.jsx
- components/FinalReport.jsx

### Components Still Needed
- None - UI is complete