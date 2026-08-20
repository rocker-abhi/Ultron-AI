import sys
from pathlib import Path

# Add project root and LLM directory to sys.path to resolve imports on direct execution
BASE_DIR = Path(__file__).resolve().parent.parent.parent
LLM_DIR = Path(__file__).resolve().parent

for p in (BASE_DIR, LLM_DIR):
    if str(p) not in sys.path:
        sys.path.append(str(p))

from app.core import logger
from llm_base import Base
from langchain_groq.chat_models import ChatGroq
from langchain_core.messages import HumanMessage
from app.core.config import settings

class GROQClinet(Base):

    __instance = None

    def __new__(cls, *args, **kwargs):
        if cls.__instance is None:
            cls.__instance = super().__new__(cls)
        return cls.__instance

    def __init__(self, groq_model, api_key, temperature=0.3):
        super().__init__(groq_model, api_key, temperature)
        self.model = ChatGroq(
            model=groq_model,
            api_key=api_key,
            temperature=temperature
        )
    
    async def get_response(self, message):
        try:
            logger.info("Streaming response from GROQ...")
            async for chunk in self.model.astream([HumanMessage(content=message)]):
                yield chunk.content
        except Exception as e:
            logger.error(f"Error calling Groq API: {e}")
            yield str(e)


groq = GROQClinet(settings.GROQ_MODEL, settings.GROQ_API_KEY)


async def test_groq():
    test_client = GROQClinet(settings.GROQ_MODEL, settings.GROQ_API_KEY)
    async for chunk in test_client.get_response("Hello, how are you?"):
        print(chunk, end='')
    print()


if __name__ == '__main__':
    # Test invocation of client
    import asyncio
    asyncio.run(test_groq())
