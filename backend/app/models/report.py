from pydantic import BaseModel
from typing import Optional  # <-- THIS WAS MISSING. Optional means "this field can be
                             #     empty/None, it's not required." Without this import,
                             #     Python doesn't know what Optional means and throws an error.
from datetime import datetime


class FinalReport(BaseModel):
    incident_id: str
    incident_time: datetime
    summary: str           # The full human-readable report text
    vitals_history: list   # A list of all vitals recorded during the call
    medications_given: list
    protocol_followed: str
    pdf_path: Optional[str] = None  # Where the PDF was saved. Can be empty if no PDF yet.