import type { UIProduct } from "../types";

const API_BASE = "/api";

export async function recordPurchase(product: UIProduct, cardName: string) {
  try {
    await fetch(`${API_BASE}/purchase`, {
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
  } catch (e) {
    console.error("Purchase record error:", e);
  }
}
