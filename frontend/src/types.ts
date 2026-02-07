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

// ─── Enhanced Analytics Types ────────────────────────────

export interface SpendingAnalytics {
  total_spent: number;
  purchase_count: number;
  avg_per_purchase: number;
  by_category: Record<string, { amount: number; count: number }>;
  by_merchant: Record<string, { amount: number; count: number }>;
  weekly_totals: { week: string; amount: number }[];
  monthly_totals: { month: string; amount: number }[];
  top_merchants: { name: string; amount: number; count: number }[];
  largest_purchase: { amount: number; merchant: string; date: string } | null;
  smallest_purchase: { amount: number; merchant: string; date: string } | null;
  daily_average: number;
  source: {
    bank_transactions: number;
    app_purchases: number;
    nessie_connected: boolean;
  };
}

export interface SpendingHabits {
  frequency: string;
  busiest_day: string | null;
  avg_weekly_spend: number;
  avg_monthly_spend: number;
  recurring_charges: {
    merchant: string;
    amount: number;
    frequency: string;
    total: number;
  }[];
  spending_velocity: string;
  velocity_pct: number;
  insights: string[];
  category_trends: {
    category: string;
    weekly_amounts: number[];
  }[];
  day_breakdown: Record<string, { count: number; amount: number }>;
}

export interface PriceDrop {
  product_id: string;
  product_title: string;
  current_price: number;
  previous_price: number;
  original_price: number;
  drop_amount: number;
  drop_percent: number;
  total_savings: number;
  total_savings_percent: number;
  target_price: number | null;
  hit_target: boolean;
  price_history: { price: number; date: string }[];
  brand: string;
  category: string;
  alert_level: 'high' | 'medium' | 'low';
}

export interface PriceDropsResponse {
  drops: PriceDrop[];
  total_potential_savings: number;
  items_with_drops: number;
  watchlist_size: number;
}

// ─── Capital One Nessie Types ────────────────────────────

export interface NessieAccount {
  id: string;
  type: string;
  nickname: string;
  rewards: number;
  balance: number;
  account_number: string;
}

export interface NessieAccountsResponse {
  accounts: NessieAccount[];
  total_balance: number;
  total_rewards: number;
  connected: boolean;
}

export interface NessiePurchase {
  id: string;
  merchant_id: string;
  merchant_name?: string;
  category?: string;
  medium: string;
  purchase_date: string;
  amount: number;
  status: string;
  description: string;
  payer_id: string;
}

export interface NessiePurchasesResponse {
  purchases: NessiePurchase[];
  total: number;
  count: number;
  connected: boolean;
}

export interface NessieMerchant {
  id: string;
  name: string;
  category: string[];
  address: Record<string, string>;
  geocode: Record<string, number>;
}
