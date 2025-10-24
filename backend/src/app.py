import sys
from pathlib import Path

# Add parent directories to sys.path so we can import vlm
project_root = Path(__file__).parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from fastapi import FastAPI
from fastapi import APIRouter
from routers import auth  # imports the authentication routes
from routers import label  # imports the label analysis routes
from fastapi.middleware.cors import CORSMiddleware

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

@app.get("/")

async def root():
    return {"message": "Hello this is the root"}

from fastapi import File, UploadFile

@app.post("/analyze")
async def analyze_label(file: UploadFile = File(...)):
    # For now, just confirm receipt of file
    return {"report": f"Received {file.filename}. Toxicology analysis coming soon!"}
