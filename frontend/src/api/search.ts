import type { UserProfile, SearchResult } from "../types";
import { mapProduct } from "../utils";

const API_BASE = "/api";

export async function searchBackend(
  query: string,
  profile: UserProfile,
  history: { role: string; text: string }[]
): Promise<SearchResult> {
  const res = await fetch(`${API_BASE}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      user_profile: {
        price_sensitivity: profile.price_sensitivity,
        shipping_preference: profile.shipping_preference,
        preferred_brands: profile.preferred_brands,
      },
      conversation_history: history.map((h) => ({ role: h.role, content: h.text })),
    }),
  });
  if (!res.ok) throw new Error("Search failed");
  const data = await res.json();
  return {
    summary: data.agent_message || "Here are my top picks:",
    products: (data.products || []).map(mapProduct),
    follow_up_question: data.follow_up_question?.question || null,
    follow_up_options: data.follow_up_question?.options || [],
    ambiguous: !!data.follow_up_question,
  };
}
