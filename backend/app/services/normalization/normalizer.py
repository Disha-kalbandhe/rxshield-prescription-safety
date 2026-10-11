from app.schemas.prescription import StructuredPrescription

DRUG_ALIASES = {
    "amox": "amoxicillin",
    "amoxicillin": "amoxicillin",
    "augmentin": "amoxicillin/clavulanate",
    "warfarin": "warfarin",
    "aspirin": "aspirin",
    "penicillin": "penicillin",
    "hydroxyzine": "hydroxyzine",
    "hydralazine": "hydralazine",
    "metformin": "metformin",
    "ibuprofen": "ibuprofen",
}


def normalize(prescription: StructuredPrescription) -> StructuredPrescription:
    for medication in prescription.medications:
        canonical = DRUG_ALIASES.get(medication.drug.lower().strip())
        medication.normalized_drug = canonical
        medication.normalization_status = "RESOLVED" if canonical else "UNRESOLVED"
    return prescription
