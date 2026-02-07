from pydantic import BaseModel
from typing import Optional, List
from enum import Enum


class QualityLevel(str, Enum):
    budget = "budget"
    balanced = "balanced"
    premium = "premium"


class ShippingPreference(str, Enum):
    fastest = "fastest"
    normal = "normal"
    cheapest = "cheapest"


class UserProfile(BaseModel):
    price_sensitivity: QualityLevel = QualityLevel.balanced
    shipping_preference: ShippingPreference = ShippingPreference.normal
    preferred_brands: List[str] = []
    saved_card: Optional[dict] = None


class SearchRequest(BaseModel):
    query: str
    user_profile: Optional[UserProfile] = None
    conversation_history: List[dict] = []


class PurchaseRequest(BaseModel):
    product_id: str
    product_name: str
    price: float
    brand: str
    category: str
    card_nickname: str


class WatchlistItem(BaseModel):
    product_id: str
    product_name: str
    price: float
    target_price: Optional[float] = None
    brand: str
    source_url: str


class Product(BaseModel):
    id: str
    name: str
    brand: str
    price: float
    original_price: Optional[float] = None
    shipping_eta: str
    rating: float
    review_count: int
    value_tag: str
    description: str
    why_recommended: str
    image_url: Optional[str] = None
    source_name: str
    source_url: str
    category: str
    available_coupons: int = 0
    key_features: List[str] = []


class FollowUpQuestion(BaseModel):
    question: str
    options: List[str]


class ShoppingIntent(BaseModel):
    category: str
    price_range_min: Optional[float] = None
    price_range_max: Optional[float] = None
    quality_level: str
    key_features: List[str]
    shipping_priority: str


class SearchResponse(BaseModel):
    agent_message: str
    intent: Optional[ShoppingIntent] = None
    products: List[Product] = []
    follow_up_question: Optional[FollowUpQuestion] = None


class PurchaseRecord(BaseModel):
    product_id: str
    product_name: str
    price: float
    brand: str
    category: str
    card_nickname: str
    timestamp: str
