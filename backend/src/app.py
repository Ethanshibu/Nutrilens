import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi import APIRouter
from routers import auth  # imports the authentication routes
from routers import label  # imports the label analysis routes
from routers import recommendations  # imports the recommendations routes
from fastapi.middleware.cors import CORSMiddleware
from fastapi import File, UploadFile

app=FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


router = APIRouter()
app.include_router(auth.router)
app.include_router(label.router)
app.include_router(recommendations.router)

@app.get("/")

async def root():
    return {"message": "Hello this is the root"}

