from app.models.patient import Patient
from app.models.checklist import ProtocolChecklist
from app.models.report import FinalReport
from datetime import datetime
import json
import os

def format_ems_report(patient: Patient, checklist: ProtocolChecklist) -> str:
    """Generate a human-readable EMS report."""
    lines = []
    lines.append(f"Incident ID: {patient.incident_id}")
    lines.append(f"Incident Time: {patient.incident_time}")
    lines.append(f"Patient: {patient.age or '?'}/{patient.gender or '?'}")
    lines.append(f"Symptoms: {', '.join(patient.symptoms) if patient.symptoms else 'None recorded'}")
    lines.append("Vitals History:")
    for v in patient.vitals[-5:]:  # last 5 readings
        lines.append(f"  {v.timestamp}: BP {v.bp_systolic or '?'}/{v.bp_diastolic or '?'} HR {v.heart_rate or '?'} SpO2 {v.oxygen_saturation or '?'}%")
    lines.append(f"Medications: {', '.join(patient.medications) if patient.medications else 'None'}")
    lines.append("Protocol Steps Completed:")
    for item in checklist.items:
        status = "✓" if item.completed else "✗"
        lines.append(f"  {status} {item.step}")
    return "\n".join(lines)

def generate_pdf(report_text: str, filename: str) -> str:
    """
    Stub for PDF generation. In a real app, use reportlab or weasyprint.
    For hackathon, just save as .txt and pretend it's a PDF.
    """
    with open(filename, "w") as f:
        f.write(report_text)
    return filename

def create_final_report(patient: Patient, checklist: ProtocolChecklist) -> FinalReport:
    """Assemble a FinalReport object."""
    summary = format_ems_report(patient, checklist)
    # Extract vitals history as list of dicts for JSON serialization
    vitals_history = [v.model_dump() for v in patient.vitals]
    report = FinalReport(
        incident_id=patient.incident_id,
        incident_time=patient.incident_time,
        summary=summary,
        vitals_history=vitals_history,
        medications_given=patient.medications,
        protocol_followed=checklist.protocol_name,
        pdf_path=None
    )
    return report