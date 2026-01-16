"""
Skill model for database storage
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class SkillBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(default="")
    category: str = Field(default="general")
    content: str = Field(..., min_length=1)  # The full .md content


class SkillCreate(SkillBase):
    pass


class SkillUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    category: Optional[str] = None
    content: Optional[str] = None


class SkillResponse(SkillBase):
    id: str
    user_id: str
    created_at: datetime
    is_system: bool = False  # True for pre-built skills


class SkillInDB(SkillBase):
    user_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_system: bool = False
