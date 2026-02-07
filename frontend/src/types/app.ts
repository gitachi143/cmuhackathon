/**
 * Application-level types used across the frontend.
 *
 * BackendProduct = shape returned by the API.
 * UIProduct     = shape used by UI components after mapping.
 * ChatMsg       = a single chat message in the conversation.
 * UserProfile   = local user profile persisted in localStorage.
 */

// ── Product types ─────────────────────────────────────────

export interface BackendProduct {
  id: string;
  name: string;
  brand: string;
  price: number;
  original_price?: number | null;
  shipping_eta: string;
  rating: number;
  review_count: number;
  value_tag: string;
  description: string;
  why_recommended: string;
  image_url?: string | null;
  source_name: string;
  source_url: string;
  category: string;
  available_coupons: number;
  key_features: string[];
}

export interface UIProduct {
  id: string;
  title: string;
  brand: string;
  price: number;
  original_price: number | null;
  shipping_eta: string;
  rating: number;
  reviews: number;
  tag: string;
  explanation: string;
  image_url: string | null;
  source: string;
  url: string;
  category: string;
  coupons: number;
  specs: Record<string, string>;
}

// ── Chat types ────────────────────────────────────────────

export interface ChatMsg {
  id: string;
  role: "user" | "agent" | "follow_up";
  text: string;
  thinking?: string | null;
  options: string[];
  products: UIProduct[];
}

// ── User / profile types ──────────────────────────────────

export interface LearnedPreferences {
  gender: string | null;
  age_range: string | null;
  style: string | null;
  interests: string[];
  sizes: Record<string, string>;
  dislikes: string[];
  use_cases: string[];
  favorite_colors: string[];
  climate: string | null;
}

export interface ShippingAddress {
  address_line: string;
  city: string;
  state: string;
  zip: string;
}

export interface PersonalInfo {
  name: string;
  email: string;
}

export interface SavedCardDetails {
  nickname: string;
  card_type: string;
  is_virtual: boolean;
  last_four: string;
}

export interface WatchlistItem {
  product_id: string;
  product_title: string;
  current_price: number;
  target_price: number | null;
  added_at: string;
  price_history: { price: number; date: string }[];
  brand: string;
  category: string;
  source: string;
  url: string;
  shipping_eta: string;
}

export interface SearchHistoryEntry {
  query: string;
  timestamp: string;
  result_count: number;
}

export interface UserProfile {
  id: string;
  price_sensitivity: string;
  shipping_preference: string;
  preferred_brands: string[];
  saved_card: SavedCardDetails | null;
  personal_info: PersonalInfo;
  shipping_address: ShippingAddress;
  learned: LearnedPreferences;
  purchase_history: {
    order_id?: string;
    product_id: string;
    product_title: string;
    price: number;
    category: string;
    card_used: string;
    timestamp: string;
    shipping_status?: string;
  }[];
  watchlist: WatchlistItem[];
  search_history: SearchHistoryEntry[];
}

// ── Search result (mapped from backend response) ──────────

export interface SearchResult {
  summary: string;
  thinking: string | null;
  products: UIProduct[];
  follow_up_question: string | null;
  follow_up_options: string[];
  ambiguous: boolean;
  learned_preferences: Partial<LearnedPreferences> | null;
}
