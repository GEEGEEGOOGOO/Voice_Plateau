# 📘 Voice AI Platform: Deep Technical & Product Interview Guide

**Purpose**: This document provides a deep dive into the code (File-by-File), architecture, and strategic questions to help you ace interviews for **Full Stack Developer** OR **Product Manager** roles.

---

# 🏗️ PART 1: CODE & FILE DEEP DIVE

## 🐍 Backend (Python / FastAPI)

### 1. `backend/app/routes/voice.py`
**Role**: The "Orchestrator" or "Controller". This is where the main action happens.

**Critical Code Blocks:**
*   **`@router.post("/chat")`**: This is the API endpoint. Usually listens on `http://localhost:8000/api/voice/chat`.
*   **`async def chat_voice(...)`**: The main function.
    *   **Input**: `file: UploadFile` (The audio blob from frontend) + `agent_id`.
    *   **Logic**:
        1.  `db.agents.find_one(...)`: Fetches the AI persona settings.
        2.  `transcribe_audio(...)`: Uses STT service to get text.
        3.  `generate_response(...)`: Uses LLM service to get an answer.
        4.  `synthesize_speech(...)`: Uses TTS service to create audio.
*   **Key Concept**: **Dependency Injection**. We inject the `current_user` to make sure only the owner can access their agents.

### 2. `backend/app/services/llm.py`
**Role**: The "Brain". Handles the intelligence.

**Critical Code Blocks:**
*   **`BASE_SYSTEM_PROMPT`**: A constant string. It acts as the "Constitution" (e.g., "Keep answers short", "Don't break character").
*   **`build_final_prompt(...)`**: A function that stacks instructions like a sandwich:
    *   *Top*: Base Rules (Constitution)
    *   *Middle*: Agent Persona (e.g., "You are a Math Tutor")
    *   *Bottom*: Skills (e.g., "How to teach Algebra")
*   **`generate_response_groq(...)`**:
    *   Uses `httpx.AsyncClient` to call Groq's API.
    *   Sets `max_tokens=150` to force concise answers.
    *   **Interview Win**: "I implemented a dynamic system prompt architecture to ensure the AI follows instructions hierarchy."

### 3. `backend/app/config.py`
**Role**: Security & Configuration.

**Critical Code Blocks:**
*   **`class Settings(BaseSettings)`**: Uses Pydantic to validate environment variables.
*   **`load_dotenv(override=True)`**: **(Crucial)**. This ensures that the `.env` file you created takes priority over any random system variables on the computer. This was a specific bug fix we made!

---

## ⚛️ Frontend (React / TypeScript)

### 1. `frontend/src/pages/VoiceChat.tsx`
**Role**: The "User Interface" for talking.

**Critical Functions:**
*   **`startRecording()`**:
    *   Uses `navigator.mediaDevices.getUserMedia({ audio: true })`.
    *   Creates a `MediaRecorder` instance to capture microphone input.
*   **`stopRecording()`**:
    *   Stops the recorder. 
    *   Collects "data chunks" into a `Blob` (Binary Large Object).
    *   Triggers `handleSubmission()`.
*   **`handleSubmission(audioBlob)`**:
    *   Creates a `FormData` object (packaging the audio file).
    *   Sends it via `api.post('/voice/chat')`.
    *   Receives the response (Base64 audio) and plays it automatically using `Audio()` object.

### 2. `frontend/src/services/api.ts`
**Role**: The "Network Layer".

**Critical Concepts:**
*   **Axios Instance**: A centralized configuration for all API calls.
*   **Interceptors**: Code that runs *before* every request.
    *   **Why?**: We use it to automatically check `localStorage` for a JWT token and attach it (`Authorization: Bearer <token>`) header. This means we don't need to write auth logic in every single component.

---

# 🧠 PART 2: INTERVIEW QUESTIONS (BY ROLE)

## 👨‍💻 Role 1: Full Stack Developer
*Focus: Implementation, Architecture, Code Quality*

**Q1: "Explain the Request/Response cycle when a user speaks."**
> **Answer**: "The Frontend records an audio Blob and POSTs it to FastAPI. The Backend checks the JWT token, then orchestrates three async services: STT (Whisper) converts audio to text, LLM (Llama 3) processes logic/personality, and TTS services generate audio. Finally, the audio is returned as a base64 string or stream for immediate playback."

**Q2: "How did you handle the latency (delay) issue typical in voice AI?"**
> **Answer**: "Three ways: 1. I used **Groq's LPU** for sub-second LLM inference. 2. I used **Async Python (FastAPI)** to handle blocking I/O calls efficiently. 3. (Bonus) I experimented with **WebSocket streaming** to play audio chunks as they arrive instead of waiting for the full file."

**Q3: "How secure is this application?"**
> **Answer**: "It uses industry-standard **JWT (JSON Web Token)** for stateless authentication. Passwords are hashed using bcrypt before storage. API keys are strictly managed via environment variables (`.env`) and never exposed to the frontend."

---

## 👔 Role 2: Product Manager
*Focus: User Experience, Metrics, Roadmap, "The Why"*

**Q1: "What is the core value proposition of this product?"**
> **Answer**: "It democratizes **Personalized Voice AI**. Unlike generic assistants (Siri/Alexa), this platform allows users to build *specific* agents (e.g., a 'Cognitive Therapist' or 'Python Tutor') with deep, customizable context and skills, interacted with purely via natural voice."

**Q2: "If you had to improve one metric, what would it be?"**
> **Answer**: "**Time-to-Sound**. The critical metric for voice interfaces is latency. Currently, it's ~2-3 seconds. Reducing this to <500ms creates a 'Conversation' feeling versus a 'Transactional' one. We could achieve this by implementing full-duplex WebSockets and VAD (Voice Activity Detection)."

**Q3: "How would you prioritize the roadmap for the next 3 months?"**
> **Answer**: "Month 1: **Mobile Optimization** (most voice usage is on phone). Month 2: **Interruption Handling** (allowing users to cut off the AI). Month 3: **Multimodal Input** (allowing the agent to 'see' images or screens)."

---

# 📝 Technical Dictionary (Buzzwords)

*   **Pydantic**: Library for data validation (used in `models/agent.py`).
*   **Dependency Injection**: FastAPI feature to manage shared resources (like DB connections).
*   **CORS (Cross-Origin Resource Sharing)**: Security rule we configured to allow the React frontend (port 5173) to talk to the Python backend (port 8000).
*   **Prompt Engineering**: The distinct art of crafting the `BASE_SYSTEM_PROMPT` to control AI behavior.
