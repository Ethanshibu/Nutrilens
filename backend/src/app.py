from fastapi import FastAPI
from fastapi import APIRouter
from routers import auth #imports the authentication routes

app=FastAPI()
router =APIRouter()
app.include_router(auth.router)

@app.get("/")

async def root():
    return {"message": "Hello this is the root"}

