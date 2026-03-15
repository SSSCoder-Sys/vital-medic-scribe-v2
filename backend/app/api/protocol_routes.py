from fastapi import APIRouter, HTTPException
from app.services import protocol_engine


# FIX: Removed prefix="/protocol" from here.
# Same double-prefix bug as log_routes.py — main.py already adds this prefix.
router = APIRouter(tags=["Protocol"])


@router.post("/start")
def start_protocol(incident_id: str, condition: str):
    """
    Create a new protocol checklist for an incident.
    Example: POST /protocol/start?incident_id=INC001&condition=cardiac event
    """
    checklist = protocol_engine.create_checklist(incident_id, condition)
    return checklist.model_dump()


@router.get("/{incident_id}")
def get_checklist(incident_id: str):
    """Get the current checklist state for an active incident."""
    checklist = protocol_engine.get_checklist(incident_id)
    if not checklist:
        raise HTTPException(404, "No checklist found for this incident ID.")
    return checklist.model_dump()


@router.post("/{incident_id}/complete_step")
def complete_step(incident_id: str, step: str):
    """
    Mark a protocol step as done.
    Example: POST /protocol/INC001/complete_step?step=Oxygen administered
    """
    checklist = protocol_engine.update_checklist_step(incident_id, step, True)
    if not checklist:
        raise HTTPException(404, "Checklist not found.")
    return checklist.model_dump()


@router.post("/{incident_id}/uncomplete_step")
def uncomplete_step(incident_id: str, step: str):
    """Undo a completed step (in case it was marked done by mistake)."""
    checklist = protocol_engine.update_checklist_step(incident_id, step, False)
    if not checklist:
        raise HTTPException(404, "Checklist not found.")
    return checklist.model_dump()