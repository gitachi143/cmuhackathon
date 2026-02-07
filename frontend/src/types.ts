export interface Product {
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

export interface ShoppingIntent {
  category: string;
  price_range_min?: number | null;
  price_range_max?: number | null;
  quality_level: string;
  key_features: string[];
  shipping_priority: string;
}

export interface FollowUpQuestion {
  question: string;
  options: string[];
}

export interface SearchResponse {
  agent_message: string;
  intent?: ShoppingIntent | null;
  products: Product[];
  follow_up_question?: FollowUpQuestion | null;
}

export interface UserProfile {
  price_sensitivity: 'budget' | 'balanced' | 'premium';
  shipping_preference: 'fastest' | 'normal' | 'cheapest';
  preferred_brands: string[];
  saved_card?: SavedCard | null;
}

export interface SavedCard {
  nickname: string;
  is_virtual: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  products?: Product[];
  follow_up_question?: FollowUpQuestion | null;
  timestamp: Date;
}

export interface PurchaseRecord {
  product_id: string;
  product_name: string;
  price: number;
  brand: string;
  category: string;
  card_nickname: string;
  timestamp: string;
}

export interface SpendingOverview {
  total_spent: number;
  purchase_count: number;
  by_category: Record<string, number>;
  watchlist_count: number;
}
