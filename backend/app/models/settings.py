"""
User Settings Model - API Keys
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class UserSettingsBase(BaseModel):
    groq_api_key: Optional[str] = None
    deepgram_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    elevenlabs_api_key: Optional[str] = None


class UserSettingsUpdate(UserSettingsBase):
    pass


class UserSettingsResponse(UserSettingsBase):
    user_id: str
    updated_at: datetime


class UserSettingsInDB(UserSettingsBase):
    user_id: str
    updated_at: datetime = Field(default_factory=datetime.utcnow)
