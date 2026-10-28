from abc import ABC, abstractmethod


class OCRProvider(ABC):
    @abstractmethod
    def extract(self, image_path: str) -> dict:
        raise NotImplementedError
