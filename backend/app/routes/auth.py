from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta, datetime
from ..database import get_database
from ..models.user import UserCreate, UserInDB, UserResponse
from ..utils.auth import get_password_hash, verify_password, create_access_token
from ..config import settings
from bson import ObjectId

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", response_model=UserResponse)
async def signup(user_in: UserCreate, db = Depends(get_database)):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_in.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Hash password
    hashed_password = get_password_hash(user_in.password)
    
    # Create user in DB
    user_dict = {
        "email": user_in.email,
        "password_hash": hashed_password,
        "created_at": datetime.utcnow()
    }
    result = await db.users.insert_one(user_dict)
    
    return {
        "id": str(result.inserted_id),
        "email": user_in.email
    }

@router.post("/login")
async def login(user_in: UserCreate, db = Depends(get_database)):
    user = await db.users.find_one({"email": user_in.email})
    if not user or not verify_password(user_in.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}
