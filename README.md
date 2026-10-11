# RxShield

RxShield is an AI-assisted prescription safety and medication error detection
system. It is an active-development academic prototype, not a clinical
decision-support product. The repository contains a substantially implemented
application flow while model validation, production integration, security
hardening, and deployment remain in progress.

## Problem and proposed solution

Prescription review can require checking medication names, dosage instructions,
patient context, allergies, look-alike/sound-alike (LASA) medicines, and
drug-drug interactions. RxShield combines a web application, an API layer, OCR,
rule-based checks, and experimental ML pipelines to make those checks easier to
review. Results are advisory and must be verified by a qualified professional.

## Architecture

```text
React/Vite frontend
        |
        v
Express backend ---- Firebase Auth/Firestore
        |
        +---- OCR and prescription analysis ---- FastAPI ML service
        |                                           |
        |                                           +-- OCR prototype
        |                                           +-- rules and LASA checks
        |                                           +-- classifier/anomaly/NER pipelines
        |
        +---- RxNorm interaction lookup
```

The Express backend is the primary application API used by the frontend. The
FastAPI code under `backend/app/` is an additional structured prototype service
for the rule-based analysis path; it is not currently wired into the React
application.

## Current development status

| Area | Status |
| --- | --- |
| Project architecture | Completed |
| Frontend prototype | Substantially implemented |
| Backend API layer | Implemented |
| Authentication | Initial implementation |
| OCR pipeline | Prototype |
| Rule-based medication checks | Initial implementation |
| ML classifier | Training/evaluation stage |
| Anomaly detection | Development stage |
| LASA detection | Initial implementation |
| ML/backend integration | In progress |
| Testing | In progress |
| Security hardening | Pending |
| Deployment | Pending |
| Final validation | Pending |

## Current capabilities

- React pages for landing, login, doctor dashboard, patient profiles,
  pharmacist review, OCR upload, and audit history.
- Firebase authentication context and protected routes.
- Express routes for patients, prescriptions, OCR forwarding, and audit logs.
- Firebase-backed persistence when valid local credentials are configured.
- OCR request handling with image validation, size limits, and ML-service error
  reporting.
- Rule/reference data for allergies, formulary checks, DDI checks, diagnosis
  mappings, and LASA pairs.
- Synthetic-data generation and validation scripts.
- Experimental classifier, anomaly-detection, NER, OCR, and prediction
  interfaces.

## Technology stack

- Frontend: React, Vite, React Router, Firebase client SDK, Axios, Tailwind
  utilities, and Lucide icons.
- Backend: Node.js, Express, Firebase Admin SDK, Axios, Multer, and optional
  Google Gemini/Cloudinary integrations.
- ML service: Python, FastAPI, Pydantic, scikit-learn, Transformers, OCR
  libraries, and supporting data-science packages.
- Data: synthetic development records and small medication/reference files.

## Project structure

```text
backend/       Express API, Firebase configuration, routes, and integrations
frontend/      React/Vite application and reusable UI components
ml-service/    FastAPI service, OCR/rules, model pipelines, and data scripts
data/          Small synthetic demonstration examples and project notes
docs/          Architecture, roadmap, and research-gap notes
```

Generated patient/prescription datasets, model outputs, Python caches, local
virtual environments, and environment files are intentionally excluded from
version control. Reference rule files and source training scripts remain
available for reproducible development.

## Local setup

Requirements:

- Node.js 18 or newer
- Python 3.10 or newer
- Tesseract OCR for local OCR experiments
- Firebase project credentials for authenticated Express routes

Install dependencies separately:

```powershell
cd frontend
npm install

cd ..\backend
npm install

cd ..\ml-service
python -m pip install -r requirements.txt
```

Copy each `.env.example` to `.env` locally and replace the placeholders with
your own values. Never commit `.env`, Firebase private keys, API keys, tokens,
passwords, or service credentials.

### Run the frontend

```powershell
cd frontend
npm run dev
```

### Run the Express backend

```powershell
cd backend
npm start
```

The backend defaults to port `5000`. It requires Firebase Admin values and
`ML_API_URL`; see `backend/.env.example`.

### Run the ML service

```powershell
cd ml-service
python -m uvicorn api.main:app --reload --port 8000
```

The service exposes health and analysis routes defined in
`ml-service/api/main.py`. Some model-backed paths remain development-only and
should return an explicit unavailable/development response until a validated
model is configured.

## Synthetic data and model development

The `ml-service/data_gen/` scripts generate synthetic patient and prescription
records, inject controlled errors, and validate the resulting data. The
generated records are for software development only; they do not represent
clinical populations and must not be treated as patient data.

The classifier, anomaly, NER, OCR, and LASA source modules are retained so model
development can continue. Saved model binaries and generated training splits
are ignored because they are reproducible outputs, can be large, and should not
be presented as clinically validated artifacts.

## Remaining work

1. Expand and validate synthetic training data.
2. Improve class balance and document generation assumptions.
3. Train and compare candidate classifier models.
4. Tune and validate anomaly detection.
5. Evaluate OCR robustness across image quality and languages.
6. Improve LASA medication detection and normalization.
7. Integrate only validated ML models with the backend.
8. Add comprehensive backend/API tests.
9. Add frontend integration and accessibility tests.
10. Improve authentication, authorization, input validation, and secret
    handling.
11. Perform end-to-end testing across frontend, backend, and ML service.
12. Prepare and verify deployment configuration for each service.
13. Conduct final performance evaluation without overstating clinical claims.
14. Document limitations, failure cases, and operational safeguards.

## Limitations

RxShield is not clinically validated, does not replace a pharmacist or
prescriber, and does not guarantee detection of medication errors. Current
datasets are synthetic or demonstration-only. External services, model
availability, OCR quality, Firebase configuration, and RxNorm connectivity can
affect results. No accuracy, F1 score, benchmark, deployment, or clinical
outcome claim is made by this repository.

## License

See [LICENSE](LICENSE).
