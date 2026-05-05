import google.generativeai as genai
import os
from fastapi import APIRouter, UploadFile, File, HTTPException
from dotenv import load_dotenv
from database import usertable
from typing import Optional
from services.model import nutrition_model

load_dotenv()

router = APIRouter(prefix="/api/v1/label", tags=["Label Analysis"])

# Configure the Gemini API
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def get_system_prompt(user_allergens=None):
    allergen_text = ""
    if user_allergens and len(user_allergens) > 0:
        allergen_list = ", ".join(user_allergens)
        allergen_text = f"""
IMPORTANT: The user has reported the following allergens: {allergen_list}
- If ANY of these allergens are detected in the product, you MUST:
  1. Add them to the "user_allergens_detected" array
  2. Create a HIGH RISK entry in toxicology_risks specifically for each detected user allergen
  3. Provide a clear warning in the summary about the user's specific allergens
"""
    
    return f"""
You are a toxicology analysis assistant.
You are given an IMAGE of a product label.

{allergen_text}

Your task:
- Visually read the label
- Identify ingredients with known toxicological, allergenic, or interaction risks
- Extract nutritional information per serving:
  - sugars: total sugars in grams
  - kcal: calories per serving
  - sodium: sodium in milligrams
  - saturated_fats: saturated fats in grams
- Explain risks using neutral, scientific language
- Assess confidence explicitly
- Suggest safer ingredient alternatives where appropriate

Rules:
- Return ONLY valid JSON with the following structure:
  {{
    "product_name": "string",
    "ingredients": ["list of ingredients"],
    "nutrition": {{
      "sugars": "float",
      "kcal": "float",
      "sodium": "float",
      "saturated_fats": "float"
    }},
    "toxicology_risks": [
      {{
        "ingredient": "string",
        "risk_level": "low|medium|high",
        "description": "string",
        "alternatives": ["list of safer alternatives"]
      }}
    ],
    "allergens": ["list of allergens found in product"],
    "user_allergens_detected": ["list of USER'S allergens found in this product"],
    "confidence": "low|medium|high",
    "summary": "overall assessment including WARNING about user allergens if detected"
  }}
- Do NOT provide medical diagnoses
- Clearly separate facts from inference
- Use "unknown" when information is insufficient
- If user allergens are detected, make them VERY prominent in your response
"""

@router.post("/analyze")
async def analyze_label(file: UploadFile = File(...), username: Optional[str] = None):
    """
    Analyze a product label image using Google Gemini Vision API.
    Returns toxicology analysis including risks, allergens, and recommendations.
    Optionally checks against user's allergen profile.
    """
    # Basic validation
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload an image.")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty image file")


    # Get user data if username provided
    user_allergens = []
    user_health = {
        "age": None,
        "bmi": None,
        "diabetes": 0,
        "heart_disease": 0,
        "hypertension": 0
    }

    if username:
        user = usertable.find_one({"username": username})
        if user:
            user_allergens = user.get("allergens", [])
            # Extract health data for ML model
            user_health["age"] = user.get("age")
            user_health["bmi"] = user.get("bmi")
            user_health["diabetes"] = int(user.get("diabetes", False))
            user_health["heart_disease"] = int(user.get("heart_disease", False))
            user_health["hypertension"] = int(user.get("hypertension", False))

    try:
        # Create the model
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Prepare the image
        import PIL.Image
        import io
        image = PIL.Image.open(io.BytesIO(image_bytes))
        
        # Get system prompt with user allergens
        system_prompt = get_system_prompt(user_allergens)
        
        # Generate content
        response = model.generate_content([system_prompt, image])
        
        # Try to parse as JSON
        import json
        try:
            # Clean the response text
            response_text = response.text.strip()
            
            # Remove markdown code blocks if present
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            response_text = response_text.strip()
            
            result = json.loads(response_text)
            # Parse nutrition data and allergen matches
            nutrition = result.get("nutrition", {})
            sugars = nutrition.get("sugars", 0.0)
            kcal = nutrition.get("kcal", 0.0)
            sodium = nutrition.get("sodium", 0.0)
            saturated_fats = nutrition.get("saturated_fats", 0.0)

            # Count matched allergens
            matched_allergens = result.get("user_allergens_detected", [])
            allergen_match_count = len(matched_allergens)

            # Build the feature vector for the ML model
            features = {
                "age": user_health["age"] or 0,
                "bmi": user_health["bmi"] or 0.0,
                "sugars": sugars,
                "kcal": kcal,
                "sodium": sodium,
                "saturated_fats": saturated_fats,
                "diabetes": user_health["diabetes"],
                "heart_disease": user_health["heart_disease"],
                "hypertension": user_health["hypertension"],
                "allergen_match_count": allergen_match_count,
            }

            # Predict risk using the model
            try:
                risk_result = nutrition_model.predict_risk(features)
                result["risk_prediction"] = risk_result
            except Exception as exc:
                print(f"⚠️ Risk model prediction failed: {exc}")
                result["risk_prediction"] = None
            # Add user allergens to response for frontend highlighting
            result["user_allergens"] = user_allergens
            
            return result
        except json.JSONDecodeError as e:
            print(f"JSON decode error: {e}")
            print(f"Response text: {response.text}")
            # If not valid JSON, return as summary
            return {
                "summary": response.text,
                "confidence": "unknown",
                "note": "Model output was not strict JSON. Showing raw response.",
                "user_allergens": user_allergens
            }
            
    except Exception as e:
        print(f"Error during analysis: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Gemini analysis failed: {str(e)}"
        )

@router.get("/health")
async def health_check():
    """Check if the label analysis service is running"""
    return {
        "status": "healthy",
        "service": "Label Analysis",
        "model": "gemini-2.5-flash"
    }

# Made with Bob
