from fastapi import APIRouter,HTTPException,status
from pydantic import BaseModel

router=APIRouter(prefix="/auth",tags=["Auth"])

from database import usertable #imports the usertable connection 

class User(BaseModel):
    username:str
    password:str

@router.get("/test")
async def test_auth():
    return {"message": "Auth router working"}