from abc import ABC, abstractmethod

class BaseSST(ABC):

    @abstractmethod
    def __init__(self):
        pass

    @abstractmethod
    def transcribe(self, audio):
        pass

    