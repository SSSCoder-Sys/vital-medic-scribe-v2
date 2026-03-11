from fastapi import APIRouter, HTTPException
from app.services import protocol_engine
from app.models.checklist import ProtocolChecklist

router = APIRouter(prefix="/protocol", tags=["Protocol"])

@router.post("/start")
def start_protocol(incident_id: str, condition: str):
    """Create a new checklist for an incident."""
    checklist = protocol_engine.create_checklist(incident_id, condition)
    return checklist.dict()

@router.get("/{incident_id}")
def get_checklist(incident_id: str):
    checklist = protocol_engine.get_checklist(incident_id)
    if not checklist:
        raise HTTPException(404, "Checklist not found")
    return checklist.dict()

@router.post("/{incident_id}/complete_step")
def complete_step(incident_id: str, step: str):
    """Mark a step as completed."""
    checklist = protocol_engine.update_checklist_step(incident_id, step, True)
    if not checklist:
        raise HTTPException(404, "Checklist not found")
    return checklist.dict()

@router.post("/{incident_id}/uncomplete_step")
def uncomplete_step(incident_id: str, step: str):
    """Mark a step as not completed (if needed)."""
    checklist = protocol_engine.update_checklist_step(incident_id, step, False)
    if not checklist:
        raise HTTPException(404, "Checklist not found")
    return checklist.dict()