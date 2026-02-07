import type { BackendProduct, UIProduct } from "../types/app";

export function mapProduct(p: BackendProduct): UIProduct {
  const specs: Record<string, string> = {};
  p.key_features.forEach((f, i) => {
    specs[`feature_${i + 1}`] = f;
  });
  return {
    id: p.id,
    title: p.name,
    brand: p.brand,
    price: p.price,
    original_price: p.original_price ?? null,
    shipping_eta: p.shipping_eta,
    rating: p.rating,
    reviews: p.review_count,
    tag: p.value_tag,
    explanation: p.why_recommended || p.description,
    image_url: p.image_url ?? null,
    source: p.source_name,
    url: p.source_url,
    category: p.category,
    coupons: p.available_coupons,
    specs,
  };
}
