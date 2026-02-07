import type { UIProduct } from "../types";
import type { ShippingResponse } from "../types/api";

const API_BASE = "/api";

export async function recordPurchase(product: UIProduct, cardName: string): Promise<{ order_id?: string }> {
  try {
    const res = await fetch(`${API_BASE}/purchase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: product.id,
        product_name: product.title,
        price: product.price,
        brand: product.brand,
        category: product.category,
        card_nickname: cardName,
      }),
    });
    const data = await res.json();
    return { order_id: data.record?.order_id };
  } catch (e) {
    console.error("Purchase record error:", e);
    return {};
  }
}

export async function fetchShippingStatuses(): Promise<ShippingResponse> {
  const res = await fetch(`${API_BASE}/purchases/shipping`);
  return res.json();
}
