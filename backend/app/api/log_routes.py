from fastapi import APIRouter, HTTPException
from app.models.report import FinalReport
from app.services.note_formatter import create_final_report, generate_pdf
from app.models.patient import Patient
from app.services.protocol_engine import get_checklist
import os
from datetime import datetime

router = APIRouter(prefix="/logs", tags=["Logs"])

# In-memory store for reports (keyed by incident_id)
reports_store = {}

@router.post("/save/{incident_id}")
def save_report(incident_id: str):
    """Generate and save the final report for an incident."""
    # In a real app, you'd retrieve patient and checklist from persistent storage.
    # For demo, we'll assume they are still in memory.
    from app.api.voice_routes import active_patients
    patient = active_patients.get(incident_id)
    if not patient:
        raise HTTPException(404, "Incident not found")
    checklist = get_checklist(incident_id)
    if not checklist:
        raise HTTPException(404, "Checklist not found")

    report = create_final_report(patient, checklist)
    # Generate PDF (optional)
    pdf_filename = f"reports/{incident_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    os.makedirs("reports", exist_ok=True)
    pdf_path = generate_pdf(report.summary, pdf_filename)
    report.pdf_path = pdf_path

    reports_store[incident_id] = report
    return {"status": "saved", "incident_id": incident_id}

@router.get("/{incident_id}")
def get_report(incident_id: str):
    report = reports_store.get(incident_id)
    if not report:
        raise HTTPException(404, "Report not found")
    return report.dict()

@router.get("/")
def list_reports():
    return {"incident_ids": list(reports_store.keys())}