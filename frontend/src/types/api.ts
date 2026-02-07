/**
 * API-level types — shapes matching the backend response models.
 * Used by the API client layer.
 */

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

export interface UserProfileAPI {
  price_sensitivity: "budget" | "balanced" | "premium";
  shipping_preference: "fastest" | "normal" | "cheapest";
  preferred_brands: string[];
  saved_card?: SavedCard | null;
}

export interface SavedCard {
  nickname: string;
  is_virtual: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
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

// ─── Price Tracking Types ───────────────────────────────

export interface TrackingStatus {
  user_active: boolean;
  tracking_running: boolean;
  last_active: string;
  inactive_threshold_hours: number;
  hours_until_pause: number;
  watchlist_interval_minutes: number;
  purchase_interval_minutes: number;
  watchlist_count: number;
  purchase_count: number;
  recent_activity: TrackingLogEntry[];
  purchase_alerts: PurchaseAlert[];
}

export interface TrackingLogEntry {
  type: string;
  product_id?: string;
  product_name?: string;
  old_price?: number;
  new_price?: number;
  change?: number;
  price?: number;
  reason?: string;
  timestamp: string;
}

export interface PurchaseAlert {
  product_id: string;
  product_name: string;
  purchased_price: number;
  current_market_price: number;
  savings: number;
  drop_percent: number;
  timestamp: string;
}

export interface PurchaseAlertsResponse {
  alerts: PurchaseAlert[];
  count: number;
  total_potential_savings: number;
}

export interface PriceDrop {
  product_id: string;
  product_name: string;
  current_price: number;
  previous_price: number;
  original_price: number;
  drop_amount: number;
  drop_percent: number;
  total_savings: number;
  target_price: number | null;
  hit_target: boolean;
  brand: string;
  category: string;
  alert_level: "high" | "medium" | "low";
}

export interface PriceDropsResponse {
  drops: PriceDrop[];
  total_potential_savings: number;
  items_with_drops: number;
  watchlist_size: number;
}
