from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ChecklistItem(BaseModel):
    step: str
    completed: bool = False
    completed_at: Optional[datetime] = None

class ProtocolChecklist(BaseModel):
    incident_id: str
    protocol_name: str
    items: List[ChecklistItem]