"""
Voice Chat Route - Orchestrates STT → LLM → TTS pipeline
Uses API keys from .env file.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response
from bson import ObjectId

from ..database import get_database
from ..models.user import UserResponse
from ..utils.auth import get_current_user
from ..services.stt import transcribe_audio
from ..services.llm import generate_response
from ..services.tts import synthesize_speech

router = APIRouter(prefix="/voice", tags=["voice"])


@router.post("/chat")
async def voice_chat(
    agent_id: str,
    audio: UploadFile = File(...),
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Complete voice chat pipeline:
    1. Receive audio from user
    2. Transcribe with Whisper (STT)
    3. Generate response with LLM
    4. Synthesize speech with TTS
    5. Return audio response
    
    API keys are loaded from .env file.
    """
    print(f"[VOICE] Starting voice chat for agent: {agent_id}")
    
    # Validate agent belongs to user
    if not ObjectId.is_valid(agent_id):
        raise HTTPException(status_code=400, detail="Invalid agent ID")
    
    agent = await db.agents.find_one({
        "_id": ObjectId(agent_id),
        "user_id": current_user.id
    })
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    print(f"[VOICE] Agent found: {agent['name']}")
    
    try:
        # Get agent's provider preferences
        stt_provider = agent.get("stt_provider", "groq_whisper")
        llm_provider = agent.get("llm_provider", "groq")
        tts_provider = agent.get("tts_provider", "edge")
        agent_skills = agent.get("skills", [])
        
        # Step 1: Transcribe audio (STT)
        print(f"[VOICE] Step 1: Transcribing with {stt_provider}...")
        user_text = await transcribe_audio(audio, provider=stt_provider)
        
        if not user_text.strip():
            raise HTTPException(status_code=400, detail="Could not transcribe audio")
        
        print(f"[VOICE] Transcribed: {user_text[:50]}...")
        
        # Step 2: Generate LLM response with skills from database
        print(f"[VOICE] Step 2: Generating with {llm_provider}...")
        llm_response = await generate_response(
            system_prompt=agent["system_prompt"],
            user_message=user_text,
            skills=agent_skills,
            provider=llm_provider,
            db=db,
            user_id=current_user.id
        )
        print(f"[VOICE] LLM response: {llm_response[:50]}...")
        
        # Step 3: Synthesize speech (TTS)
        print(f"[VOICE] Step 3: Synthesizing with {tts_provider}...")
        
        # Clean text for TTS (remove markdown)
        from ..utils.text_processing import clean_text_for_tts
        tts_text = clean_text_for_tts(llm_response)
        
        voice_id = agent.get("voice_id", "en-US-ChristopherNeural")
        audio_bytes = await synthesize_speech(tts_text, provider=tts_provider, voice_id=voice_id)
        print(f"[VOICE] Audio generated: {len(audio_bytes)} bytes")
        
        # Return JSON with audio (base64) and full text for captions
        import base64
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        
        return {
            "audio_base64": audio_base64,
            "audio_type": "audio/mpeg",
            "user_text": user_text,
            "agent_response": llm_response,
            "agent_name": agent["name"]
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[VOICE] Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Voice processing failed: {str(e)}")


@router.post("/chat/text")
async def voice_chat_text(
    agent_id: str,
    audio: UploadFile = File(...),
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Voice chat but returns JSON instead of audio.
    Useful for debugging or when TTS is not needed.
    """
    # Validate agent belongs to user
    if not ObjectId.is_valid(agent_id):
        raise HTTPException(status_code=400, detail="Invalid agent ID")
    
    agent = await db.agents.find_one({
        "_id": ObjectId(agent_id),
        "user_id": current_user.id
    })
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    try:
        # Step 1: Transcribe audio (STT)
        user_text = await transcribe_audio(audio)
        
        if not user_text.strip():
            raise HTTPException(status_code=400, detail="Could not transcribe audio")
        
        # Step 2: Generate LLM response
        llm_response = await generate_response(
            system_prompt=agent["system_prompt"],
            user_message=user_text,
            db=db,
            user_id=current_user.id
        )
        
        return {
            "user_text": user_text,
            "agent_response": llm_response,
            "agent_name": agent["name"]
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[VOICE/TEXT] Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Voice processing failed: {str(e)}")

@router.post("/speak")
async def speak_text(
    agent_id: str,
    text: str,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Synthesize specific text using the agent's voice settings.
    Used for replaying past messages.
    """
    # Validate agent belongs to user
    if not ObjectId.is_valid(agent_id):
        raise HTTPException(status_code=400, detail="Invalid agent ID")
    
    agent = await db.agents.find_one({
        "_id": ObjectId(agent_id),
        "user_id": current_user.id
    })
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
        
    try:
        tts_provider = agent.get("tts_provider", "edge")
        voice_id = agent.get("voice_id", "en-US-ChristopherNeural")
        
        # Clean text
        from ..utils.text_processing import clean_text_for_tts
        tts_text = clean_text_for_tts(text)
        
        # Synthesize
        audio_bytes = await synthesize_speech(tts_text, provider=tts_provider, voice_id=voice_id)
        
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg"
        )
    except Exception as e:
        print(f"[VOICE/SPEAK] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Speech synthesis failed: {str(e)}")
