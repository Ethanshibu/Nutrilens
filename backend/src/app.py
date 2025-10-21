from fastapi import FastAPI
from fastapi import APIRouter
from routers import auth #imports the authentication routes
from fastapi.middleware.cors import CORSMiddleware

app=FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_orgins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


router =APIRouter()
app.include_router(auth.router)

@app.get("/")

async def root():
    return {"message": "Hello this is the root"}

