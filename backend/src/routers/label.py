"""
Label analysis router — handles image uploads and returns nutrition/ingredient analysis.
Integrates with the VLM (vlm.vlm) to process food label images using Google Generative AI.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.concurrency import run_in_threadpool
import sys
import os
from pathlib import Path

# Add parent directories to sys.path so we can import vlm
project_root = Path(__file__).parent.parent.parent
vlm_path = project_root / "vlm"
if str(vlm_path) not in sys.path:
    sys.path.insert(0, str(vlm_path))

try:
    import vlm as vlm_module
except ImportError as e:
    print(f"Warning: Could not import vlm module: {e}", file=sys.stderr)
    vlm_module = None

router = APIRouter(prefix="/api/v1/label", tags=["Label Analysis"])

# Constants
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_CONTENT_TYPES = {
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/gif",
    "image/webp",
}


@router.post("/analyze")
async def analyze_label(file: UploadFile = File(...)):
    """
    Analyze a food label image and extract nutrition/ingredient information.
    
    Accepts:
        - multipart/form-data with 'file' field (image)
    
    Returns:
        JSON object with:
            - product_name: str or null
            - nutrition_facts: dict or null (keys: calories, total_fat, sodium, total_sugars)
            - ingredients: str or null
            - allergens: array or null
    
    Errors:
        - 400: Invalid file type or too large
        - 500: Model analysis failed
        - 503: VLM module not available
    """
    
    # Check VLM availability
    if vlm_module is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="VLM module not available. Check GOOGLE_API_KEY is set in environment.",
        )
    
    # Validate file type
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_CONTENT_TYPES)}",
        )
    
    # Read file and check size
    try:
        file_content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read file: {e}",
        )
    
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE / 1024 / 1024} MB",
        )
    
    if len(file_content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )
    
    # Call VLM in threadpool to avoid blocking event loop
    try:
        result = await run_in_threadpool(
            vlm_module.analyze_image_bytes, file_content
        )
        return JSONResponse(content=result, status_code=200)
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Model analysis failed: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during analysis: {str(e)}",
        )


@router.get("/health")
async def health_check():
    """
    Quick health check — confirms label analyzer is available.
    """
    vlm_available = vlm_module is not None
    google_api_key_set = os.environ.get("GOOGLE_API_KEY") is not None
    
    return {
        "status": "ok" if (vlm_available and google_api_key_set) else "unavailable",
        "vlm_module_loaded": vlm_available,
        "google_api_key_set": google_api_key_set,
    }
