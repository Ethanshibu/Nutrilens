from google import genai
from google.genai import types
from routers import label
import os
from fastapi import APIRouter,UploadFile,File,HTTPException

router=APIRouter(prefix="/api/v1/label", tags=["Label Analysis"])
client=genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

SYSTEM_PROMPT="""
You are a toxicology analysis assistant.

You are given an IMAGE of a product label.

Your task:
- Visually read the label
- Identify ingredients with known toxicological, allergenic, or interaction risks
- Explain risks using neutral, scientific language
- Assess confidence explicitly
- Suggest safer ingredient alternatives where appropriate

Rules:
- Return ONLY valid JSON
- Do NOT provide medical diagnoses
- Clearly separate facts from inference
- Use "unknown" when information is insufficient
"""

@router.post("/analyze")
async def analyze_label(file: UploadFile = File(...)):
    # Basic validation
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty image file")

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part(text=SYSTEM_PROMPT),
                        types.Part(
                            inline_data=types.Blob(
                                mime_type=file.content_type,
                                data=image_bytes,
                            )
                        ),
                    ],
                )
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            ),
        )
        print(response.text)
        if response.parsed is not None:
            return response.parsed
        return{
            "summary":response.text,
            "confidence":"unknown",
            "note":"Model output was not strict JSON"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Gemini analysis failed"
        )