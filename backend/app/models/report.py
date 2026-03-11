from pydantic import BaseModel
from datetime import datetime

class FinalReport(BaseModel):
    incident_id: str
    incident_time: datetime
    summary: str
    vitals_history: list
    medications_given: list
    protocol_followed: str
    pdf_path: Optional[str] = None   # path to generated PDF (if any)