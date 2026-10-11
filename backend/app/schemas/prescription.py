from typing import Any

from pydantic import BaseModel, Field


class PrescriptionTextRequest(BaseModel):
    text: str = Field(min_length=1)


class Medication(BaseModel):
    drug: str
    normalized_drug: str | None = None
    normalization_status: str = "UNRESOLVED"
    dose: str | None = None
    frequency: str | None = None
    route: str | None = None
    duration: str | None = None


class StructuredPrescription(BaseModel):
    patient_age: int | None = None
    allergies: list[str] = []
    medications: list[Medication] = []
    source_text: str = ""


class PrescriptionAnalysis(BaseModel):
    stage: str
    disclaimer: str
    extraction_label: str
    ocr: dict[str, Any] | None = None
    prescription: StructuredPrescription
    findings: list[dict[str, Any]]
    risk_level: str
    risk_label: str
