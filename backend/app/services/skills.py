"""
Skill Loader Service - Loads skills from database for LLM context
"""
from typing import Optional, List
from bson import ObjectId


async def get_skill_content_from_db(db, skill_id: str, user_id: str) -> Optional[str]:
    """
    Load skill content from database.
    Returns the markdown content (after frontmatter).
    """
    if not ObjectId.is_valid(skill_id):
        return None
    
    skill = await db.skills.find_one({
        "_id": ObjectId(skill_id),
        "$or": [
            {"user_id": user_id},
            {"is_system": True}
        ]
    })
    
    if not skill:
        return None
    
    content = skill.get("content", "")
    
    # Remove YAML frontmatter, return body only
    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            return parts[2].strip()
    
    return content


async def build_skill_prompt_from_db(db, skill_ids: List[str], user_id: str) -> str:
    """
    Build a combined prompt from multiple skills stored in database.
    Used to enhance the system prompt with skill instructions.
    """
    if not skill_ids:
        return ""
    
    skill_prompts = []
    
    for skill_id in skill_ids:
        content = await get_skill_content_from_db(db, skill_id, user_id)
        if content:
            skill_prompts.append(content)
    
    if not skill_prompts:
        return ""
    
    return "\n\n---\n\n".join(skill_prompts)


def build_skill_prompt(skills: List[str]) -> str:
    """
    Backward compatibility - for file-based skills.
    This is now deprecated in favor of database skills.
    """
    return ""
