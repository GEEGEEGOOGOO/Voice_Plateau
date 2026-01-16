"""
Voice Preview Route - Generate sample audio for voice testing
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from ..services.tts import synthesize_speech

router = APIRouter(prefix="/voice-preview", tags=["voice-preview"])


@router.get("/{voice_id}")
async def preview_voice(voice_id: str):
    """
    Generate a sample audio preview for a specific Edge TTS voice.
    Returns audio/mpeg file.
    """
    # Sample text for voice preview
    sample_text = "Hello! This is a sample of my voice. I'm here to help you with your tasks."
    
    try:
        audio_bytes = await synthesize_speech(
            text=sample_text,
            provider="edge",
            voice_id=voice_id
        )
        
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": f"inline; filename=voice_preview_{voice_id}.mp3"
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate voice preview: {str(e)}"
        )
