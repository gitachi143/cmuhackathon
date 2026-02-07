import type {
  SearchResponse,
  UserProfile,
  PurchaseRecord,
  SpendingOverview,
  SpendingAnalytics,
  SpendingHabits,
  PriceDropsResponse,
  NessieAccountsResponse,
  NessiePurchasesResponse,
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

// ─── Enhanced Analytics API ──────────────────────────────

export async function getSpendingAnalytics(): Promise<SpendingAnalytics> {
  const res = await fetch(`${API_BASE}/spending/analytics`);
  if (!res.ok) throw new Error('Failed to get spending analytics');
  return res.json();
}

export async function getSpendingHabits(): Promise<SpendingHabits> {
  const res = await fetch(`${API_BASE}/spending/habits`);
  if (!res.ok) throw new Error('Failed to get spending habits');
  return res.json();
}

export async function getPriceDrops(): Promise<PriceDropsResponse> {
  const res = await fetch(`${API_BASE}/price-drops`);
  if (!res.ok) throw new Error('Failed to get price drops');
  return res.json();
}

// ─── Capital One Nessie API ─────────────────────────────

export async function getNessieAccounts(): Promise<NessieAccountsResponse> {
  const res = await fetch(`${API_BASE}/nessie/accounts`);
  if (!res.ok) throw new Error('Failed to get Nessie accounts');
  return res.json();
}

export async function getNessiePurchases(accountId?: string): Promise<NessiePurchasesResponse> {
  const url = accountId
    ? `${API_BASE}/nessie/purchases?account_id=${accountId}`
    : `${API_BASE}/nessie/purchases`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to get Nessie purchases');
  return res.json();
}

export async function getNessieMerchants(): Promise<{
  merchants: { id: string; name: string; category: string[] }[];
  count: number;
  connected: boolean;
}> {
  const res = await fetch(`${API_BASE}/nessie/merchants`);
  if (!res.ok) throw new Error('Failed to get Nessie merchants');
  return res.json();
}
