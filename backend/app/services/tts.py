"""
Text-to-Speech Service with Edge TTS (Free) and ElevenLabs support
Uses API keys from .env file.
"""
import httpx
import edge_tts
import tempfile
import os
from fastapi import HTTPException
from ..config import settings


async def synthesize_edge_tts(text: str, voice: str = "en-US-ChristopherNeural") -> bytes:
    """Edge TTS (Free, High Quality)"""
    communicate = edge_tts.Communicate(text, voice)
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as temp_file:
        temp_path = temp_file.name
    
    try:
        await communicate.save(temp_path)
        with open(temp_path, "rb") as f:
            return f.read()
    finally:
        if os.path.exists(temp_path):
            os.unlink(temp_path)


async def synthesize_elevenlabs(text: str, voice_id: str = "21m00Tcm4TlvDq8ikWAM") -> bytes:
    """ElevenLabs TTS"""
    if not settings.ELEVENLABS_API_KEY:
        raise Exception("ELEVENLABS_API_KEY not configured in .env")
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
            headers={
                "xi-api-key": settings.ELEVENLABS_API_KEY,
                "Content-Type": "application/json"
            },
            json={
                "text": text,
                "model_id": "eleven_flash_v2_5",
                "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}
            }
        )
        
    if response.status_code != 200:
        raise Exception(f"ElevenLabs error: {response.status_code}")
    
    return response.content


async def synthesize_speech(text: str, provider: str = "edge", voice_id: str = "en-US-ChristopherNeural") -> bytes:
    """
    Synthesize speech using specified provider.
    Default: Edge TTS (Free)
    API keys are loaded from .env file.
    """
    print(f"[TTS] Synthesizing {len(text)} chars with provider: {provider}, voice: {voice_id}")
    
    try:
        if provider == "elevenlabs":
            audio = await synthesize_elevenlabs(text, voice_id)
        else:  # Default to edge
            audio = await synthesize_edge_tts(text, voice=voice_id)
        
        print(f"[TTS] Success: {len(audio)} bytes")
        return audio
        
    except Exception as e:
        print(f"[TTS] Error with {provider}: {str(e)}")
        
        # Fallback to Edge TTS if ElevenLabs fails
        if provider == "elevenlabs":
            print("[TTS] Falling back to Edge TTS...")
            try:
                audio = await synthesize_edge_tts(text)
                print(f"[TTS] Fallback success: {len(audio)} bytes")
                return audio
            except Exception as fallback_error:
                print(f"[TTS] Fallback failed: {str(fallback_error)}")
        
        raise HTTPException(status_code=500, detail=f"TTS failed: {str(e)}")
