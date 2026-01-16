from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime
from bson import ObjectId
from ..database import get_database
from ..models.agent import AgentCreate, AgentUpdate, AgentResponse
from ..models.user import UserResponse
from ..utils.auth import get_current_user

router = APIRouter(prefix="/agents", tags=["agents"])

@router.post("", response_model=AgentResponse)
async def create_agent(
    agent_in: AgentCreate,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_database)
):
    """Create a new agent for the current user."""
    agent_dict = {
        **agent_in.model_dump(),
        "user_id": current_user.id,
        "created_at": datetime.utcnow()
    }
    result = await db.agents.insert_one(agent_dict)
    
    return AgentResponse(
        id=str(result.inserted_id),
        **agent_dict
    )

@router.get("", response_model=List[AgentResponse])
async def list_agents(
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_database)
):
    """List all agents for the current user."""
    agents = []
    cursor = db.agents.find({"user_id": current_user.id})
    async for agent in cursor:
        agents.append(AgentResponse(
            id=str(agent["_id"]),
            name=agent["name"],
            system_prompt=agent["system_prompt"],
            stt_provider=agent["stt_provider"],
            llm_provider=agent["llm_provider"],
            tts_provider=agent["tts_provider"],
            voice_id=agent.get("voice_id"),
            user_id=agent["user_id"],
            created_at=agent["created_at"]
        ))
    return agents

@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(
    agent_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get a specific agent by ID."""
    if not ObjectId.is_valid(agent_id):
        raise HTTPException(status_code=400, detail="Invalid agent ID")
    
    agent = await db.agents.find_one({
        "_id": ObjectId(agent_id),
        "user_id": current_user.id
    })
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    return AgentResponse(
        id=str(agent["_id"]),
        name=agent["name"],
        system_prompt=agent["system_prompt"],
        stt_provider=agent["stt_provider"],
        llm_provider=agent["llm_provider"],
        tts_provider=agent["tts_provider"],
        voice_id=agent.get("voice_id"),
        user_id=agent["user_id"],
        created_at=agent["created_at"]
    )

@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: str,
    agent_update: AgentUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_database)
):
    """Update an agent."""
    if not ObjectId.is_valid(agent_id):
        raise HTTPException(status_code=400, detail="Invalid agent ID")
    
    # Check agent exists and belongs to user
    agent = await db.agents.find_one({
        "_id": ObjectId(agent_id),
        "user_id": current_user.id
    })
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Only update fields that were provided
    update_data = {k: v for k, v in agent_update.model_dump().items() if v is not None}
    
    if update_data:
        await db.agents.update_one(
            {"_id": ObjectId(agent_id)},
            {"$set": update_data}
        )
    
    # Fetch updated agent
    updated_agent = await db.agents.find_one({"_id": ObjectId(agent_id)})
    
    return AgentResponse(
        id=str(updated_agent["_id"]),
        name=updated_agent["name"],
        system_prompt=updated_agent["system_prompt"],
        stt_provider=updated_agent["stt_provider"],
        llm_provider=updated_agent["llm_provider"],
        tts_provider=updated_agent["tts_provider"],
        voice_id=updated_agent.get("voice_id"),
        user_id=updated_agent["user_id"],
        created_at=updated_agent["created_at"]
    )

@router.delete("/{agent_id}")
async def delete_agent(
    agent_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_database)
):
    """Delete an agent."""
    if not ObjectId.is_valid(agent_id):
        raise HTTPException(status_code=400, detail="Invalid agent ID")
    
    result = await db.agents.delete_one({
        "_id": ObjectId(agent_id),
        "user_id": current_user.id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    return {"message": "Agent deleted successfully"}
