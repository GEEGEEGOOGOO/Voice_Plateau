from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum

# Provider enums - Only supported providers (with backward compatibility)
class STTProvider(str, Enum):
    groq_whisper = "groq_whisper"
    whisper = "whisper"  # Backward compatibility
    deepgram = "deepgram"

class LLMProvider(str, Enum):
    groq = "groq"
    groq_instant = "groq_instant"  # Llama 3.1 8B Instant
    gemini = "gemini"
    gemini_2 = "gemini_2"  # Gemini 2.0 Flash Exp
    openai = "openai"  # Backward compatibility
    anthropic = "anthropic"  # Backward compatibility

class TTSProvider(str, Enum):
    edge = "edge"
    elevenlabs = "elevenlabs"
    openai_tts = "openai_tts"  # Backward compatibility

# Request/Response Models
class AgentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    system_prompt: str = Field(..., min_length=1)
    stt_provider: STTProvider = STTProvider.groq_whisper
    llm_provider: LLMProvider = LLMProvider.groq
    tts_provider: TTSProvider = TTSProvider.edge
    voice_id: Optional[str] = "en-US-ChristopherNeural"  # Default Edge TTS voice
    skills: List[str] = Field(default_factory=list)

class AgentCreate(AgentBase):
    pass

class AgentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    system_prompt: Optional[str] = Field(None, min_length=1)
    stt_provider: Optional[STTProvider] = None
    llm_provider: Optional[LLMProvider] = None
    tts_provider: Optional[TTSProvider] = None
    voice_id: Optional[str] = None
    skills: Optional[List[str]] = None

class AgentResponse(AgentBase):
    id: str
    user_id: str
    created_at: datetime

    model_config = ConfigDict(
        populate_by_name=True,
    )

class AgentInDB(AgentBase):
    user_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
