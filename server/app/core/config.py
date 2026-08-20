import os
from pathlib import Path
from dotenv import load_dotenv

# Resolve base server directory and load .env file
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = BASE_DIR / ".env"

if ENV_PATH.exists():
    load_dotenv(dotenv_path=str(ENV_PATH))

class Settings:
    SERVER_APP_NAME: str = os.getenv("SERVER_APP_NAME", "AI Backend")
    # Supports both standard SERVER_HOST and the SEVER_HOST typo found in .env
    SERVER_HOST: str = os.getenv("SEVER_HOST", os.getenv("SERVER_HOST", "127.0.0.1"))
    SERVER_PORT: int = int(os.getenv("SERVER_PORT", 8000))
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL","groq/compound")

settings = Settings()
