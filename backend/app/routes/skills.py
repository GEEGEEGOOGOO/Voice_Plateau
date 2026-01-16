"""
Skills API Routes - CRUD for skill library with file upload
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from bson import ObjectId
from datetime import datetime
from typing import Optional
import yaml
import re

from ..database import get_database
from ..utils.auth import get_current_user
from ..models.user import UserResponse
from ..models.skill import SkillCreate, SkillUpdate, SkillResponse

router = APIRouter(prefix="/skills", tags=["skills"])


def parse_skill_content(content: str) -> dict:
    """Parse YAML frontmatter from skill markdown content."""
    metadata = {"name": "Untitled Skill", "description": "", "category": "general"}
    
    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            try:
                frontmatter = yaml.safe_load(parts[1].strip())
                if frontmatter:
                    metadata.update(frontmatter)
            except:
                pass
    
    return metadata


@router.get("")
async def list_skills(
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get all skills (user's own + system skills)."""
    skills = []
    
    # Get user's skills and system skills
    cursor = db.skills.find({
        "$or": [
            {"user_id": current_user.id},
            {"is_system": True}
        ]
    })
    
    async for skill in cursor:
        skills.append({
            "id": str(skill["_id"]),
            "name": skill["name"],
            "description": skill.get("description", ""),
            "category": skill.get("category", "general"),
            "user_id": skill["user_id"],
            "is_system": skill.get("is_system", False),
            "created_at": skill.get("created_at", datetime.utcnow())
        })
    
    return skills


@router.get("/{skill_id}")
async def get_skill(
    skill_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get full skill details including content."""
    if not ObjectId.is_valid(skill_id):
        raise HTTPException(status_code=400, detail="Invalid skill ID")
    
    skill = await db.skills.find_one({
        "_id": ObjectId(skill_id),
        "$or": [
            {"user_id": current_user.id},
            {"is_system": True}
        ]
    })
    
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    
    return {
        "id": str(skill["_id"]),
        "name": skill["name"],
        "description": skill.get("description", ""),
        "category": skill.get("category", "general"),
        "content": skill["content"],
        "user_id": skill["user_id"],
        "is_system": skill.get("is_system", False),
        "created_at": skill.get("created_at", datetime.utcnow())
    }


@router.post("")
async def create_skill(
    skill: SkillCreate,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_database)
):
    """Create a new skill from content."""
    skill_doc = {
        "name": skill.name,
        "description": skill.description,
        "category": skill.category,
        "content": skill.content,
        "user_id": current_user.id,
        "is_system": False,
        "created_at": datetime.utcnow()
    }
    
    result = await db.skills.insert_one(skill_doc)
    
    return {
        "id": str(result.inserted_id),
        "message": "Skill created successfully"
    }


@router.post("/upload")
async def upload_skill(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    category: Optional[str] = Form("general"),
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_database)
):
    """Upload a .md skill file to the library."""
    if not file.filename.endswith('.md'):
        raise HTTPException(status_code=400, detail="Only .md files are allowed")
    
    content = await file.read()
    content_str = content.decode('utf-8')
    
    # Parse metadata from content
    metadata = parse_skill_content(content_str)
    
    # Use provided name or parsed name
    skill_name = name or metadata.get("name", file.filename.replace(".md", ""))
    skill_desc = metadata.get("description", "")
    skill_category = category or metadata.get("category", "general")
    
    skill_doc = {
        "name": skill_name,
        "description": skill_desc,
        "category": skill_category,
        "content": content_str,
        "user_id": current_user.id,
        "is_system": False,
        "created_at": datetime.utcnow()
    }
    
    result = await db.skills.insert_one(skill_doc)
    
    return {
        "id": str(result.inserted_id),
        "name": skill_name,
        "message": "Skill uploaded successfully"
    }


@router.put("/{skill_id}")
async def update_skill(
    skill_id: str,
    skill: SkillUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_database)
):
    """Update a skill (only own skills, not system skills)."""
    if not ObjectId.is_valid(skill_id):
        raise HTTPException(status_code=400, detail="Invalid skill ID")
    
    existing = await db.skills.find_one({
        "_id": ObjectId(skill_id),
        "user_id": current_user.id,
        "is_system": False
    })
    
    if not existing:
        raise HTTPException(status_code=404, detail="Skill not found or not editable")
    
    update_data = {k: v for k, v in skill.dict().items() if v is not None}
    
    if update_data:
        await db.skills.update_one(
            {"_id": ObjectId(skill_id)},
            {"$set": update_data}
        )
    
    return {"message": "Skill updated successfully"}


@router.delete("/{skill_id}")
async def delete_skill(
    skill_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_database)
):
    """Delete a skill (only own skills, not system skills)."""
    if not ObjectId.is_valid(skill_id):
        raise HTTPException(status_code=400, detail="Invalid skill ID")
    
    result = await db.skills.delete_one({
        "_id": ObjectId(skill_id),
        "user_id": current_user.id,
        "is_system": False
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Skill not found or not deletable")
    
    return {"message": "Skill deleted successfully"}
