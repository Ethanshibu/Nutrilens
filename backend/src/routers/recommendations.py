from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
from database import usertable, purchasestable
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api/v1/recommendations", tags=["Recommendations"])

# Tavily integration
TAVILY_AVAILABLE = False
tavily_client = None

try:
    from tavily import TavilyClient
    api_key = os.getenv("TAVILY_API_KEY")
    if api_key:
        tavily_client = TavilyClient(api_key=api_key)
        TAVILY_AVAILABLE = True
        print("✓ Tavily API initialized successfully")
    else:
        print("⚠️ TAVILY_API_KEY not found in environment")
except ImportError as e:
    print(f"⚠️ Tavily package not installed: {e}")
except Exception as e:
    print(f"⚠️ Tavily initialization failed: {e}")

class PurchaseProduct(BaseModel):
    username: str
    product_name: str
    analysis_data: dict
    image_url: Optional[str] = None

class RecommendationRequest(BaseModel):
    username: str
    current_product: Optional[str] = None
    limit: int = 5

@router.post("/purchase")
async def mark_as_purchased(purchase: PurchaseProduct):
    """
    Mark a product as purchased by the user.
    Stores the product analysis data for future recommendations.
    """
    # Verify user exists
    user = usertable.find_one({"username": purchase.username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create purchase record
    purchase_doc = {
        "username": purchase.username,
        "product_name": purchase.product_name,
        "analysis_data": purchase.analysis_data,
        "image_url": purchase.image_url,
        "purchased_at": datetime.utcnow(),
        "allergens": purchase.analysis_data.get("allergens", []),
        "ingredients": purchase.analysis_data.get("ingredients", []),
        "toxicology_risks": purchase.analysis_data.get("toxicology_risks", [])
    }
    
    result = purchasestable.insert_one(purchase_doc)
    
    return {
        "message": "Product marked as purchased",
        "purchase_id": str(result.inserted_id),
        "product_name": purchase.product_name
    }

@router.get("/history/{username}")
async def get_purchase_history(username: str, limit: int = Query(10, ge=1, le=50)):
    """
    Get user's purchase history.
    """
    user = usertable.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get purchases sorted by most recent
    purchases = list(purchasestable.find(
        {"username": username}
    ).sort("purchased_at", -1).limit(limit))
    
    # Convert ObjectId to string for JSON serialization
    for purchase in purchases:
        purchase["_id"] = str(purchase["_id"])
        purchase["purchased_at"] = purchase["purchased_at"].isoformat()
    
    return {
        "username": username,
        "total_purchases": len(purchases),
        "purchases": purchases
    }

@router.post("/suggest")
async def get_recommendations(request: RecommendationRequest):
    """
    Get product recommendations based on user's allergen profile and purchase history.
    Uses Tavily web search to find safer alternatives.
    """
    if not TAVILY_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Recommendation service unavailable. Tavily API not configured."
        )
    
    # Get user data
    user = usertable.find_one({"username": request.username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_allergens = user.get("allergens", [])
    
    # Get purchase history to understand preferences
    purchase_history = list(purchasestable.find(
        {"username": request.username}
    ).sort("purchased_at", -1).limit(10))
    
    # Build search query based on user profile
    allergen_filter = ""
    if user_allergens:
        allergen_filter = f" without {', '.join(user_allergens)}"
    
    # Determine product category from current product or history
    product_category = "food products"
    if request.current_product:
        product_category = request.current_product
    elif purchase_history:
        # Use most recent purchase as reference
        product_category = purchase_history[0].get("product_name", "food products")
    
    # Build search query
    search_query = f"healthy alternative {product_category}{allergen_filter} safe ingredients low toxicity"
    
    try:
        # Perform web search using Tavily
        search_results = tavily_client.search(
            query=search_query,
            search_depth="advanced",
            max_results=request.limit
        )
        
        recommendations = []
        for result in search_results.get("results", []):
            recommendation = {
                "title": result.get("title", ""),
                "url": result.get("url", ""),
                "content": result.get("content", ""),
                "score": result.get("score", 0),
                "reason": f"Recommended based on your allergen profile{allergen_filter}"
            }
            recommendations.append(recommendation)
        
        return {
            "username": request.username,
            "user_allergens": user_allergens,
            "search_query": search_query,
            "recommendations": recommendations,
            "total_found": len(recommendations),
            "based_on_purchases": len(purchase_history)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch recommendations: {str(e)}"
        )

@router.get("/health")
async def health_check():
    """Check if the recommendation service is running"""
    return {
        "status": "healthy",
        "service": "Recommendations",
        "tavily_available": TAVILY_AVAILABLE
    }

# Made with Bob