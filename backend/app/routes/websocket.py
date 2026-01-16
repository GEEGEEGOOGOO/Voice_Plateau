"""
WebSocket Voice Chat Route - Real-time voice interaction with streaming
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from bson import ObjectId
import json
import base64

from ..database import get_database
from ..services.stt import transcribe_audio
from ..services.llm import generate_response
from ..services.tts import synthesize_speech
from ..utils.auth import verify_token

router = APIRouter(prefix="/ws", tags=["websocket"])


@router.websocket("/voice/{agent_id}")
async def websocket_voice_chat(
    websocket: WebSocket,
    agent_id: str,
    db = Depends(get_database)
):
    """
    WebSocket endpoint for real-time voice chat with streaming audio.
    
    Protocol:
    1. Client sends: {"type": "auth", "token": "jwt_token"}
    2. Server responds: {"type": "auth", "status": "success"}
    3. Client sends: {"type": "audio", "data": "base64_audio_data"}
    4. Server streams: {"type": "transcript", "text": "..."}
    5. Server streams: {"type": "response", "text": "..."}
    6. Server streams: {"type": "audio_chunk", "data": "base64_chunk"}
    7. Server sends: {"type": "audio_complete"}
    """
    await websocket.accept()
    
    user = None
    agent = None
    
    try:
        # Step 1: Authenticate
        auth_message = await websocket.receive_json()
        
        if auth_message.get("type") != "auth":
            await websocket.send_json({"type": "error", "message": "Authentication required"})
            await websocket.close()
            return
        
        token = auth_message.get("token")
        if not token:
            await websocket.send_json({"type": "error", "message": "Token required"})
            await websocket.close()
            return
        
        # Verify JWT token
        try:
            user = verify_token(token)
        except Exception as e:
            await websocket.send_json({"type": "error", "message": "Invalid token"})
            await websocket.close()
            return
        
        # Validate agent
        if not ObjectId.is_valid(agent_id):
            await websocket.send_json({"type": "error", "message": "Invalid agent ID"})
            await websocket.close()
            return
        
        agent = await db.agents.find_one({
            "_id": ObjectId(agent_id),
            "user_id": user["id"]
        })
        
        if not agent:
            await websocket.send_json({"type": "error", "message": "Agent not found"})
            await websocket.close()
            return
        
        # Send auth success
        await websocket.send_json({
            "type": "auth",
            "status": "success",
            "agent_name": agent["name"]
        })
        
        print(f"[WS] Client connected for agent: {agent['name']}")
        
        # Main message loop
        while True:
            message = await websocket.receive_json()
            
            if message.get("type") == "audio":
                # Process voice input
                audio_data = message.get("data")
                if not audio_data:
                    await websocket.send_json({"type": "error", "message": "No audio data"})
                    continue
                
                try:
                    # Decode base64 audio
                    audio_bytes = base64.b64decode(audio_data)
                    
                    # Step 1: STT
                    print("[WS] Transcribing audio...")
                    await websocket.send_json({"type": "status", "message": "Transcribing..."})
                    
                    # Create temporary file for STT
                    import tempfile
                    import os
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
                        temp_audio.write(audio_bytes)
                        temp_audio_path = temp_audio.name
                    
                    try:
                        # Transcribe using the file path
                        from fastapi import UploadFile
                        import io
                        
                        # Create UploadFile-like object
                        class AudioFile:
                            def __init__(self, data, filename):
                                self.file = io.BytesIO(data)
                                self.filename = filename
                                self.content_type = "audio/wav"
                            
                            async def read(self):
                                return self.file.read()
                        
                        audio_file = AudioFile(audio_bytes, "recording.wav")
                        user_text = await transcribe_audio(audio_file)
                        
                        # Send transcript
                        await websocket.send_json({
                            "type": "transcript",
                            "text": user_text
                        })
                        print(f"[WS] Transcript: {user_text[:50]}...")
                        
                        # Step 2: LLM
                        print("[WS] Generating response...")
                        await websocket.send_json({"type": "status", "message": "Thinking..."})
                        
                        llm_response = await generate_response(
                            system_prompt=agent["system_prompt"],
                            user_message=user_text
                        )
                        
                        # Send LLM response
                        await websocket.send_json({
                            "type": "response",
                            "text": llm_response
                        })
                        print(f"[WS] Response: {llm_response[:50]}...")
                        
                        # Step 3: TTS with streaming
                        print("[WS] Synthesizing speech...")
                        await websocket.send_json({"type": "status", "message": "Synthesizing..."})
                        
                        from ..utils.text_processing import clean_text_for_tts
                        tts_text = clean_text_for_tts(llm_response)
                        
                        # Get agent voice
                        voice_id = agent.get("voice_id", "en-US-ChristopherNeural")
                        audio_bytes = await synthesize_speech(tts_text, voice_id=voice_id)
                        
                        # Stream audio in chunks
                        chunk_size = 8192  # 8KB chunks
                        total_chunks = (len(audio_bytes) + chunk_size - 1) // chunk_size
                        
                        for i in range(0, len(audio_bytes), chunk_size):
                            chunk = audio_bytes[i:i + chunk_size]
                            chunk_base64 = base64.b64encode(chunk).decode('utf-8')
                            
                            await websocket.send_json({
                                "type": "audio_chunk",
                                "data": chunk_base64,
                                "chunk_index": i // chunk_size,
                                "total_chunks": total_chunks
                            })
                        
                        # Signal completion
                        await websocket.send_json({
                            "type": "audio_complete",
                            "total_bytes": len(audio_bytes)
                        })
                        print(f"[WS] Audio streamed: {len(audio_bytes)} bytes in {total_chunks} chunks")
                        
                    finally:
                        # Clean up temp file
                        if os.path.exists(temp_audio_path):
                            os.unlink(temp_audio_path)
                
                except Exception as e:
                    print(f"[WS] Error processing audio: {str(e)}")
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Processing failed: {str(e)}"
                    })
            
            elif message.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
            
            else:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Unknown message type: {message.get('type')}"
                })
    
    except WebSocketDisconnect:
        print(f"[WS] Client disconnected")
    except Exception as e:
        print(f"[WS] Unexpected error: {str(e)}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except:
            pass
    finally:
        try:
            await websocket.close()
        except:
            pass
