from typing import Dict, Optional
from app.models.checklist import ProtocolChecklist, ChecklistItem
from datetime import datetime

# In-memory store for active checklists (keyed by incident_id)
_active_checklists: Dict[str, ProtocolChecklist] = {}

def get_protocol_for_condition(suspected_condition: str) -> list:
    """Return checklist steps based on suspected condition."""
    protocols = {
        "cardiac event": [
            "Oxygen administered",
            "Aspirin given",
            "ECG performed",
            "Nitroglycerin (if indicated)"
        ],
        "stroke": [
            "Last known well time",
            "Blood glucose checked",
            "Cincinnati Prehospital Stroke Scale",
            "Notify stroke center"
        ],
        "respiratory distress": [
            "Oxygen administered",
            "Assess breath sounds",
            "Nebulizer treatment (if indicated)",
            "Monitor SpO2"
        ],
        "trauma": [
            "C-spine immobilization",
            "Primary survey (ABCs)",
            "Control bleeding",
            "Secondary survey"
        ]
    }
    # Default generic protocol if condition not recognized
    default = [
        "Primary assessment",
        "Vitals taken",
        "History obtained",
        "Interventions performed"
    ]
    # Normalize condition (lowercase, maybe partial match)
    for key in protocols:
        if key in suspected_condition.lower():
            return protocols[key]
    return default

def create_checklist(incident_id: str, condition: str) -> ProtocolChecklist:
    """Create a new checklist for an incident."""
    steps = get_protocol_for_condition(condition)
    items = [ChecklistItem(step=step) for step in steps]
    checklist = ProtocolChecklist(
        incident_id=incident_id,
        protocol_name=condition,
        items=items
    )
    _active_checklists[incident_id] = checklist
    return checklist

def get_checklist(incident_id: str) -> Optional[ProtocolChecklist]:
    return _active_checklists.get(incident_id)

def update_checklist_step(incident_id: str, step: str, completed: bool = True) -> Optional[ProtocolChecklist]:
    """Mark a step as completed (or uncompleted)."""
    checklist = _active_checklists.get(incident_id)
    if checklist:
        for item in checklist.items:
            if item.step.lower() == step.lower():
                item.completed = completed
                if completed:
                    item.completed_at = datetime.now()
                else:
                    item.completed_at = None
                return checklist
    return None

def delete_checklist(incident_id: str):
    """Remove checklist from memory (when incident is closed)."""
    if incident_id in _active_checklists:
        del _active_checklists[incident_id]