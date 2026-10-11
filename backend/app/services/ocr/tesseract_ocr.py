from .base import OCRProvider


class TesseractOCR(OCRProvider):
    def extract(self, image_path: str) -> dict:
        try:
            import pytesseract
            from PIL import Image
        except ImportError:
            return {"raw_text": "", "confidence": 0, "provider": "none", "status": "unavailable"}
        try:
            text = pytesseract.image_to_string(Image.open(image_path)).strip()
            return {"raw_text": text, "confidence": 0.0, "provider": "tesseract", "status": "success"}
        except (OSError, RuntimeError):
            return {"raw_text": "", "confidence": 0, "provider": "tesseract", "status": "unavailable"}
