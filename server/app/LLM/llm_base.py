from abc import ABC, abstractmethod

class Base(ABC):
    def __init__(self, model, api_key, temperature):
        self.model = model
        self.api_key = api_key
        self.temperature = temperature
    
    @abstractmethod
    def get_response(self, message):
        pass
