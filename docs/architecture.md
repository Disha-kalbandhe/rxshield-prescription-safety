# RxShield architecture

Current local flow:

`React + Vite -> FastAPI -> baseline entity extraction -> local drug normalization -> deterministic safety rules -> explainable risk report`

OCR is represented by an `OCRProvider` interface and an optional Tesseract implementation. The current UI uses manual text input first. The rule engine reads a small prototype knowledge base and does not represent a complete clinical database.
