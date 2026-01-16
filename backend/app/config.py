from pydantic_settings import BaseSettings
import os
from dotenv import load_dotenv

load_dotenv(override=True)

class Settings(BaseSettings):
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "voice_platform")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super-secret-key-change-me")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # AI Providers
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    DEEPGRAM_API_KEY: str = os.getenv("DEEPGRAM_API_KEY", "")
    ELEVENLABS_API_KEY: str = os.getenv("ELEVENLABS_API_KEY", "")

settings = Settings()
