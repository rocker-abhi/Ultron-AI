from abc import abstractmethod , ABC

class TTS_BASE(ABC):

    @abstractmethod
    def convert_to_audio_bytes(self, text:str):
        pass

    @staticmethod
    def filter(text: str) -> str:
        """Filter input text before TTS conversion, e.g., removing markdown bold indicators."""
        return text.replace("**", "")