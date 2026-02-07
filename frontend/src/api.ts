import type {
  SearchResponse,
  UserProfile,
  PurchaseRecord,
  SpendingOverview,
  PriceDropsResponse,
  TrackingStatus,
  PurchaseAlertsResponse,
} from './types';

const API_BASE = '/api';

export async function searchProducts(
  query: string,
  userProfile?: UserProfile,
  conversationHistory?: { role: string; content: string }[]
): Promise<SearchResponse> {
  const res = await fetch(`${API_BASE}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      user_profile: userProfile
        ? {
            price_sensitivity: userProfile.price_sensitivity,
            shipping_preference: userProfile.shipping_preference,
            preferred_brands: userProfile.preferred_brands,
          }
        : undefined,
      conversation_history: conversationHistory || [],
    }),
  });
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

export async function purchaseProduct(data: {
  product_id: string;
  product_name: string;
  price: number;
  brand: string;
  category: string;
  card_nickname: string;
}): Promise<{ status: string; message: string; record: PurchaseRecord }> {
  const res = await fetch(`${API_BASE}/purchase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Purchase failed');
  return res.json();
}

export async function getSpending(): Promise<SpendingOverview> {
  const res = await fetch(`${API_BASE}/spending`);
  if (!res.ok) throw new Error('Failed to get spending');
  return res.json();
}

export async function getCoupons(
  productId: string
): Promise<{ product_id: string; coupons: { code: string; discount: string; source: string }[] }> {
  const res = await fetch(`${API_BASE}/coupons/${productId}`);
  if (!res.ok) throw new Error('Failed to get coupons');
  return res.json();
}

export async function getPriceDrops(): Promise<PriceDropsResponse> {
  const res = await fetch(`${API_BASE}/price-drops`);
  if (!res.ok) throw new Error('Failed to get price drops');
  return res.json();
}

// ─── Price Tracking API ─────────────────────────────────

export async function getTrackingStatus(): Promise<TrackingStatus> {
  const res = await fetch(`${API_BASE}/tracking/status`);
  if (!res.ok) throw new Error('Failed to get tracking status');
  return res.json();
}

export async function sendHeartbeat(): Promise<{ status: string; tracking: boolean; last_active: string }> {
  const res = await fetch(`${API_BASE}/tracking/heartbeat`, { method: 'POST' });
  if (!res.ok) throw new Error('Heartbeat failed');
  return res.json();
}

export async function getPurchaseAlerts(): Promise<PurchaseAlertsResponse> {
  const res = await fetch(`${API_BASE}/tracking/purchase-alerts`);
  if (!res.ok) throw new Error('Failed to get purchase alerts');
  return res.json();
}

export async function dismissPurchaseAlert(productId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/tracking/purchase-alerts/${productId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to dismiss alert');
}
