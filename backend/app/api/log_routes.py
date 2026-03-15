from fastapi import APIRouter, HTTPException
from app.models.report import FinalReport
from app.services.note_formatter import create_final_report, generate_pdf
from app.services.protocol_engine import get_checklist
from app.database.db import save_data, load_data  # Our JSON file storage
import os
from datetime import datetime


# FIX: Removed prefix="/logs" from here.
# main.py already adds prefix="/logs" when it registers this router.
# Having it in BOTH places made URLs double up like: /logs/logs/save
# Now the final URLs will correctly be: /logs/save, /logs/{id}, /logs/
router = APIRouter(tags=["Logs"])


# This dictionary holds finished reports in memory while the server is running.
# Think of it as a temporary filing cabinet — fast to access, but clears when server restarts.
# For a hackathon demo this is fine. In a real app, you'd use a real database.
reports_store = {}


@router.post("/save/{incident_id}")
def save_report(incident_id: str):
    """Generate and save the final report for an incident."""
    # Import here (instead of top of file) to avoid a circular import problem.
    # Circular import = File A imports from File B, and File B imports from File A.
    # That causes Python to get confused and crash on startup.
    from app.api.voice_routes import active_patients

    patient = active_patients.get(incident_id)
    if not patient:
        raise HTTPException(404, "Incident not found. Has voice processing started for this ID?")

    checklist = get_checklist(incident_id)
    if not checklist:
        raise HTTPException(404, "No checklist found. Was a protocol started for this incident?")

    # Build the final report object from patient data + checklist
    report = create_final_report(patient, checklist)

    # Save a text version as our "PDF" (good enough for hackathon demo)
    os.makedirs("reports", exist_ok=True)  # Create the reports folder if it doesn't exist
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')  # e.g. "20250315_143022"
    pdf_filename = f"reports/{incident_id}_{timestamp}.txt"
    pdf_path = generate_pdf(report.summary, pdf_filename)
    report.pdf_path = pdf_path

    # Store in memory so we can retrieve it via GET /logs/{incident_id}
    reports_store[incident_id] = report

    # Also save to our JSON file so data survives a server restart
    all_reports = load_data("reports/all_reports.json")
    all_reports[incident_id] = report.model_dump()
    save_data(all_reports, "reports/all_reports.json")

    return {"status": "saved", "incident_id": incident_id, "pdf_path": pdf_path}


@router.get("/{incident_id}")
def get_report(incident_id: str):
    """Retrieve a single report by incident ID."""
    report = reports_store.get(incident_id)
    if not report:
        raise HTTPException(404, "Report not found.")
    return report.model_dump()


@router.get("/")
def list_reports():
    """List all incident IDs that have saved reports."""
    return {"incident_ids": list(reports_store.keys())}