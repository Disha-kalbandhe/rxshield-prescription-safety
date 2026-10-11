import json
import re
from pathlib import Path

from app.schemas.prescription import StructuredPrescription

RULES_PATH = Path(__file__).with_name("rules.json")


def _rules() -> dict:
    return json.loads(RULES_PATH.read_text(encoding="utf-8"))


def check_safety(prescription: StructuredPrescription) -> list[dict]:
    rules = _rules()
    names = {m.normalized_drug for m in prescription.medications if m.normalized_drug}
    findings: list[dict] = []
    for rule in rules["interactions"]:
        if set(rule["drugs"]).issubset(names):
            findings.append(_finding(rule, sorted(names & set(rule["drugs"]))))
    allergies = {a.lower().strip() for a in prescription.allergies}
    for rule in rules["allergies"]:
        if rule["allergen"] in allergies and names.intersection(rule["drugs"]):
            findings.append(_finding(rule, sorted(names.intersection(rule["drugs"]))))
    for medication in prescription.medications:
        if medication.normalized_drug == "metformin" and medication.dose:
            amount = re.search(r"(\d+(?:\.\d+)?)", medication.dose)
            if amount and float(amount.group(1)) > 2000:
                findings.append(_finding(rules["dosages"][0], [medication.normalized_drug]))
    for rule in rules["lasa"]:
        if names.intersection(rule["drugs"]):
            findings.append(_finding(rule, sorted(names.intersection(rule["drugs"]))))
    return findings


def _finding(rule: dict, drugs: list[str]) -> dict:
    return {
        "rule_id": rule["rule_id"],
        "type": rule["type"],
        "severity": rule["severity"],
        "drugs": drugs,
        "reason": rule["description"],
        "evidence": rule["evidence"],
        "source": "Prototype knowledge base",
        "confidence": "Rule match; not clinically validated",
    }


def risk_level(findings: list[dict]) -> str:
    levels = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}
    return max((f["severity"] for f in findings), key=lambda value: levels[value], default="LOW")
