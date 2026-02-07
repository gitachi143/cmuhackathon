import os
import json
from typing import Optional

from openai import AsyncOpenAI

from models import (
    SearchRequest, SearchResponse, Product, ShoppingIntent,
    FollowUpQuestion, LearnedPreferences,
)

# =============================================
# OPENROUTER API INTEGRATION
# =============================================
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = "google/gemini-2.0-flash-lite-001"

client: Optional[AsyncOpenAI] = None
if OPENROUTER_API_KEY:
    client = AsyncOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=OPENROUTER_API_KEY,
    )


SYSTEM_PROMPT = """You are Cliq, an expert AI shopping assistant that THINKS before recommending.

## YOUR PERSONALITY
- You are curious — you ask smart clarifying questions when a query is vague.
- You are context-aware — you remember what the user said earlier and use their profile.
- You are transparent — you tell the user WHY you picked specific products and WHAT info you used.
- You keep messages concise but warm (2-4 sentences).

## DECISION PROCESS
When a user asks for something:
1. CHECK if you have enough info to give great recommendations. Consider:
   - Is the category clear? ("jacket" could be ski jacket, rain jacket, blazer, puffer...)
   - Is the use-case clear? (hiking vs office vs date night?)
   - Do you know their gender/size/style if it matters for this product?
   - Do you know their budget range?
2. IMPORTANT: You do NOT always need to ask a question. If the user's profile already provides enough context (e.g. they have use_cases, style, climate set), use that info to make good recommendations directly. Only ask a clarifying question when you truly lack critical info AND the user's profile doesn't help.
3. If TRULY AMBIGUOUS and profile doesn't help → ask ONE focused clarifying question with 3-5 clickable options. Do NOT recommend products yet. Set products to empty array [].
4. If CLEAR ENOUGH (from query OR from profile) → recommend 3-5 products. Use their profile (gender, age, style, climate, sizes, interests) to personalize.
5. ALWAYS explain your reasoning. Start agent_message with what info you used, e.g. "Since you mentioned you're into hiking and prefer budget options, ..."

## LEARNING FROM CONVERSATION
Analyze the conversation to extract any new info about the user. Return a "learned_preferences" object with any NEW facts you picked up:
- gender: if mentioned or strongly implied
- age_range: e.g. "18-25", "30-40", "50+"
- style: e.g. "casual", "sporty", "formal", "streetwear", "minimalist"
- interests: e.g. ["hiking", "gaming", "cooking"]
- sizes: e.g. {"shirt": "M", "shoe": "10", "pants": "32"}
- dislikes: things they said they don't want
- use_cases: what they need the product for
- favorite_colors: color preferences mentioned
- climate: where they live / what weather they deal with

Only include fields where you learned something NEW from THIS conversation. Omit fields with no new info.

## IMPORTANT RULES
- Generate realistic mock products with real brand names and realistic prices
- Each product MUST have a unique id (format: "prod-001", "prod-002", etc.)
- For source_url, use REAL retailer search URLs (e.g., "https://www.amazon.com/s?k=Sony+WH-1000XM5")
- For image_url, use Unsplash: "https://images.unsplash.com/photo-{id}?w=400&h=300&fit=crop"
- When asking a follow-up, do NOT include products — set products to []
- Always respect the user's stated preferences (brands, price range, etc.)

## RESPONSE FORMAT
You MUST respond with valid JSON only (no markdown, no code blocks):
{
  "agent_message": "Your conversational response explaining your thinking",
  "thinking": "Brief internal note about what info you used and what's missing (shown to user as transparency)",
  "intent": {
    "category": "product_category",
    "price_range_min": null,
    "price_range_max": null,
    "quality_level": "budget" | "balanced" | "premium",
    "key_features": ["feature1", "feature2"],
    "shipping_priority": "fastest" | "normal" | "cheapest"
  },
  "products": [
    {
      "id": "prod-001",
      "name": "Full Product Name",
      "brand": "Brand Name",
      "price": 99.99,
      "original_price": 129.99,
      "shipping_eta": "Arrives in 2-4 days",
      "rating": 4.5,
      "review_count": 1234,
      "value_tag": "Best value" | "Best overall" | "Fastest shipping" | "Budget pick" | "Premium pick",
      "description": "One-line description",
      "why_recommended": "Specific reason this matches the user",
      "image_url": "https://images.unsplash.com/photo-XXXXXXX?w=400&h=300&fit=crop",
      "source_name": "Amazon",
      "source_url": "https://www.amazon.com/s?k=Product+Name",
      "category": "category_name",
      "available_coupons": 0,
      "key_features": ["feature1", "feature2", "feature3"]
    }
  ],
  "follow_up_question": null | {"question": "...", "options": ["A", "B", "C"]},
  "learned_preferences": {}
}"""


async def interpret_query_with_gemini(request: SearchRequest) -> SearchResponse:
    """
    Send the user's query to OpenRouter for interpretation and product recommendations.
    Falls back to mock data if OpenRouter is unavailable.
    """
    if client is None:
        return generate_mock_response(request)

    try:
        # Build rich user context from profile
        user_context_parts = []
        if request.user_profile:
            p = request.user_profile
            user_context_parts.append(f"Price sensitivity: {p.price_sensitivity.value}")
            user_context_parts.append(f"Shipping preference: {p.shipping_preference.value}")
            if p.preferred_brands:
                user_context_parts.append(f"Preferred brands: {', '.join(p.preferred_brands)}")

            # Include learned preferences
            lp = p.learned
            if lp.gender:
                user_context_parts.append(f"Gender: {lp.gender}")
            if lp.age_range:
                user_context_parts.append(f"Age range: {lp.age_range}")
            if lp.style:
                user_context_parts.append(f"Style: {lp.style}")
            if lp.interests:
                user_context_parts.append(f"Interests: {', '.join(lp.interests)}")
            if lp.sizes:
                sizes_str = ", ".join(f"{k}: {v}" for k, v in lp.sizes.items())
                user_context_parts.append(f"Sizes: {sizes_str}")
            if lp.dislikes:
                user_context_parts.append(f"Dislikes: {', '.join(lp.dislikes)}")
            if lp.use_cases:
                user_context_parts.append(f"Known use-cases: {', '.join(lp.use_cases)}")
            if lp.favorite_colors:
                user_context_parts.append(f"Favorite colors: {', '.join(lp.favorite_colors)}")
            if lp.climate:
                user_context_parts.append(f"Climate: {lp.climate}")

        user_context = ""
        if user_context_parts:
            user_context = "User profile:\n" + "\n".join(f"- {x}" for x in user_context_parts) + "\n"

        conversation_context = ""
        if request.conversation_history:
            conversation_context = "\nConversation so far:\n"
            for msg in request.conversation_history[-10:]:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                conversation_context += f"- {role}: {content}\n"

        user_message = f"""{user_context}
{conversation_context}
User's latest message: "{request.query}"
"""

        response = await client.chat.completions.create(
            model=OPENROUTER_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.7,
        )

        raw_content = response.choices[0].message.content
        if not raw_content:
            return generate_mock_response(request)
        response_text = raw_content.strip()

        # Clean up markdown code blocks if present
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:])
            if response_text.endswith("```"):
                response_text = response_text[:-3].strip()

        data = json.loads(response_text)

        # Extract learned preferences
        learned = None
        if data.get("learned_preferences"):
            try:
                learned = LearnedPreferences(**data["learned_preferences"])
            except Exception:
                learned = None

        return SearchResponse(
            agent_message=data.get("agent_message", "Here are some recommendations for you."),
            thinking=data.get("thinking"),
            intent=ShoppingIntent(**data["intent"]) if data.get("intent") else None,
            products=[Product(**p) for p in data.get("products", [])],
            follow_up_question=(
                FollowUpQuestion(**data["follow_up_question"])
                if data.get("follow_up_question")
                else None
            ),
            learned_preferences=learned,
        )
    except Exception as e:
        print(f"OpenRouter API error: {e}")
        return generate_mock_response(request)


def generate_mock_response(request: SearchRequest) -> SearchResponse:
    """Generate a smart mock response when OpenRouter is unavailable."""
    from mock_data import get_mock_products

    query_lower = request.query.lower()

    # ── Smarter category detection with sub-types ──
    category = "general"
    thinking = None
    follow_up = None

    # Check if this is a broad/ambiguous query that needs clarification
    jacket_words = ["jacket", "coat", "warm", "winter", "cold", "parka"]
    shoe_words = ["shoe", "sneaker", "running", "trainer", "boots", "footwear"]
    electronics_words = ["monitor", "screen", "display", "headphone", "earphone",
                         "earbud", "audio", "music", "laptop", "computer", "macbook", "notebook"]

    if any(w in query_lower for w in jacket_words):
        # Check if the use-case is specified
        use_cases = {
            "ski": "skiing",
            "hik": "hiking",
            "rain": "rain protection",
            "business": "business/formal",
            "casual": "casual everyday",
            "puffer": "puffer/insulated",
        }
        matched_use = None
        for kw, uc in use_cases.items():
            if kw in query_lower:
                matched_use = uc
                break

        # Check if user profile already gives us enough context to skip the question
        has_profile_context = False
        if request.user_profile:
            lp = request.user_profile.learned
            if lp.use_cases or lp.style or lp.climate:
                has_profile_context = True
                if lp.use_cases:
                    matched_use = lp.use_cases[0]

        if matched_use is None and not has_profile_context and not any(w in query_lower for w in ["budget", "cheap", "premium", "under"]):
            # Only ask if truly ambiguous AND no profile context helps
            thinking = "User wants a jacket but didn't specify the type or use-case. Need to narrow it down."
            follow_up = FollowUpQuestion(
                question="What kind of jacket are you looking for? This helps me find the perfect match!",
                options=[
                    "Skiing / Snowboarding",
                    "Hiking / Outdoor",
                    "Rain / Waterproof",
                    "Casual / Everyday",
                    "Puffer / Insulated warmth",
                ],
            )
            return SearchResponse(
                agent_message="I'd love to help you find the right jacket! There are so many types though - let me narrow it down so I can give you the best picks.",
                thinking=thinking,
                intent=ShoppingIntent(category="jackets", price_range_min=None, price_range_max=None,
                                      quality_level="balanced", key_features=[], shipping_priority="normal"),
                products=[],
                follow_up_question=follow_up,
                learned_preferences=None,
            )
        category = "winter_jackets"
        thinking = f"User wants a jacket for {matched_use or 'winter/cold weather'}. Using their profile to personalize."
    elif any(w in query_lower for w in ["monitor", "screen", "display"]):
        category = "monitors"
        thinking = "User is looking for a monitor. Checking profile for use-case (gaming, office, creative)."
    elif any(w in query_lower for w in ["headphone", "earphone", "earbud", "audio", "music"]):
        category = "headphones"
        thinking = "User wants audio gear. Considering their style and use-case preferences."
    elif any(w in query_lower for w in ["laptop", "computer", "macbook", "notebook"]):
        category = "laptops"
        thinking = "User needs a laptop. Will factor in their interests and budget."
    elif any(w in query_lower for w in shoe_words):
        has_shoe_context = False
        if request.user_profile:
            lp = request.user_profile.learned
            if lp.use_cases or lp.style:
                has_shoe_context = True

        if not has_shoe_context and not any(w in query_lower for w in ["running", "hiking", "casual", "formal", "gym", "trail"]):
            thinking = "User wants shoes but didn't specify the activity. Need to clarify."
            follow_up = FollowUpQuestion(
                question="What will you mainly use these shoes for?",
                options=[
                    "Running / Jogging",
                    "Hiking / Trail",
                    "Casual / Everyday",
                    "Gym / Training",
                    "Walking / Comfort",
                ],
            )
            return SearchResponse(
                agent_message="Shoes are very activity-specific - the right pair for running is totally different from hiking or casual wear. Let me know what you'll use them for!",
                thinking=thinking,
                intent=ShoppingIntent(category="shoes", price_range_min=None, price_range_max=None,
                                      quality_level="balanced", key_features=[], shipping_priority="normal"),
                products=[],
                follow_up_question=follow_up,
                learned_preferences=None,
            )
        category = "running_shoes"
        thinking = "User wants shoes for a specific activity. Matching to best options."
    elif any(w in query_lower for w in ["suitcase", "luggage", "carry-on", "travel bag"]):
        category = "luggage"
        thinking = "User needs luggage. Checking if they travel frequently."

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

    # Build smart agent message using profile context
    profile_notes = []
    if request.user_profile:
        lp = request.user_profile.learned
        if lp.gender:
            profile_notes.append(f"your profile ({lp.gender})")
        if lp.style:
            profile_notes.append(f"your {lp.style} style")
        if lp.climate:
            profile_notes.append(f"your {lp.climate} climate")
        ps = request.user_profile.price_sensitivity.value
        if ps != "balanced":
            profile_notes.append(f"your {ps} budget preference")

    category_display = category.replace("_", " ")
    if profile_notes:
        context_str = ", ".join(profile_notes)
        agent_message = (
            f"Based on {context_str}, I found {len(products)} great {category_display} options for you. "
            f"Here are my top picks, ranked by overall value."
        )
    else:
        agent_message = (
            f"Here are {len(products)} solid {category_display} options! "
            f"I've ranked them by value, considering quality, price, and shipping speed."
        )

    if not thinking:
        thinking = f"Matched query to {category_display}. Quality: {quality}, Shipping: {shipping}."

    # Try to learn something from the query
    learned = _extract_preferences_from_query(query_lower)

    if category == "general":
        # Only ask for category if the query is truly vague (very short / no product signal)
        words = query_lower.split()
        is_very_vague = len(words) <= 2 and not any(
            w in query_lower for w in ["buy", "get", "find", "need", "want", "looking", "recommend"]
        )
        if is_very_vague:
            follow_up = FollowUpQuestion(
                question="I'd love to help! What kind of product are you looking for?",
                options=[
                    "Winter clothing / Jackets",
                    "Electronics (monitors, laptops, headphones)",
                    "Shoes & footwear",
                    "Travel gear / Luggage",
                ],
            )
            agent_message = "I want to make sure I find exactly what you need. What category are you shopping in?"
            thinking = "Query is too broad to determine category. Asking for clarification."

    return SearchResponse(
        agent_message=agent_message,
        thinking=thinking,
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
        learned_preferences=learned,
    )


def _extract_preferences_from_query(query: str) -> Optional[LearnedPreferences]:
    """Extract any preference signals from the raw query text."""
    learned = {}

    # Gender signals
    gender_male = ["men's", "mens", "for men", "male", "guy", "boyfriend", "husband", "dad"]
    gender_female = ["women's", "womens", "for women", "female", "girl", "girlfriend", "wife", "mom"]
    if any(w in query for w in gender_male):
        learned["gender"] = "male"
    elif any(w in query for w in gender_female):
        learned["gender"] = "female"

    # Use-case signals
    use_cases = []
    uc_map = {
        "hiking": "hiking", "ski": "skiing", "running": "running",
        "gaming": "gaming", "office": "office", "travel": "travel",
        "gym": "gym", "work": "work", "school": "school",
        "camping": "camping", "commut": "commuting",
    }
    for kw, uc in uc_map.items():
        if kw in query:
            use_cases.append(uc)
    if use_cases:
        learned["use_cases"] = use_cases

    # Style signals
    style_map = {
        "casual": "casual", "formal": "formal", "sporty": "sporty",
        "minimalist": "minimalist", "streetwear": "streetwear",
        "classic": "classic", "modern": "modern",
    }
    for kw, st in style_map.items():
        if kw in query:
            learned["style"] = st
            break

    # Climate signals
    climate_map = {
        "cold": "cold", "snow": "cold", "winter": "cold",
        "rain": "rainy", "tropical": "tropical", "hot": "hot",
        "warm weather": "warm",
    }
    for kw, cl in climate_map.items():
        if kw in query:
            learned["climate"] = cl
            break

    # Color signals
    colors = ["black", "white", "blue", "red", "green", "gray", "grey",
              "navy", "olive", "tan", "brown", "pink", "purple", "orange"]
    found_colors = [c for c in colors if c in query]
    if found_colors:
        learned["favorite_colors"] = found_colors

    if learned:
        return LearnedPreferences(**learned)
    return None
