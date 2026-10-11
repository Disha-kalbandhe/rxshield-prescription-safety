from fastapi import APIRouter

from app.config import DISCLAIMER, PROJECT_NAME, STAGE
from app.schemas.prescription import PrescriptionAnalysis, PrescriptionTextRequest, StructuredPrescription
from app.services.ner.baseline_ner import extract_prescription
from app.services.normalization.normalizer import normalize
from app.services.safety.rule_engine import check_safety, risk_level

router = APIRouter()


def analyze(prescription: StructuredPrescription, ocr: dict | None = None) -> PrescriptionAnalysis:
    prescription = normalize(prescription)
    findings = check_safety(prescription)
    level = risk_level(findings)
    return PrescriptionAnalysis(
        stage=STAGE,
        disclaimer=DISCLAIMER,
        extraction_label="Baseline Rule-Based NER",
        ocr=ocr,
        prescription=prescription,
        findings=findings,
        risk_level=level,
        risk_label="Prototype risk stratification — not a clinical risk score.",
    )


@router.post("/api/prescription/analyze-text", response_model=PrescriptionAnalysis)
def analyze_text(request: PrescriptionTextRequest) -> PrescriptionAnalysis:
    return analyze(extract_prescription(request.text))


@router.post("/api/prescription/analyze-json", response_model=PrescriptionAnalysis)
def analyze_json(request: StructuredPrescription) -> PrescriptionAnalysis:
    return analyze(request)
