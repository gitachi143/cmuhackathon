import { useState, useEffect } from "react";
import type { UserProfile, WatchlistItem } from "../types";

const STORAGE_KEY = "cliq_profile_v2";

const DEFAULTS: UserProfile = {
  id: "default_user",
  price_sensitivity: "balanced",
  shipping_preference: "normal",
  preferred_brands: [],
  saved_card: null,
  personal_info: { name: "", email: "" },
  shipping_address: { address_line: "", city: "", state: "", zip: "" },
  purchase_history: [],
  watchlist: [],
  search_history: [],
};

function loadProfile(): UserProfile {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!["fastest", "normal", "cheapest"].includes(parsed.shipping_preference))
        parsed.shipping_preference = "normal";
      if (!["budget", "balanced", "premium"].includes(parsed.price_sensitivity))
        parsed.price_sensitivity = "balanced";
      return {
        ...DEFAULTS,
        ...parsed,
        personal_info: { ...DEFAULTS.personal_info, ...(parsed.personal_info || {}) },
        shipping_address: { ...DEFAULTS.shipping_address, ...(parsed.shipping_address || {}) },
        search_history: parsed.search_history || [],
        watchlist: (parsed.watchlist || []).map((w: WatchlistItem) => ({
          product_id: w.product_id,
          product_title: w.product_title,
          current_price: w.current_price,
          target_price: w.target_price ?? null,
          added_at: w.added_at || new Date().toISOString(),
          price_history: w.price_history || [{ price: w.current_price, date: new Date().toISOString() }],
          brand: w.brand || "",
          category: w.category || "",
          source: w.source || "",
          url: w.url || "",
          shipping_eta: w.shipping_eta || "",
        })),
      };
    }
  } catch {
    /* ignore corrupted localStorage */
  }
  return DEFAULTS;
}

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile>(loadProfile);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }, [profile]);

  return { profile, setProfile };
}
