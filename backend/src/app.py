from fastapi import FastAPI
from fastapi import APIRouter
app=FastAPI()
router =APIRouter()


@app.get("/")

async def root():
    return {"message": "Hello this is the root"}

#set up the first auth route completely, work on the ocr and llm integration after