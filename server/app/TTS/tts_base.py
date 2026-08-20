from abc import abstractmethod , ABC

class TTS_BASE(ABC):

    @abstractmethod
    def convert_to_audio_bytes(self, text:str):
        pass
