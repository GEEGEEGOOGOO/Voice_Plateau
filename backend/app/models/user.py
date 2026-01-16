from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, Annotated
from datetime import datetime
from bson import ObjectId

# Pydantic v2 compatible ObjectId handling
class PyObjectId(str):
    @classmethod
    def __get_pydantic_core_schema__(cls, source, handler):
        from pydantic_core import core_schema
        return core_schema.str_schema()

    @classmethod
    def validate(cls, v):
        if isinstance(v, ObjectId):
            return str(v)
        if isinstance(v, str) and ObjectId.is_valid(v):
            return v
        raise ValueError("Invalid ObjectId")

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserInDB(UserBase):
    id: str = Field(alias="_id")
    password_hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )

class UserResponse(BaseModel):
    id: str
    email: EmailStr

    model_config = ConfigDict(
        populate_by_name=True,
    )
