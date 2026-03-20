from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
from database import usertable, purchasestable
from datetime import datetime
import os
from dotenv import load_dotenv
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

load_dotenv()

router = APIRouter(prefix="/api/v1/recommendations", tags=["Recommendations"])

# Amazon Search integration via SearchApi
AMAZON_SEARCH_AVAILABLE = False
amazon_search_service = None

try:
    from services.amazon_search import amazon_search_service as _amazon_service
    amazon_search_service = _amazon_service
    if amazon_search_service.is_available():
        AMAZON_SEARCH_AVAILABLE = True
        print("✓ Amazon Search API (SearchApi.io) initialized successfully")
    else:
        print("⚠️ SEARCHAPI_API_KEY not found in environment")
except ImportError as e:
    print(f"⚠️ Amazon search service not available: {e}")
except Exception as e:
    print(f"⚠️ Amazon search initialization failed: {e}")

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

@router.delete("/purchase/{purchase_id}")
async def delete_purchase(purchase_id: str, username: str = Query(...)):
    """
    Delete a purchase from user's history.
    """
    from bson import ObjectId
    from bson.errors import InvalidId
    
    # Verify user exists
    user = usertable.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        # Convert string to ObjectId
        obj_id = ObjectId(purchase_id)
        
        # First check if purchase exists and belongs to user
        purchase = purchasestable.find_one({
            "_id": obj_id,
            "username": username
        })
        
        if not purchase:
            print(f"Purchase not found: {purchase_id} for user: {username}")
            raise HTTPException(status_code=404, detail="Purchase not found or unauthorized")
        
        # Delete the purchase
        result = purchasestable.delete_one({
            "_id": obj_id,
            "username": username
        })
        
        print(f"Delete result: {result.deleted_count} documents deleted")
        
        return {
            "message": "Purchase deleted successfully",
            "purchase_id": purchase_id
        }
    except InvalidId as e:
        print(f"Invalid ObjectId: {purchase_id}, error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid purchase ID format: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error deleting purchase: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting purchase: {str(e)}")

@router.post("/suggest")
async def get_recommendations(request: RecommendationRequest):
    """
    Get product recommendations based on user's allergen profile and purchase history.
    Uses Amazon search via SearchApi.io to find safer product alternatives.
    """
    if not AMAZON_SEARCH_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Recommendation service unavailable. Amazon Search API not configured."
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
    
    # Determine product category from current product or history
    product_name = "healthy food"
    if request.current_product:
        product_name = request.current_product
    elif purchase_history:
        # Use most recent purchase as reference
        product_name = purchase_history[0].get("product_name", "healthy food")
    
    try:
        # Search for safer alternatives on Amazon
        search_results = await amazon_search_service.search_products(
            query=f"healthy {product_name} alternative organic",
            exclude_allergens=user_allergens,
            max_results=request.limit,
            department="grocery"
        )
        
        # Format products for frontend
        recommendations = []
        for product in search_results.get("products", []):
            recommendation = {
                "title": product.get("title", ""),
                "url": product.get("link", ""),
                "asin": product.get("asin", ""),
                "price": product.get("price", "N/A"),
                "rating": product.get("rating", 0),
                "ratings_total": product.get("ratings_total", 0),
                "thumbnail": product.get("thumbnail", ""),
                "description": product.get("description", ""),
                "is_prime": product.get("is_prime", False),
                "delivery": product.get("delivery", ""),
                "reason": product.get("reason", "Safer alternative based on your profile")
            }
            recommendations.append(recommendation)
        
        return {
            "username": request.username,
            "user_allergens": user_allergens,
            "excluded_allergens": search_results.get("excluded_allergens", []),
            "search_query": search_results.get("search_query", ""),
            "recommendations": recommendations,
            "total_found": len(recommendations),
            "based_on_purchases": len(purchase_history),
            "source": "Amazon via SearchApi.io"
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
        "amazon_search_available": AMAZON_SEARCH_AVAILABLE
    }

# Made with Bob