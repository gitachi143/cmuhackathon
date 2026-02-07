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


class LearnedPreferences(BaseModel):
    gender: Optional[str] = None
    age_range: Optional[str] = None
    style: Optional[str] = None
    interests: List[str] = []
    sizes: dict = {}               # e.g. {"shirt": "M", "shoe": "10"}
    dislikes: List[str] = []
    use_cases: List[str] = []      # e.g. ["hiking", "office", "travel"]
    favorite_colors: List[str] = []
    climate: Optional[str] = None  # e.g. "cold", "tropical", "temperate"

    class Config:
        extra = "allow"


class UserProfile(BaseModel):
    price_sensitivity: QualityLevel = QualityLevel.balanced
    shipping_preference: ShippingPreference = ShippingPreference.normal
    preferred_brands: List[str] = []
    saved_card: Optional[dict] = None
    learned: LearnedPreferences = LearnedPreferences()


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
    category: str = ""
    price_history: List[dict] = []


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
    thinking: Optional[str] = None
    intent: Optional[ShoppingIntent] = None
    products: List[Product] = []
    follow_up_question: Optional[FollowUpQuestion] = None
    learned_preferences: Optional[LearnedPreferences] = None


class ShippingStatus(str, Enum):
    processing = "processing"
    confirmed = "confirmed"
    shipped = "shipped"
    in_transit = "in_transit"
    out_for_delivery = "out_for_delivery"
    delivered = "delivered"


class PurchaseRecord(BaseModel):
    order_id: str
    product_id: str
    product_name: str
    price: float
    brand: str
    category: str
    card_nickname: str
    timestamp: str
    shipping_status: ShippingStatus = ShippingStatus.processing
