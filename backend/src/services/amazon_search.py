"""
Amazon Product Search Service using SearchApi.io
Provides product search functionality with allergen filtering
"""
import os
import httpx
from typing import List, Dict, Optional
from dotenv import load_dotenv

load_dotenv()

class AmazonSearchService:
    """Service for searching Amazon products via SearchApi.io"""
    
    def __init__(self):
        self.api_key = os.getenv("SEARCHAPI_API_KEY")
        self.base_url = "https://www.searchapi.io/api/v1/search"
        self.timeout = 30.0
        
    def is_available(self) -> bool:
        """Check if the service is properly configured"""
        return bool(self.api_key)
    
    async def search_products(
        self,
        query: str,
        exclude_allergens: Optional[List[str]] = None,
        max_results: int = 5,
        department: str = "grocery"
    ) -> Dict:
        """
        Search for products on Amazon
        
        Args:
            query: Search query string
            exclude_allergens: List of allergens to exclude from results
            max_results: Maximum number of results to return
            department: Amazon department to search in (default: grocery)
            
        Returns:
            Dictionary containing search results and metadata
        """
        if not self.is_available():
            raise ValueError("SearchApi API key not configured")
        
        # Build search query with allergen exclusions
        search_query = query
        if exclude_allergens:
            # Add negative keywords for allergens
            allergen_exclusions = " ".join([f"-{allergen.lower()}" for allergen in exclude_allergens])
            search_query = f"{query} {allergen_exclusions}"
        
        # Prepare request parameters
        params = {
            "engine": "amazon_search",
            "q": search_query,
            "api_key": self.api_key,
            "amazon_domain": "amazon.com",
            "num": str(max_results * 2)  # Request more to filter later
        }
        
        # Add department filter if specified
        if department:
            params["department"] = department
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(self.base_url, params=params)
                response.raise_for_status()
                data = response.json()
                
                # Process and filter results
                processed_results = self._process_results(
                    data,
                    exclude_allergens,
                    max_results
                )
                
                return processed_results
                
        except httpx.HTTPError as e:
            raise Exception(f"Amazon search failed: {str(e)}")
        except Exception as e:
            raise Exception(f"Unexpected error during Amazon search: {str(e)}")
    
    def _process_results(
        self,
        raw_data: Dict,
        exclude_allergens: Optional[List[str]],
        max_results: int
    ) -> Dict:
        """
        Process raw API response and filter results
        
        Args:
            raw_data: Raw response from SearchApi
            exclude_allergens: Allergens to filter out
            max_results: Maximum results to return
            
        Returns:
            Processed results dictionary
        """
        organic_results = raw_data.get("organic_results", [])
        
        filtered_products = []
        for result in organic_results:
            # Skip if product title/description contains allergens
            if exclude_allergens and self._contains_allergens(result, exclude_allergens):
                continue
            
            # Extract relevant product information
            product = {
                "title": result.get("title", ""),
                "link": result.get("link", ""),
                "asin": result.get("asin", ""),
                "price": self._extract_price(result),
                "rating": result.get("rating", 0),
                "ratings_total": result.get("ratings_total", 0),
                "thumbnail": result.get("thumbnail", ""),
                "description": result.get("snippet", ""),
                "is_prime": result.get("is_prime", False),
                "delivery": result.get("delivery", ""),
                "reason": self._generate_recommendation_reason(result, exclude_allergens)
            }
            
            filtered_products.append(product)
            
            # Stop when we have enough results
            if len(filtered_products) >= max_results:
                break
        
        return {
            "products": filtered_products,
            "total_found": len(filtered_products),
            "search_query": raw_data.get("search_parameters", {}).get("q", ""),
            "excluded_allergens": exclude_allergens or []
        }
    
    def _contains_allergens(self, result: Dict, allergens: List[str]) -> bool:
        """
        Check if product title or description contains any allergens
        
        Args:
            result: Product result dictionary
            allergens: List of allergens to check
            
        Returns:
            True if allergens found, False otherwise
        """
        text_to_check = (
            result.get("title", "").lower() + " " +
            result.get("snippet", "").lower()
        )
        
        for allergen in allergens:
            if allergen.lower() in text_to_check:
                return True
        
        return False
    
    def _extract_price(self, result: Dict) -> Optional[str]:
        """Extract price from result, handling various formats"""
        price = result.get("price")
        if price:
            return price
        
        # Try to extract from price_string if available
        price_string = result.get("price_string", "")
        if price_string:
            return price_string
        
        return None
    
    def _generate_recommendation_reason(
        self,
        result: Dict,
        exclude_allergens: Optional[List[str]]
    ) -> str:
        """Generate a reason why this product is recommended"""
        reasons = []
        
        if exclude_allergens:
            reasons.append(f"Free from your allergens: {', '.join(exclude_allergens)}")
        
        rating = result.get("rating", 0)
        if rating >= 4.5:
            reasons.append(f"Highly rated ({rating}⭐)")
        
        if result.get("is_prime"):
            reasons.append("Prime eligible")
        
        if not reasons:
            reasons.append("Safer alternative based on your profile")
        
        return " • ".join(reasons)


# Global instance
amazon_search_service = AmazonSearchService()


async def search_safer_alternatives(
    product_name: str,
    user_allergens: List[str],
    limit: int = 5
) -> Dict:
    """
    Convenience function to search for safer product alternatives
    
    Args:
        product_name: Name of the current product
        user_allergens: User's allergen list
        limit: Maximum number of alternatives to return
        
    Returns:
        Dictionary with product recommendations
    """
    # Build search query for healthier alternatives
    search_query = f"healthy {product_name} alternative organic"
    
    return await amazon_search_service.search_products(
        query=search_query,
        exclude_allergens=user_allergens,
        max_results=limit,
        department="grocery"
    )

# Made with Bob
