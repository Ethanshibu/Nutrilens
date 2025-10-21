from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from database import usertable
import bcrypt  # handles password hashing

router = APIRouter(prefix="/auth", tags=["Auth"])
class User(BaseModel):
    username: str
    password: str


@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(user: User):

    
    existing_user = usertable.find_one({"username": user.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    hashed_pw = bcrypt.hashpw(user.password.encode("utf-8"), bcrypt.gensalt())
    usertable.insert_one({
        "username": user.username,
        "password": hashed_pw
    })

    return {"message": "Signup successful!"}


@router.post("/signin")
async def signin(user: User):

    existing_user = usertable.find_one({"username": user.username})
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")
    if not bcrypt.checkpw(user.password.encode("utf-8"), existing_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"message": f"Welcome back, {user.username}!"}


# TEST ROUTE
@router.get("/test")
async def test_auth():
    return {"message": "Auth router working"}
