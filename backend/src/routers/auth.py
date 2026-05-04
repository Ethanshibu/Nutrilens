from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from database import usertable
import bcrypt

router = APIRouter(prefix="/auth", tags=["Auth"])

class User(BaseModel):
    username: str
    password: str

class SignupUser(BaseModel):
    username: str
    password: str
    name: Optional[str] = None
    allergens: Optional[List[str]] = []
    age: Optional[int] = None
    bmi: Optional[float] = None
    diabetes: Optional[bool] = False
    heart_disease: Optional[bool] = False
    hypertension: Optional[bool] = False

class UpdateProfile(BaseModel):
    name: Optional[str] = None
    allergens: Optional[List[str]] = None
    age: Optional[int] = None
    bmi: Optional[float] = None
    diabetes: Optional[bool] = None
    heart_disease: Optional[bool] = None
    hypertension: Optional[bool] = None

@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(user: SignupUser):
    # Check if user already exists
    existing_user = usertable.find_one({"username": user.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Hash password
    hashed_pw = bcrypt.hashpw(user.password.encode("utf-8"), bcrypt.gensalt())
    
    # Create user document
    user_doc = {
        "username": user.username,
        "password": hashed_pw,
        "name": user.name or user.username,
        "allergens": user.allergens or [],
        "age": user.age,
        "bmi": user.bmi,
        "diabetes": user.diabetes or False,
        "heart_disease": user.heart_disease or False,
        "hypertension": user.hypertension or False
    }
    
    usertable.insert_one(user_doc)
    
    return {
        "message": "Signup successful!",
        "username": user.username,
        "name": user_doc["name"]
    }

@router.post("/signin")
async def signin(user: User):
    existing_user = usertable.find_one({"username": user.username})
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not bcrypt.checkpw(user.password.encode("utf-8"), existing_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return {
        "message": f"Welcome back, {existing_user.get('name', user.username)}!",
        "username": user.username,
        "name": existing_user.get("name", user.username),
        "allergens": existing_user.get("allergens", []),
        "age": existing_user.get("age"),
        "bmi": existing_user.get("bmi"),
        "diabetes": existing_user.get("diabetes", False),
        "heart_disease": existing_user.get("heart_disease", False),
        "hypertension": existing_user.get("hypertension", False)
    }

@router.get("/profile/{username}")
async def get_profile(username: str):
    """Get user profile information"""
    user = usertable.find_one({"username": username}, {"password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Convert ObjectId to string for JSON serialization
    user["_id"] = str(user["_id"])
    
    return {
        "username": user["username"],
        "name": user.get("name", user["username"]),
        "allergens": user.get("allergens", []),
        "age": user.get("age"),
        "bmi": user.get("bmi"),
        "diabetes": user.get("diabetes", False),
        "heart_disease": user.get("heart_disease", False),
        "hypertension": user.get("hypertension", False)
    }

@router.put("/profile/{username}")
async def update_profile(username: str, profile: UpdateProfile):
    """Update user profile (name and allergens)"""
    user = usertable.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Build update document
    update_doc = {}
    if profile.name is not None:
        update_doc["name"] = profile.name
    if profile.allergens is not None:
        update_doc["allergens"] = profile.allergens
    if profile.age is not None:
        update_doc["age"] = profile.age
    if profile.bmi is not None:
        update_doc["bmi"] = profile.bmi
    if profile.diabetes is not None:
        update_doc["diabetes"] = profile.diabetes
    if profile.heart_disease is not None:
        update_doc["heart_disease"] = profile.heart_disease
    if profile.hypertension is not None:
        update_doc["hypertension"] = profile.hypertension
    
    if not update_doc:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    # Update user
    usertable.update_one(
        {"username": username},
        {"$set": update_doc}
    )
    
    return {
        "message": "Profile updated successfully",
        "username": username,
        "name": update_doc.get("name", user.get("name")),
        "allergens": update_doc.get("allergens", user.get("allergens", [])),
        "age": update_doc.get("age", user.get("age")),
        "bmi": update_doc.get("bmi", user.get("bmi")),
        "diabetes": update_doc.get("diabetes", user.get("diabetes", False)),
        "heart_disease": update_doc.get("heart_disease", user.get("heart_disease", False)),
        "hypertension": update_doc.get("hypertension", user.get("hypertension", False))
    }

# TEST ROUTE
@router.get("/test")
async def test_auth():
    return {"message": "Auth router working"}

# Made with Bob
