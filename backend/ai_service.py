import os
import json
from typing import Optional

from openai import AsyncOpenAI

from models import SearchRequest, SearchResponse, Product, ShoppingIntent, FollowUpQuestion

# =============================================
# OPENROUTER API INTEGRATION
# =============================================
# Uses the OpenAI-compatible API via OpenRouter
# Set OPENROUTER_API_KEY in your .env file
# =============================================

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = "google/gemini-2.0-flash-lite-001"

client: Optional[AsyncOpenAI] = None
if OPENROUTER_API_KEY:
    client = AsyncOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=OPENROUTER_API_KEY,
    )


SYSTEM_PROMPT = """You are Cliq, an expert AI shopping assistant. Your job is to help users find the perfect products based on their natural language descriptions.

When a user describes what they want, you should:
1. Interpret their needs, including implied preferences about budget, quality, features, and urgency
2. Generate 3-5 product recommendations with realistic details
3. If the query is ambiguous, ask a clarifying follow-up question

IMPORTANT RULES:
- Generate realistic but clearly mock product data (use real brand names and realistic prices)
- Each product MUST have a unique id field (use format like "prod-001", "prod-002", etc.)
- Each product must have a clear value proposition tag
- Be conversational and helpful in your agent_message
- Consider the user's profile preferences when making recommendations
- If you detect ambiguity, include a follow_up_question
- Keep agent_message concise (2-3 sentences max)
- Always include at least 3 products unless the user's request is extremely specific

You MUST respond with valid JSON in this exact format:
{
  "agent_message": "A friendly, helpful explanation of what you found and why",
  "intent": {
    "category": "product category (e.g., winter_jackets, monitors, headphones)",
    "price_range_min": null,
    "price_range_max": null,
    "quality_level": "budget" or "balanced" or "premium",
    "key_features": ["feature1", "feature2"],
    "shipping_priority": "fastest" or "normal" or "cheapest"
  },
  "products": [
    {
      "id": "unique_string_id",
      "name": "Full Product Name",
      "brand": "Brand Name",
      "price": 99.99,
      "original_price": 129.99,
      "shipping_eta": "Arrives in 2-4 days",
      "rating": 4.5,
      "review_count": 1234,
      "value_tag": "Best value" or "Best overall" or "Fastest shipping" or "Budget pick" or "Premium pick",
      "description": "One-line product description",
      "why_recommended": "Why this matches the user's specific needs",
      "source_name": "Amazon" or "REI" or "Nordstrom" or "Best Buy" or "Target" or other retailer,
      "source_url": "https://example.com/product",
      "category": "category_name",
      "available_coupons": 0,
      "key_features": ["feature1", "feature2", "feature3"]
    }
  ],
  "follow_up_question": null
}

For follow_up_question, use this format when the query is ambiguous:
{
  "question": "Clarifying question text",
  "options": ["Option A", "Option B", "Option C"]
}

Only return the JSON object. No markdown, no code blocks, no extra text."""


async def interpret_query_with_gemini(request: SearchRequest) -> SearchResponse:
    """
    Send the user's query to OpenRouter for interpretation and product recommendations.
    Falls back to mock data if OpenRouter is unavailable.
    """
    if client is None:
        return generate_mock_response(request)

    try:
        # Build the user message with context
        user_context = ""
        if request.user_profile:
            user_context = f"""
User preferences:
- Price sensitivity: {request.user_profile.price_sensitivity.value}
- Shipping preference: {request.user_profile.shipping_preference.value}
- Preferred brands: {', '.join(request.user_profile.preferred_brands) if request.user_profile.preferred_brands else 'No preference'}
"""

        conversation_context = ""
        if request.conversation_history:
            conversation_context = "\nPrevious conversation:\n"
            for msg in request.conversation_history[-6:]:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                conversation_context += f"- {role}: {content}\n"

        user_message = f"""{user_context}
{conversation_context}
User query: "{request.query}"
"""

        response = await client.chat.completions.create(
            model=OPENROUTER_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.7,
        )

        response_text = response.choices[0].message.content.strip()

        # Clean up the response - remove markdown code blocks if present
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:])
            if response_text.endswith("```"):
                response_text = response_text[:-3].strip()

        data = json.loads(response_text)

        return SearchResponse(
            agent_message=data.get("agent_message", "Here are some recommendations for you."),
            intent=ShoppingIntent(**data["intent"]) if data.get("intent") else None,
            products=[Product(**p) for p in data.get("products", [])],
            follow_up_question=(
                FollowUpQuestion(**data["follow_up_question"])
                if data.get("follow_up_question")
                else None
            ),
        )
    except Exception as e:
        print(f"OpenRouter API error: {e}")
        return generate_mock_response(request)


def generate_mock_response(request: SearchRequest) -> SearchResponse:
    """Generate a mock response when OpenRouter is unavailable."""
    from mock_data import get_mock_products

    query_lower = request.query.lower()

    # Simple keyword matching for category detection
    category = "general"
    if any(w in query_lower for w in ["jacket", "coat", "warm", "winter", "cold", "parka"]):
        category = "winter_jackets"
    elif any(w in query_lower for w in ["monitor", "screen", "display"]):
        category = "monitors"
    elif any(w in query_lower for w in ["headphone", "earphone", "earbud", "audio", "music"]):
        category = "headphones"
    elif any(w in query_lower for w in ["laptop", "computer", "macbook", "notebook"]):
        category = "laptops"
    elif any(w in query_lower for w in ["shoe", "sneaker", "running", "trainer"]):
        category = "running_shoes"
    elif any(w in query_lower for w in ["suitcase", "luggage", "carry-on", "travel bag"]):
        category = "luggage"

    products = get_mock_products(category)

    # Determine quality level from query
    quality = "balanced"
    if any(w in query_lower for w in ["cheap", "budget", "affordable", "inexpensive"]):
        quality = "budget"
    elif any(w in query_lower for w in ["premium", "luxury", "high-end", "best", "top"]):
        quality = "premium"

    # Determine shipping priority
    shipping = "normal"
    if any(w in query_lower for w in ["fast", "quick", "urgent", "asap", "rush"]):
        shipping = "fastest"

    category_display = category.replace("_", " ")
    agent_message = (
        f"Great choice! I found some excellent options in the {category_display} category. "
        f"I've ranked them based on overall value, considering quality, price, and shipping speed. "
        f"Here are my top {len(products)} picks for you."
    )

    # Build a follow-up question for ambiguous queries
    follow_up = None
    if category == "general":
        follow_up = FollowUpQuestion(
            question="I'd love to help! Could you tell me more about what you're looking for?",
            options=[
                "Winter clothing",
                "Electronics",
                "Shoes & footwear",
                "Travel gear",
            ],
        )

    return SearchResponse(
        agent_message=agent_message,
        intent=ShoppingIntent(
            category=category,
            price_range_min=None,
            price_range_max=None,
            quality_level=quality,
            key_features=[],
            shipping_priority=shipping,
        ),
        products=products,
        follow_up_question=follow_up,
    )
