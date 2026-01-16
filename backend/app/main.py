from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import connect_to_mongo, close_mongo_connection
from .config import settings
from .routes import auth, agents, voice, websocket, skills, settings, voice_preview

app = FastAPI(title="Voice Platform API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(agents.router, prefix="/api")
app.include_router(voice.router, prefix="/api")
app.include_router(websocket.router, prefix="/api")
app.include_router(skills.router, prefix="/api")
app.include_router(settings.router, prefix="/api")
app.include_router(voice_preview.router, prefix="/api")

@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()

@app.get("/")
async def root():
    return {"message": "Welcome to Voice Platform API"}
