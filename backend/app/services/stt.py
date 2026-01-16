"""
Speech-to-Text Service with Groq Whisper and Deepgram support
Uses API keys from .env file.
"""
import httpx
from fastapi import UploadFile, HTTPException
from ..config import settings


async def transcribe_groq_whisper(audio_bytes: bytes, filename: str, mime_type: str) -> str:
    """Groq Whisper (Fast & Free)"""
    if not settings.GROQ_API_KEY:
        raise Exception("GROQ_API_KEY not configured in .env")
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
            files={"file": (filename, audio_bytes, mime_type)},
            data={"model": "whisper-large-v3"}
        )
    
    if response.status_code != 200:
        raise Exception(f"Groq Whisper error: {response.text}")
    
    result = response.json()
    return result.get("text", "").strip()


async def transcribe_deepgram(audio_bytes: bytes, mime_type: str) -> str:
    """Deepgram (Real-time capable)"""
    if not settings.DEEPGRAM_API_KEY:
        raise Exception("DEEPGRAM_API_KEY not configured in .env")
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true",
            headers={
                "Authorization": f"Token {settings.DEEPGRAM_API_KEY}",
                "Content-Type": mime_type
            },
            content=audio_bytes
        )
    
    if response.status_code != 200:
        raise Exception(f"Deepgram error: {response.text}")
    
    data = response.json()
    return data["results"]["channels"][0]["alternatives"][0]["transcript"]


async def transcribe_audio(file: UploadFile, provider: str = "groq_whisper") -> str:
    """
    Transcribe audio using specified provider.
    API keys are loaded from .env file.
    """
    audio_bytes = await file.read()
    filename = file.filename or "audio.webm"
    mime_type = file.content_type or "audio/webm"
    
    print(f"[STT] Received: {len(audio_bytes)} bytes, provider: {provider}")
    
    try:
        if provider == "deepgram":
            transcript = await transcribe_deepgram(audio_bytes, mime_type)
        else:  # Default to groq_whisper
            transcript = await transcribe_groq_whisper(audio_bytes, filename, mime_type)
        
        print(f"[STT] Transcript: {transcript[:50]}...")
        return transcript
        
    except Exception as e:
        print(f"[STT] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
