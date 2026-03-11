from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class Vitals(BaseModel):
    bp_systolic: Optional[int] = None
    bp_diastolic: Optional[int] = None
    heart_rate: Optional[int] = None
    respiratory_rate: Optional[int] = None
    oxygen_saturation: Optional[float] = None
    timestamp: datetime = Field(default_factory=datetime.now)

class Patient(BaseModel):
    incident_id: str                # Unique ID for this call
    age: Optional[int] = None
    gender: Optional[str] = None
    symptoms: List[str] = []
    vitals: List[Vitals] = []
    medications: List[str] = []
    incident_time: datetime = Field(default_factory=datetime.now)
    report: Optional[str] = None