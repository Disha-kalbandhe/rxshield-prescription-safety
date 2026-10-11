import re

from app.schemas.prescription import Medication, StructuredPrescription

DRUGS = [
    "amoxicillin",
    "amox",
    "augmentin",
    "warfarin",
    "aspirin",
    "penicillin",
    "hydroxyzine",
    "hydralazine",
    "metformin",
    "ibuprofen",
]
FREQUENCIES = r"(?:once|twice|three times|four times|every \d+ hours?) (?:daily|a day|hours?)?"
ROUTES = r"(?:oral|by mouth|topical|intravenous|iv|im|subcutaneous)"


def _first(pattern: str, text: str, flags: int = re.IGNORECASE) -> str | None:
    match = re.search(pattern, text, flags)
    return match.group(1).strip() if match else None


def extract_prescription(text: str) -> StructuredPrescription:
    age_value = _first(r"(?:patient\s*)?age\s*[:=-]?\s*(\d{1,3})", text)
    allergy_value = _first(r"allerg(?:y|ies)\s*[:=-]?\s*([^\n]+)", text)
    allergies = [
        item.strip()
        for item in re.split(r",|/| and ", allergy_value or "", flags=re.I)
        if item.strip() and item.strip().lower() not in {"none", "nka", "no known allergies"}
    ]
    medication_text = re.sub(
        r"allerg(?:y|ies)\s*[:=-]?[^\n]*",
        "",
        text,
        flags=re.IGNORECASE,
    )
    medications: list[Medication] = []
    for match in re.finditer(
        rf"\b({'|'.join(map(re.escape, DRUGS))})\b"
        rf"(?:\s+(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml))?"
        rf"(?:\s+({FREQUENCIES}))?"
        rf"(?:\s+(?:for\s+)?(\d+\s+(?:day|days|week|weeks)))?",
        medication_text,
        re.IGNORECASE,
    ):
        drug, amount, unit, frequency, duration = match.groups()
        route = _first(rf"{re.escape(drug)}.*?\b({ROUTES})\b", text)
        medications.append(
            Medication(
                drug=drug,
                dose=f"{amount} {unit}" if amount and unit else None,
                frequency=frequency,
                route=route,
                duration=duration,
            )
        )
    return StructuredPrescription(
        patient_age=int(age_value) if age_value else None,
        allergies=allergies,
        medications=medications,
        source_text=text,
    )
