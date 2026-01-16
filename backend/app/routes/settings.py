"""
Settings API Routes - User API Key Management
"""
from fastapi import APIRouter, Depends, HTTPException
from ..database import get_database
from ..utils.auth import get_current_user
from ..models.user import UserResponse
from ..models.settings import UserSettingsUpdate, UserSettingsResponse
from datetime import datetime

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("")
async def get_settings(
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get user's API key settings (masked for security)."""
    settings = await db.user_settings.find_one({"user_id": current_user.id})
    
    if not settings:
        # Return empty settings if none exist
        return {
            "user_id": current_user.id,
            "groq_api_key": None,
            "deepgram_api_key": None,
            "gemini_api_key": None,
            "elevenlabs_api_key": None,
            "updated_at": datetime.utcnow()
        }
    
    # Mask API keys for security (show only last 4 characters)
    def mask_key(key: str) -> str:
        if not key or len(key) < 8:
            return None
        return f"{'*' * (len(key) - 4)}{key[-4:]}"
    
    return {
        "user_id": settings["user_id"],
        "groq_api_key": mask_key(settings.get("groq_api_key")),
        "deepgram_api_key": mask_key(settings.get("deepgram_api_key")),
        "gemini_api_key": mask_key(settings.get("gemini_api_key")),
        "elevenlabs_api_key": mask_key(settings.get("elevenlabs_api_key")),
        "updated_at": settings.get("updated_at", datetime.utcnow())
    }


@router.put("")
async def update_settings(
    settings: UserSettingsUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_database)
):
    """Update user's API key settings."""
    update_data = {k: v for k, v in settings.dict().items() if v is not None}
    update_data["user_id"] = current_user.id
    update_data["updated_at"] = datetime.utcnow()
    
    await db.user_settings.update_one(
        {"user_id": current_user.id},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Settings updated successfully"}


async def get_user_api_keys(db, user_id: str) -> dict:
    """Helper function to get user's API keys for service usage."""
    settings = await db.user_settings.find_one({"user_id": user_id})
    
    if not settings:
        return {}
    
    return {
        "groq_api_key": settings.get("groq_api_key"),
        "deepgram_api_key": settings.get("deepgram_api_key"),
        "gemini_api_key": settings.get("gemini_api_key"),
        "elevenlabs_api_key": settings.get("elevenlabs_api_key")
    }
