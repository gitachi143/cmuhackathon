import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "./context/ThemeContext";
import type { TrackingStatus, PurchaseAlert } from "./types";

// ── Types ──────────────────────────────────────────────
interface BackendProduct {
  id: string; name: string; brand: string; price: number;
  original_price?: number | null; shipping_eta: string; rating: number;
  review_count: number; value_tag: string; description: string;
  why_recommended: string; source_name: string; source_url: string;
  category: string; available_coupons: number; key_features: string[];
}

interface UIProduct {
  id: string; title: string; brand: string; price: number;
  original_price: number | null; shipping_eta: string; rating: number;
  reviews: number; tag: string; explanation: string; source: string;
  url: string; category: string; coupons: number;
  specs: Record<string, string>;
}

interface ChatMsg {
  id: string; role: "user" | "agent" | "follow_up";
  text: string; options: string[]; products: UIProduct[];
}

interface ShippingAddress {
  address_line: string;
  city: string;
  state: string;
  zip: string;
}

interface PersonalInfo {
  name: string;
  email: string;
}

interface SavedCardDetails {
  nickname: string;
  card_type: string;
  is_virtual: boolean;
  last_four: string;
}

interface WatchlistItem {
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

interface SearchHistoryEntry {
  query: string;
  timestamp: string;
  result_count: number;
}

interface UserProfile {
  id: string; price_sensitivity: string; shipping_preference: string;
  preferred_brands: string[]; saved_card: SavedCardDetails | null;
  personal_info: PersonalInfo;
  shipping_address: ShippingAddress;
  purchase_history: { product_id: string; product_title: string; price: number; category: string; card_used: string; timestamp: string }[];
  watchlist: WatchlistItem[];
  search_history: SearchHistoryEntry[];
}

// ── Backend API ────────────────────────────────────────
function mapProduct(p: BackendProduct): UIProduct {
  const specs: Record<string, string> = {};
  p.key_features.forEach((f, i) => { specs[`feature_${i + 1}`] = f; });
  return {
    id: p.id, title: p.name, brand: p.brand, price: p.price,
    original_price: p.original_price ?? null, shipping_eta: p.shipping_eta,
    rating: p.rating, reviews: p.review_count, tag: p.value_tag,
    explanation: p.why_recommended || p.description,
    source: p.source_name, url: p.source_url, category: p.category,
    coupons: p.available_coupons, specs,
  };
}

async function searchBackend(query: string, profile: UserProfile, history: { role: string; text: string }[]) {
  try {
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        user_profile: {
          price_sensitivity: profile.price_sensitivity,
          shipping_preference: profile.shipping_preference,
          preferred_brands: profile.preferred_brands,
        },
        conversation_history: history.map(h => ({ role: h.role, content: h.text })),
      }),
    });
    if (!res.ok) throw new Error("Search failed");
    const data = await res.json();
    return {
      summary: data.agent_message || "Here are my top picks:",
      products: (data.products || []).map(mapProduct),
      follow_up_question: data.follow_up_question?.question || null,
      follow_up_options: data.follow_up_question?.options || [],
      ambiguous: !!data.follow_up_question,
    };
  } catch (e) {
    console.error("Backend search error:", e);
    throw e;
  }
}

async function recordPurchase(product: UIProduct, cardName: string) {
  try {
    await fetch("/api/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: product.id, product_name: product.title,
        price: product.price, brand: product.brand,
        category: product.category, card_nickname: cardName,
      }),
    });
  } catch (e) { console.error("Purchase record error:", e); }
}

// ── Category Emoji Map ─────────────────────────────────
function getCategoryEmoji(cat: string): string {
  const c = cat.toLowerCase();
  if (c.includes("jacket") || c.includes("coat") || c.includes("winter") || c.includes("cloth")) return "🧥";
  if (c.includes("monitor") || c.includes("screen") || c.includes("display")) return "🖥️";
  if (c.includes("suitcase") || c.includes("luggage") || c.includes("travel")) return "🧳";
  if (c.includes("headphone") || c.includes("audio") || c.includes("earbud")) return "🎧";
  if (c.includes("shoe") || c.includes("sneaker") || c.includes("boot") || c.includes("running")) return "👟";
  if (c.includes("laptop") || c.includes("computer") || c.includes("notebook")) return "💻";
  return "📦";
}

// ── Tag Colors (theme-aware) ──────────────────────────
function useTagColors() {
  const { isDark } = useTheme();
  if (isDark) {
    return {
      "Best overall": { bg: "#1e3a5f", text: "#93c5fd" },
      "Best value": { bg: "#064e3b", text: "#6ee7b7" },
      "Fastest shipping": { bg: "#78350f", text: "#fcd34d" },
      "Budget pick": { bg: "#312e81", text: "#a5b4fc" },
      "Premium pick": { bg: "#701a75", text: "#f0abfc" },
    } as Record<string, { bg: string; text: string }>;
  }
  return {
    "Best overall": { bg: "#dbeafe", text: "#1e40af" },
    "Best value": { bg: "#d1fae5", text: "#065f46" },
    "Fastest shipping": { bg: "#fef3c7", text: "#92400e" },
    "Budget pick": { bg: "#e0e7ff", text: "#3730a3" },
    "Premium pick": { bg: "#fae8ff", text: "#86198f" },
  } as Record<string, { bg: string; text: string }>;
}

// ── Star Rating ────────────────────────────────────────
function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.3;
  return (
    <span style={{ color: "#f59e0b", fontSize: 14, letterSpacing: 1 }}>
      {"★".repeat(full)}{half ? "½" : ""}{"☆".repeat(5 - full - (half ? 1 : 0))}
      <span style={{ color: "var(--text-muted)", fontSize: 12, marginLeft: 4 }}>{rating}</span>
    </span>
  );
}

// ── Theme Toggle Button ───────────────────────────────
function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.08 }}
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        position: "relative",
        width: 44,
        height: 24,
        borderRadius: 99,
        border: "1px solid var(--border-default)",
        background: isDark ? "#1e3a5f" : "#e0e7ff",
        cursor: "pointer",
        padding: 0,
        display: "flex",
        alignItems: "center",
        transition: "background 0.3s ease, border-color 0.3s ease",
      }}
    >
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        style={{
          width: 18,
          height: 18,
          borderRadius: 99,
          background: isDark ? "#60a5fa" : "#f59e0b",
          marginLeft: isDark ? 22 : 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          boxShadow: isDark ? "0 0 6px rgba(96,165,250,0.5)" : "0 0 6px rgba(245,158,11,0.4)",
        }}
      >
        {isDark ? "🌙" : "☀️"}
      </motion.div>
    </motion.button>
  );
}

// ── Product Card ───────────────────────────────────────
function ProductCard({ product: p, onBuy, onWatch }: { product: UIProduct; onBuy: (p: UIProduct) => void; onWatch: (p: UIProduct) => void }) {
  const [showLink, setShowLink] = useState(false);
  const tagColors = useTagColors();
  const tc = tagColors[p.tag] || tagColors["Best overall"];
  return (
    <motion.div
      layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: "0 8px 25px rgba(0,0,0,0.15)" }}
      transition={{ duration: 0.2 }}
      style={{ background: "var(--bg-surface)", borderRadius: 12, padding: 16, border: "1px solid var(--border-default)", position: "relative", display: "flex", flexDirection: "column", gap: 8, transition: "background 0.2s, border-color 0.2s" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ background: tc.bg, color: tc.text, fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 99, textTransform: "uppercase", letterSpacing: 0.5 }}>{p.tag}</span>
        {p.coupons > 0 && <span style={{ fontSize: 11, color: "var(--text-success)", fontWeight: 500 }}>🏷️ {p.coupons} coupon{p.coupons > 1 ? "s" : ""}</span>}
      </div>
      <div style={{ background: `linear-gradient(135deg, ${tc.bg}, var(--bg-muted))`, borderRadius: 8, height: 80, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
        {getCategoryEmoji(p.category)}
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)", lineHeight: 1.3 }}>{p.title}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.brand}</div>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>${p.price.toFixed(2)}</span>
        {p.original_price && <span style={{ fontSize: 13, color: "var(--text-faint)", textDecoration: "line-through" }}>${p.original_price.toFixed(2)}</span>}
      </div>
      <Stars rating={p.rating} />
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>📦 {p.shipping_eta} · {p.reviews.toLocaleString()} reviews</div>
      <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4, margin: 0 }}>{p.explanation}</p>
      {Object.keys(p.specs).length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {Object.entries(p.specs).map(([k, v]) => (
            <span key={k} style={{ fontSize: 10, background: "var(--bg-muted)", color: "var(--text-secondary)", padding: "2px 6px", borderRadius: 4 }}>{v}</span>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
        <motion.button whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}
          onClick={() => onBuy(p)}
          style={{ flex: 1, background: "var(--bg-btn-primary)", color: "var(--text-on-primary)", border: "none", borderRadius: 8, padding: "8px 0", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
        >⚡ One-Click Buy</motion.button>
        <motion.button whileTap={{ scale: 0.95 }}
          onClick={() => onWatch(p)}
          style={{ background: "var(--bg-btn-secondary)", border: "1px solid var(--border-default)", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: 13 }}
        >👁️</motion.button>
        <motion.button whileTap={{ scale: 0.95 }}
          onClick={() => setShowLink(true)}
          style={{ background: "var(--bg-btn-secondary)", border: "1px solid var(--border-default)", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: 13 }}
        >🔗</motion.button>
      </div>
      <AnimatePresence>
        {showLink && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ position: "absolute", bottom: 60, left: 16, right: 16, background: "var(--bg-warning)", border: "1px solid var(--border-warning)", borderRadius: 8, padding: 10, fontSize: 12, zIndex: 10 }}
          >
            <div style={{ fontWeight: 600, color: "var(--text-warning-title)" }}>⚠️ You are leaving Cliq</div>
            <div style={{ color: "var(--text-warning-body)", marginTop: 2 }}>→ {p.source} ({(() => { try { return new URL(p.url).hostname; } catch { return p.url; } })()})</div>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <button onClick={() => window.open(p.url, "_blank")} style={{ fontSize: 11, background: "#f59e0b", color: "#fff", border: "none", borderRadius: 4, padding: "4px 10px", cursor: "pointer" }}>Continue</button>
              <button onClick={() => setShowLink(false)} style={{ fontSize: 11, background: "var(--bg-muted)", color: "var(--text-secondary)", border: "none", borderRadius: 4, padding: "4px 10px", cursor: "pointer" }}>Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── One-Click Buy Modal ────────────────────────────────
function BuyModal({ product, savedCard, personalInfo, shippingAddress, onConfirm, onClose, onSaveCard, onSavePersonalInfo, onSaveAddress }: {
  product: UIProduct; savedCard: UserProfile["saved_card"];
  personalInfo: PersonalInfo; shippingAddress: ShippingAddress;
  onConfirm: (p: UIProduct, card: string) => void; onClose: () => void;
  onSaveCard: (card: NonNullable<UserProfile["saved_card"]>) => void;
  onSavePersonalInfo: (info: PersonalInfo) => void;
  onSaveAddress: (addr: ShippingAddress) => void;
}) {
  const needsDetails = !savedCard || !personalInfo.name || !shippingAddress.address_line;
  const [step, setStep] = useState(needsDetails ? "details" : "confirm");
  const [nickname, setNickname] = useState(savedCard?.nickname || "Visa ending in 1234");
  const [lastFour, setLastFour] = useState(savedCard?.last_four || "1234");
  const [isVirtual, setIsVirtual] = useState(savedCard?.is_virtual || false);
  const [name, setName] = useState(personalInfo.name || "");
  const [email, setEmail] = useState(personalInfo.email || "");
  const [addressLine, setAddressLine] = useState(shippingAddress.address_line || "");
  const [city, setCity] = useState(shippingAddress.city || "");
  const [addrState, setAddrState] = useState(shippingAddress.state || "");
  const [zip, setZip] = useState(shippingAddress.zip || "");
  const [success, setSuccess] = useState(false);
  const fullAddress = [addressLine, city, addrState, zip].filter(Boolean).join(", ");
  const autofillFields = {
    name: name || personalInfo.name || "Not set",
    email: email || personalInfo.email || "Not set",
    address: fullAddress || "Not set",
    card: savedCard?.nickname || nickname,
  };

  if (success) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, background: "var(--overlay)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} style={{ background: "var(--bg-surface)", borderRadius: 16, padding: 32, textAlign: "center", maxWidth: 380 }}>
          <div style={{ fontSize: 48 }}>🎉</div>
          <h3 style={{ margin: "12px 0 4px", color: "var(--text-primary)" }}>Order Placed!</h3>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>{product.title} — ${product.price.toFixed(2)}</p>
          <p style={{ color: "var(--text-faint)", fontSize: 12 }}>This is a simulated purchase. No real charge.</p>
          <button onClick={onClose} style={{ marginTop: 12, background: "var(--bg-btn-primary)", color: "var(--text-on-primary)", border: "none", borderRadius: 8, padding: "10px 24px", fontWeight: 600, cursor: "pointer" }}>Done</button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, background: "var(--overlay)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={onClose}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} onClick={e => e.stopPropagation()}
        style={{ background: "var(--bg-surface)", borderRadius: 16, padding: 24, maxWidth: 400, width: "90%", maxHeight: "85vh", overflowY: "auto" }}>
        {step === "details" ? (
          <>
            <h3 style={{ margin: "0 0 4px", color: "var(--text-primary)" }}>Your Details</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "0 0 16px" }}>Saved locally for one-click purchases</p>

            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Personal Info</div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Alex Johnson" style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border-input)", borderRadius: 8, marginTop: 4, marginBottom: 8, fontSize: 14, boxSizing: "border-box", background: "var(--bg-input)", color: "var(--text-primary)" }} />
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="alex@example.com" type="email" style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border-input)", borderRadius: 8, marginTop: 4, marginBottom: 12, fontSize: 14, boxSizing: "border-box", background: "var(--bg-input)", color: "var(--text-primary)" }} />

            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Shipping Address</div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Address</label>
            <input value={addressLine} onChange={e => setAddressLine(e.target.value)} placeholder="5032 Forbes Ave" style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border-input)", borderRadius: 8, marginTop: 4, marginBottom: 8, fontSize: 14, boxSizing: "border-box", background: "var(--bg-input)", color: "var(--text-primary)" }} />
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>City</label>
                <input value={city} onChange={e => setCity(e.target.value)} placeholder="Pittsburgh" style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border-input)", borderRadius: 8, marginTop: 4, fontSize: 14, boxSizing: "border-box", background: "var(--bg-input)", color: "var(--text-primary)" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>State</label>
                <input value={addrState} onChange={e => setAddrState(e.target.value)} placeholder="PA" style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border-input)", borderRadius: 8, marginTop: 4, fontSize: 14, boxSizing: "border-box", background: "var(--bg-input)", color: "var(--text-primary)" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>ZIP</label>
                <input value={zip} onChange={e => setZip(e.target.value)} placeholder="15213" style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border-input)", borderRadius: 8, marginTop: 4, fontSize: 14, boxSizing: "border-box", background: "var(--bg-input)", color: "var(--text-primary)" }} />
              </div>
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, margin: "12px 0 6px" }}>Payment</div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Card Nickname</label>
            <input value={nickname} onChange={e => setNickname(e.target.value)} style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border-input)", borderRadius: 8, marginTop: 4, marginBottom: 8, fontSize: 14, boxSizing: "border-box", background: "var(--bg-input)", color: "var(--text-primary)" }} />
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Last 4 Digits</label>
            <input value={lastFour} onChange={e => setLastFour(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="1234" maxLength={4} style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border-input)", borderRadius: 8, marginTop: 4, marginBottom: 8, fontSize: 14, boxSizing: "border-box", background: "var(--bg-input)", color: "var(--text-primary)" }} />
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)", cursor: "pointer" }}>
              <input type="checkbox" checked={isVirtual} onChange={e => setIsVirtual(e.target.checked)} /> Use a virtual card
            </label>

            <p style={{ fontSize: 11, color: "var(--text-faint)", margin: "8px 0 0" }}>🔒 All data stored locally on your device only — no real charges</p>
            <button onClick={() => {
              onSavePersonalInfo({ name, email });
              onSaveAddress({ address_line: addressLine, city, state: addrState, zip });
              onSaveCard({ nickname, card_type: "visa", is_virtual: isVirtual, last_four: lastFour });
              setStep("confirm");
            }}
              style={{ width: "100%", marginTop: 16, background: "var(--bg-btn-primary)", color: "var(--text-on-primary)", border: "none", borderRadius: 8, padding: "10px 0", fontWeight: 600, cursor: "pointer" }}>Save & Continue</button>
          </>
        ) : (
          <>
            <h3 style={{ margin: "0 0 12px", color: "var(--text-primary)" }}>Confirm Purchase</h3>
            <div style={{ background: "var(--bg-surface-hover)", borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{product.title}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{product.brand} · {product.shipping_eta}</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: "var(--text-primary)" }}>${product.price.toFixed(2)}</div>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Paying with: <strong>{savedCard?.nickname || nickname}</strong></div>
            <div style={{ background: "var(--bg-autofill)", borderRadius: 8, padding: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-autofill-title)", marginBottom: 4 }}>🔍 Fields we would auto-fill:</div>
              {Object.entries(autofillFields).map(([k, v]) => (
                <div key={k} style={{ fontSize: 11, color: "var(--text-secondary)", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>{k}:</span><span>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={onClose} style={{ flex: 1, background: "var(--bg-btn-secondary)", border: "1px solid var(--border-default)", borderRadius: 8, padding: "10px 0", cursor: "pointer", fontWeight: 500, color: "var(--text-primary)" }}>Cancel</button>
              <motion.button whileTap={{ scale: 0.95 }}
                onClick={() => { setSuccess(true); onConfirm(product, savedCard?.nickname || nickname); }}
                style={{ flex: 2, background: "var(--bg-btn-primary)", color: "var(--text-on-primary)", border: "none", borderRadius: 8, padding: "10px 0", fontWeight: 600, cursor: "pointer" }}>Confirm Purchase</motion.button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Edit Details Modal ─────────────────────────────────
function EditDetailsModal({ personalInfo, shippingAddress, savedCard, onSave, onClose }: {
  personalInfo: PersonalInfo; shippingAddress: ShippingAddress; savedCard: SavedCardDetails | null;
  onSave: (info: PersonalInfo, addr: ShippingAddress, card: SavedCardDetails | null) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(personalInfo.name);
  const [email, setEmail] = useState(personalInfo.email);
  const [addressLine, setAddressLine] = useState(shippingAddress.address_line);
  const [city, setCity] = useState(shippingAddress.city);
  const [addrState, setAddrState] = useState(shippingAddress.state);
  const [zip, setZip] = useState(shippingAddress.zip);
  const [cardNickname, setCardNickname] = useState(savedCard?.nickname || "");
  const [lastFour, setLastFour] = useState(savedCard?.last_four || "");
  const [isVirtual, setIsVirtual] = useState(savedCard?.is_virtual || false);
  const inputStyle = { width: "100%", padding: "8px 12px", border: "1px solid var(--border-input)", borderRadius: 8, marginTop: 4, marginBottom: 8, fontSize: 14, boxSizing: "border-box" as const, background: "var(--bg-input)", color: "var(--text-primary)" };

  return (
    <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} onClick={e => e.stopPropagation()}
      style={{ background: "var(--bg-surface)", borderRadius: 16, padding: 24, maxWidth: 420, width: "90%", maxHeight: "85vh", overflowY: "auto" }}>
      <h3 style={{ margin: "0 0 4px", color: "var(--text-primary)" }}>Edit Your Details</h3>
      <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "0 0 16px" }}>All data is stored locally on your device</p>

      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Personal Info</div>
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Full Name</label>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Alex Johnson" style={inputStyle} />
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Email</label>
      <input value={email} onChange={e => setEmail(e.target.value)} placeholder="alex@example.com" type="email" style={inputStyle} />

      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, margin: "4px 0 6px" }}>Shipping Address</div>
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Address</label>
      <input value={addressLine} onChange={e => setAddressLine(e.target.value)} placeholder="5032 Forbes Ave" style={inputStyle} />
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 2 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>City</label>
          <input value={city} onChange={e => setCity(e.target.value)} placeholder="Pittsburgh" style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>State</label>
          <input value={addrState} onChange={e => setAddrState(e.target.value)} placeholder="PA" style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>ZIP</label>
          <input value={zip} onChange={e => setZip(e.target.value)} placeholder="15213" style={inputStyle} />
        </div>
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, margin: "4px 0 6px" }}>Payment Card</div>
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Card Nickname</label>
      <input value={cardNickname} onChange={e => setCardNickname(e.target.value)} placeholder="Visa ending in 1234" style={inputStyle} />
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Last 4 Digits</label>
      <input value={lastFour} onChange={e => setLastFour(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="1234" maxLength={4} style={inputStyle} />
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)", cursor: "pointer" }}>
        <input type="checkbox" checked={isVirtual} onChange={e => setIsVirtual(e.target.checked)} /> Use a virtual card
      </label>

      <p style={{ fontSize: 11, color: "var(--text-faint)", margin: "8px 0 0" }}>🔒 Stored locally only — never sent to any server</p>
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button onClick={onClose} style={{ flex: 1, padding: "10px 0", fontSize: 13, fontWeight: 500, background: "var(--bg-btn-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-default)", borderRadius: 8, cursor: "pointer" }}>Cancel</button>
        <button onClick={() => {
          onSave(
            { name, email },
            { address_line: addressLine, city, state: addrState, zip },
            cardNickname ? { nickname: cardNickname, card_type: "visa", is_virtual: isVirtual, last_four: lastFour } : null,
          );
        }} style={{ flex: 2, padding: "10px 0", fontSize: 13, fontWeight: 600, background: "var(--bg-btn-primary)", color: "var(--text-on-primary)", border: "none", borderRadius: 8, cursor: "pointer" }}>Save Details</button>
      </div>
    </motion.div>
  );
}

// ── Main App ───────────────────────────────────────────
export default function CliqApp() {
  const [messages, setMessages] = useState<ChatMsg[]>(() => {
    try {
      const saved = localStorage.getItem("cliq_messages");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [products, setProducts] = useState<UIProduct[]>(() => {
    try {
      const saved = localStorage.getItem("cliq_products");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [buyTarget, setBuyTarget] = useState<UIProduct | null>(null);
  const [tab, setTab] = useState("products");
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus | null>(null);
  const [purchaseAlerts, setPurchaseAlerts] = useState<PurchaseAlert[]>([]);
  const [hasSearched, setHasSearched] = useState(() => {
    try {
      return localStorage.getItem("cliq_has_searched") === "true";
    } catch { return false; }
  });
  const [profile, setProfile] = useState<UserProfile>(() => {
    const defaults: UserProfile = {
      id: "default_user", price_sensitivity: "balanced", shipping_preference: "normal",
      preferred_brands: [], saved_card: null,
      personal_info: { name: "", email: "" },
      shipping_address: { address_line: "", city: "", state: "", zip: "" },
      purchase_history: [], watchlist: [], search_history: [],
    };
    try {
      const saved = localStorage.getItem("cliq_profile_v2");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!["fastest", "normal", "cheapest"].includes(parsed.shipping_preference)) parsed.shipping_preference = "normal";
        if (!["budget", "balanced", "premium"].includes(parsed.price_sensitivity)) parsed.price_sensitivity = "balanced";
        return {
          ...defaults, ...parsed,
          personal_info: { ...defaults.personal_info, ...(parsed.personal_info || {}) },
          shipping_address: { ...defaults.shipping_address, ...(parsed.shipping_address || {}) },
          search_history: parsed.search_history || [],
          watchlist: (parsed.watchlist || []).map((w: WatchlistItem) => ({
            product_id: w.product_id, product_title: w.product_title,
            current_price: w.current_price, target_price: w.target_price ?? null,
            added_at: w.added_at || new Date().toISOString(),
            price_history: w.price_history || [{ price: w.current_price, date: new Date().toISOString() }],
            brand: w.brand || "", category: w.category || "", source: w.source || "",
            url: w.url || "", shipping_eta: w.shipping_eta || "",
          })),
        };
      }
    } catch { /* ignore corrupted localStorage */ }
    return defaults;
  });
  const msgEnd = useRef<HTMLDivElement>(null);
  const idRef = useRef((() => {
    try {
      const saved = localStorage.getItem("cliq_msg_id_counter");
      return saved ? parseInt(saved, 10) : 0;
    } catch { return 0; }
  })());
  const mkId = () => {
    const next = idRef.current + 1;
    idRef.current = next;
    localStorage.setItem("cliq_msg_id_counter", String(next));
    return `m${next}`;
  };

  // Persist profile
  useEffect(() => {
    localStorage.setItem("cliq_profile_v2", JSON.stringify(profile));
  }, [profile]);

  // Persist messages
  useEffect(() => {
    localStorage.setItem("cliq_messages", JSON.stringify(messages));
  }, [messages]);

  // Persist products
  useEffect(() => {
    localStorage.setItem("cliq_products", JSON.stringify(products));
  }, [products]);

  // Persist search state
  useEffect(() => {
    localStorage.setItem("cliq_has_searched", String(hasSearched));
  }, [hasSearched]);

  useEffect(() => { msgEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  // Load tracking status when tracking tab is opened
  const loadTracking = useCallback(async () => {
    try {
      const [statusRes, alertsRes] = await Promise.all([
        fetch("/api/tracking/status").then(r => r.json()),
        fetch("/api/tracking/purchase-alerts").then(r => r.json()),
      ]);
      setTrackingStatus(statusRes);
      setPurchaseAlerts(alertsRes.alerts || []);
    } catch (e) { console.error("Tracking fetch error:", e); }
  }, []);

  useEffect(() => {
    if (tab === "tracking") loadTracking();
  }, [tab, loadTracking]);

  // Heartbeat: keep backend tracking alive while user is on the site
  useEffect(() => {
    const interval = setInterval(() => {
      fetch("/api/tracking/heartbeat", { method: "POST" }).catch(() => {});
    }, 5 * 60 * 1000); // every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    if (!hasSearched) {
      setHasSearched(true);
      setMessages([{ id: "w", role: "agent", text: 'Searching for the best options for you...', options: [], products: [] }]);
    }
    const userMsg: ChatMsg = { id: mkId(), role: "user", text, options: [], products: [] };
    setMessages(p => [...p, userMsg]);
    setLoading(true);
    try {
      const history = messages.filter(m => m.role !== "follow_up").slice(-8).map(m => ({ role: m.role, text: m.text }));
      const result = await searchBackend(text, profile, history);

      // Record search in history
      setProfile(prev => ({
        ...prev,
        search_history: [
          { query: text, timestamp: new Date().toISOString(), result_count: result.products.length },
          ...prev.search_history,
        ].slice(0, 50), // keep last 50 searches
      }));

      if (result.ambiguous && result.follow_up_question) {
        setMessages(p => [...p, { id: mkId(), role: "follow_up", text: result.follow_up_question!, options: result.follow_up_options, products: [] }]);
      } else {
        setProducts(result.products);
        setTab("products");
        setMessages(p => [...p, { id: mkId(), role: "agent", text: result.summary, options: [], products: result.products }]);

        // Update prices for any tracked products
        result.products.forEach((rp: UIProduct) => {
          setProfile(prev => {
            const tracked = prev.watchlist.find(w => w.product_id === rp.id);
            if (tracked && tracked.current_price !== rp.price) {
              return {
                ...prev,
                watchlist: prev.watchlist.map(w =>
                  w.product_id === rp.id
                    ? { ...w, current_price: rp.price, price_history: [...w.price_history, { price: rp.price, date: new Date().toISOString() }] }
                    : w
                ),
              };
            }
            return prev;
          });
        });
      }
    } catch {
      setMessages(p => [...p, { id: mkId(), role: "agent", text: "Something went wrong. Please try again.", options: [], products: [] }]);
    }
    setLoading(false);
  }, [messages, loading, profile, hasSearched]);

  const handleBuy = (product: UIProduct) => setBuyTarget(product);
  const handleWatch = (product: UIProduct) => {
    const existing = profile.watchlist.find(w => w.product_id === product.id);
    if (existing) {
      // Update price tracking if price changed
      if (existing.current_price !== product.price) {
        setProfile(p => ({
          ...p,
          watchlist: p.watchlist.map(w =>
            w.product_id === product.id
              ? { ...w, current_price: product.price, price_history: [...w.price_history, { price: product.price, date: new Date().toISOString() }] }
              : w
          ),
        }));
        setMessages(p => [...p, { id: mkId(), role: "agent", text: `Price updated for "${product.title}": $${existing.current_price.toFixed(2)} → $${product.price.toFixed(2)}`, options: [], products: [] }]);
      } else {
        setMessages(p => [...p, { id: mkId(), role: "agent", text: `"${product.title}" is already on your watchlist.`, options: [], products: [] }]);
      }
    } else {
      setProfile(p => ({
        ...p,
        watchlist: [...p.watchlist, {
          product_id: product.id, product_title: product.title,
          current_price: product.price, target_price: null,
          added_at: new Date().toISOString(),
          price_history: [{ price: product.price, date: new Date().toISOString() }],
          brand: product.brand, category: product.category,
          source: product.source, url: product.url,
          shipping_eta: product.shipping_eta,
        }],
      }));
      setMessages(p => [...p, { id: mkId(), role: "agent", text: `Added "${product.title}" to your watchlist. I'll keep an eye on the price for you.`, options: [], products: [] }]);
    }
  };
  const handlePurchaseConfirm = (product: UIProduct, cardName: string) => {
    recordPurchase(product, cardName);
    setProfile(p => ({ ...p, purchase_history: [...p.purchase_history, { product_id: product.id, product_title: product.title, price: product.price, category: product.category, card_used: cardName, timestamp: new Date().toISOString() }] }));
    setMessages(p => [...p, { id: mkId(), role: "agent", text: `Order placed for ${product.title} at $${product.price.toFixed(2)}! 🎉 (Simulated — no real charge)`, options: [], products: [] }]);
  };
  const saveCard = (card: NonNullable<UserProfile["saved_card"]>) => setProfile(p => ({ ...p, saved_card: card }));
  const savePersonalInfo = (info: PersonalInfo) => setProfile(p => ({ ...p, personal_info: info }));
  const saveAddress = (addr: ShippingAddress) => setProfile(p => ({ ...p, shipping_address: addr }));
  const totalSpent = profile.purchase_history.reduce((s, p) => s + p.price, 0);
  const byCat: Record<string, number> = {};
  profile.purchase_history.forEach(p => { byCat[p.category || "other"] = (byCat[p.category || "other"] || 0) + p.price; });

  // ── Google-style Intro Page ──────────────────────────
  if (!hasSearched) {
    return (
      <div style={{
        height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: "var(--bg-page)", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        transition: "background 0.3s ease", position: "relative",
      }}>
        {/* Top-right controls */}
        <div style={{ position: "absolute", top: 20, right: 24, display: "flex", alignItems: "center", gap: 12 }}>
          <ThemeToggle />
        </div>

        {/* Centered content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: 600, padding: "0 24px" }}
        >
          {/* Logo */}
          <div style={{ marginBottom: 40, textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 48 }}>🛒</span>
              <span style={{
                fontSize: 56, fontWeight: 700, color: "var(--text-primary)",
                letterSpacing: -2,
              }}>Cliq</span>
            </div>
            <p style={{ fontSize: 16, color: "var(--text-muted)", fontWeight: 400 }}>
              Your AI shopping assistant
            </p>
          </div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            style={{ width: "100%", marginBottom: 24 }}
          >
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              background: "var(--bg-surface)", border: "1px solid var(--border-default)",
              borderRadius: 9999, padding: "12px 20px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              transition: "box-shadow 0.2s, border-color 0.2s, background 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)"; }}
            >
              <span style={{ fontSize: 18, color: "var(--text-muted)", flexShrink: 0 }}>🔍</span>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); setInput(""); } }}
                placeholder="Describe what you're looking for..."
                autoFocus
                style={{
                  flex: 1, border: "none", outline: "none", fontSize: 16, background: "transparent",
                  color: "var(--text-primary)", lineHeight: 1.5,
                }}
              />
              <motion.button
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => { send(input); setInput(""); }}
                disabled={loading || !input.trim()}
                style={{
                  background: loading || !input.trim() ? "var(--bg-btn-primary-disabled)" : "var(--bg-btn-primary)",
                  color: "var(--text-on-primary)", border: "none", borderRadius: 9999,
                  padding: "8px 20px", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
                  fontSize: 14, flexShrink: 0,
                }}
              >
                Search
              </motion.button>
            </div>
          </motion.div>

          {/* Suggestion Chips */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}
          >
            {["I need a warm winter jacket", "Budget monitor for home office", "Carry-on suitcase under $150", "Cheap reliable headphones"].map(s => (
              <motion.button
                key={s}
                whileHover={{ scale: 1.04, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
                whileTap={{ scale: 0.97 }}
                onClick={() => { setInput(""); send(s); }}
                style={{
                  fontSize: 13, color: "var(--text-secondary)", background: "var(--bg-surface)",
                  border: "1px solid var(--border-default)", borderRadius: 9999,
                  padding: "8px 16px", cursor: "pointer", fontWeight: 500,
                  transition: "background 0.2s, border-color 0.2s",
                }}
              >
                {s}
              </motion.button>
            ))}
          </motion.div>
        </motion.div>

        {/* Footer */}
        <div style={{ position: "absolute", bottom: 24, color: "var(--text-faint)", fontSize: 12 }}>
          Powered by AI &middot; Find the best deals in seconds
        </div>
      </div>
    );
  }

  // ── Post-Search Results Layout ─────────────────────
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-page)", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", transition: "background 0.2s ease" }}>
      {/* Header */}
      <header style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border-default)", padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, transition: "background 0.2s, border-color 0.2s" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setHasSearched(false); setProducts([]); setMessages([]); setInput(""); localStorage.removeItem("cliq_has_searched"); localStorage.removeItem("cliq_messages"); localStorage.removeItem("cliq_products"); localStorage.removeItem("cliq_msg_id_counter"); }}
            style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            <span style={{ fontSize: 22 }}>🛒</span>
            <span style={{ fontWeight: 700, fontSize: 18, color: "var(--text-primary)" }}>Cliq</span>
          </motion.button>
          {/* Compact search bar in header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginLeft: 16,
            background: "var(--bg-muted)", border: "1px solid var(--border-default)",
            borderRadius: 9999, padding: "6px 14px", width: 340,
            transition: "background 0.2s, border-color 0.2s",
          }}>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>🔍</span>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); setInput(""); } }}
              placeholder="Search for products..."
              style={{
                flex: 1, border: "none", outline: "none", fontSize: 13, background: "transparent",
                color: "var(--text-primary)",
              }}
            />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => { send(input); setInput(""); }}
              disabled={loading || !input.trim()}
              style={{
                background: "none", border: "none", cursor: loading ? "not-allowed" : "pointer",
                fontSize: 13, color: loading || !input.trim() ? "var(--text-faint)" : "var(--text-accent)",
                fontWeight: 600, padding: "2px 4px",
              }}
            >
              Go
            </motion.button>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)", background: "var(--bg-muted)", padding: "4px 10px", borderRadius: 99 }}>
            💰 ${totalSpent.toFixed(2)} spent
          </span>
          {profile.watchlist.length > 0 && (
            <span style={{ fontSize: 12, color: "var(--text-muted)", background: "var(--bg-muted)", padding: "4px 10px", borderRadius: 99 }}>
              👁️ {profile.watchlist.length} watching
            </span>
          )}
          <ThemeToggle />
        </div>
      </header>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Chat */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          style={{ flex: "0 0 38%", display: "flex", flexDirection: "column", borderRight: "1px solid var(--border-default)" }}
        >
          <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map(msg => (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-start", gap: 8 }}>
                {msg.role !== "user" && <div style={{ width: 28, height: 28, borderRadius: 99, background: "var(--bg-bot-avatar)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🤖</div>}
                <div style={{
                  maxWidth: "80%", padding: "10px 14px", borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: msg.role === "user" ? "var(--bg-user-msg)" : "var(--bg-agent-msg)", color: msg.role === "user" ? "var(--text-on-primary)" : "var(--text-primary)",
                  border: msg.role === "user" ? "none" : "1px solid var(--border-default)", fontSize: 14, lineHeight: 1.5, transition: "background 0.2s, border-color 0.2s, color 0.2s",
                }}>
                  {msg.text}
                  {msg.options && msg.options.length > 0 && (
                    <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                      {msg.options.map(opt => (
                        <motion.button key={opt} whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.03 }}
                          onClick={() => send(opt)}
                          style={{ background: "var(--bg-option-btn)", color: "var(--text-accent)", border: "1px solid var(--border-option)", borderRadius: 99, padding: "5px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          {opt}
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ width: 28, height: 28, borderRadius: 99, background: "var(--bg-bot-avatar)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🤖</div>
                <div style={{ background: "var(--bg-agent-msg)", border: "1px solid var(--border-default)", borderRadius: 16, padding: "10px 16px", fontSize: 14, color: "var(--text-muted)" }}>
                  <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }}>Searching for the best options...</motion.span>
                </div>
              </motion.div>
            )}
            <div ref={msgEnd} />
          </div>
          {/* Quick suggestions in chat */}
          <div style={{ padding: "8px 16px", borderTop: "1px solid var(--border-default)", background: "var(--bg-surface)", transition: "background 0.2s, border-color 0.2s" }}>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {["I need a warm winter jacket", "Budget monitor for home office", "Carry-on suitcase under $150", "Cheap reliable headphones"].map(s => (
                <button key={s} onClick={() => send(s)}
                  style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--bg-suggestion)", border: "1px solid var(--border-default)", borderRadius: 99, padding: "3px 10px", cursor: "pointer" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Right Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}
        >
          <div style={{ display: "flex", borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface)", flexShrink: 0, transition: "background 0.2s, border-color 0.2s", overflowX: "auto" }}>
            {([["products", `Products (${products.length})`], ["history", `History (${profile.purchase_history.length})`], ["watchlist", `Watchlist (${profile.watchlist.length})`], ["tracking", "Tracking"], ["spending", "Spending"], ["searches", `Searches (${profile.search_history.length})`]] as const).map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)}
                style={{ flex: 1, padding: "10px 0", fontSize: 12, fontWeight: tab === k ? 600 : 400, color: tab === k ? "var(--text-accent)" : "var(--text-muted)", background: "none", border: "none", borderBottom: tab === k ? "2px solid var(--text-accent)" : "2px solid transparent", cursor: "pointer", whiteSpace: "nowrap" }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            <AnimatePresence mode="wait">
              {tab === "products" && (
                <motion.div key="prod" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
                  {products.length === 0 ? (
                    <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 40, color: "var(--text-faint)" }}>
                      <div style={{ fontSize: 40, marginBottom: 8 }}>🔍</div>
                      <p>Your search results will appear here.</p>
                    </div>
                  ) : products.map(p => <ProductCard key={p.id} product={p} onBuy={handleBuy} onWatch={handleWatch} />)}
                </motion.div>
              )}
              {tab === "history" && (
                <motion.div key="hist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {profile.purchase_history.length === 0 ? (
                    <div style={{ textAlign: "center", padding: 40, color: "var(--text-faint)" }}>
                      <div style={{ fontSize: 40, marginBottom: 8 }}>📦</div>
                      <p>No purchases yet. Try the one-click buy!</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {profile.purchase_history.map((p, i) => (
                        <div key={i} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 10, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", transition: "background 0.2s, border-color 0.2s" }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{p.product_title}</div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.card_used} · {new Date(p.timestamp).toLocaleDateString()}</div>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>${p.price.toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
              {tab === "spending" && (
                <motion.div key="spend" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Summary Cards Row */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                    {[
                      { label: "Total Spent", value: `$${totalSpent.toFixed(2)}`, color: "#6366f1" },
                      { label: "Purchases", value: `${profile.purchase_history.length}`, color: "#10b981" },
                      { label: "Watchlist", value: `${profile.watchlist.length}`, color: "#f59e0b" },
                    ].map(c => (
                      <div key={c.label} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 10, padding: "14px 12px", textAlign: "center", borderTop: `3px solid ${c.color}` }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{c.value}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{c.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* By Category */}
                  {Object.keys(byCat).length > 0 && (
                    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, padding: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>Spending by Category</div>
                      {Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([cat, amount]) => (
                        <div key={cat} style={{ padding: "5px 0" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                            <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{getCategoryEmoji(cat)} {cat.replace(/_/g, " ")}</span>
                            <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>${amount.toFixed(2)}</span>
                          </div>
                          <div style={{ width: "100%", height: 6, background: "var(--bg-progress-track)", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ height: "100%", background: "linear-gradient(90deg, #6366f1, #a78bfa)", borderRadius: 3, width: `${Math.min((amount / (totalSpent || 1)) * 100, 100)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Preferences & Personal Info */}
                  <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, padding: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>Your Preferences</div>
                    {([["Price Sensitivity", "price_sensitivity", ["budget", "balanced", "premium"]], ["Shipping", "shipping_preference", ["fastest", "normal", "cheapest"]]] as const).map(([label, key, opts]) => (
                      <div key={key} style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 3 }}>{label}</div>
                        <div style={{ display: "flex", gap: 4 }}>
                          {opts.map(o => {
                            const isActive = profile[key] === o;
                            return (
                              <button key={o} onClick={() => setProfile(p => ({ ...p, [key]: o }))}
                                style={{ flex: 1, padding: "5px 0", fontSize: 11, fontWeight: isActive ? 600 : 400, background: isActive ? "var(--bg-option-btn)" : "var(--bg-suggestion)", color: isActive ? "var(--text-accent)" : "var(--text-muted)", border: isActive ? "1px solid var(--border-option)" : "1px solid var(--border-default)", borderRadius: 6, cursor: "pointer", textTransform: "capitalize" }}>
                                {o}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    <button onClick={() => setBuyTarget({ id: "__edit__", title: "Edit Info", brand: "", price: 0, original_price: null, shipping_eta: "", rating: 0, reviews: 0, tag: "", explanation: "", source: "", url: "", category: "", coupons: 0, specs: {} })}
                      style={{ width: "100%", marginTop: 8, padding: "7px 0", fontSize: 11, fontWeight: 600, background: "var(--bg-btn-secondary)", color: "var(--text-accent)", border: "1px solid var(--border-default)", borderRadius: 8, cursor: "pointer" }}>
                      Edit Details
                    </button>
                  </div>
                </motion.div>
              )}
              {tab === "watchlist" && (
                <motion.div key="watch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {profile.watchlist.length === 0 ? (
                    <div style={{ textAlign: "center", padding: 40, color: "var(--text-faint)" }}>
                      <div style={{ fontSize: 40, marginBottom: 8 }}>👁️</div>
                      <p>No items on your watchlist. Click the 👁️ button on any product to watch it.</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {/* Price Drop Summary */}
                      {(() => {
                        const drops = profile.watchlist.filter(w => {
                          const first = w.price_history?.[0]?.price ?? w.current_price;
                          return w.current_price < first;
                        });
                        const totalSavings = drops.reduce((s, w) => s + ((w.price_history?.[0]?.price ?? w.current_price) - w.current_price), 0);
                        return drops.length > 0 ? (
                          <div style={{ background: "linear-gradient(135deg, #ecfdf5, #d1fae5)", border: "1px solid #6ee7b7", borderRadius: 12, padding: 14 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: "#065f46", textTransform: "uppercase", letterSpacing: 0.5 }}>Price Drops Detected</div>
                                <div style={{ fontSize: 13, color: "#047857", marginTop: 2 }}>{drops.length} item{drops.length > 1 ? "s" : ""} dropped in price</div>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 20, fontWeight: 700, color: "#059669" }}>${totalSavings.toFixed(2)}</div>
                                <div style={{ fontSize: 11, color: "#047857" }}>potential savings</div>
                              </div>
                            </div>
                          </div>
                        ) : null;
                      })()}

                      {profile.watchlist.map((w, i) => {
                        const firstPrice = w.price_history?.[0]?.price ?? w.current_price;
                        const priceDiff = w.current_price - firstPrice;
                        const pctChange = firstPrice > 0 ? ((priceDiff / firstPrice) * 100) : 0;
                        const hitTarget = w.target_price !== null && w.current_price <= w.target_price;
                        return (
                          <div key={i} style={{
                            background: "var(--bg-surface)", borderRadius: 10, padding: 14,
                            border: hitTarget ? "2px solid #10b981" : priceDiff < 0 ? "1px solid #6ee7b7" : "1px solid var(--border-default)",
                            transition: "background 0.2s, border-color 0.2s",
                          }}>
                            {hitTarget && (
                              <div style={{ background: "#dcfce7", color: "#166534", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 6, marginBottom: 8, display: "inline-block" }}>
                                TARGET PRICE REACHED — BUY NOW!
                              </div>
                            )}
                            {!hitTarget && priceDiff < 0 && (
                              <div style={{ background: "#ecfdf5", color: "#065f46", fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6, marginBottom: 8, display: "inline-block" }}>
                                PRICE DROP: ${Math.abs(priceDiff).toFixed(2)} off ({Math.abs(pctChange).toFixed(1)}%)
                              </div>
                            )}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{w.product_title}</div>
                                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                                  {w.brand && <span>{w.brand} · </span>}
                                  {w.source && <span>{w.source} · </span>}
                                  {getCategoryEmoji(w.category || "")} {(w.category || "").replace(/_/g, " ")}
                                </div>
                              </div>
                              <button onClick={() => setProfile(p => ({ ...p, watchlist: p.watchlist.filter((_, j) => j !== i) }))}
                                style={{ fontSize: 12, color: "var(--text-danger)", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}>Remove</button>
                            </div>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
                              <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>${w.current_price.toFixed(2)}</span>
                              {priceDiff !== 0 && (
                                <span style={{ fontSize: 12, fontWeight: 600, color: priceDiff < 0 ? "#10b981" : "#ef4444" }}>
                                  {priceDiff < 0 ? "▼" : "▲"} ${Math.abs(priceDiff).toFixed(2)} ({Math.abs(pctChange).toFixed(1)}%)
                                </span>
                              )}
                              {firstPrice !== w.current_price && (
                                <span style={{ fontSize: 11, color: "var(--text-faint)", textDecoration: "line-through" }}>${firstPrice.toFixed(2)}</span>
                              )}
                            </div>

                            {/* Target Price Input */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, background: "var(--bg-muted)", borderRadius: 8, padding: "6px 10px" }}>
                              <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>Target: $</span>
                              <input
                                type="number"
                                step="0.01"
                                value={w.target_price ?? ""}
                                placeholder={`e.g. ${(w.current_price * 0.85).toFixed(2)}`}
                                onChange={e => {
                                  const val = e.target.value ? parseFloat(e.target.value) : null;
                                  setProfile(p => ({
                                    ...p,
                                    watchlist: p.watchlist.map((item, j) => j === i ? { ...item, target_price: val } : item),
                                  }));
                                }}
                                style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 12, color: "var(--text-primary)", fontWeight: 600, minWidth: 0 }}
                              />
                              {w.target_price !== null && w.target_price > 0 && (
                                <span style={{ fontSize: 10, color: w.current_price <= w.target_price ? "#10b981" : "#f59e0b", fontWeight: 600 }}>
                                  {w.current_price <= w.target_price ? "Reached!" : `$${(w.current_price - w.target_price).toFixed(2)} away`}
                                </span>
                              )}
                            </div>

                            {w.shipping_eta && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>📦 {w.shipping_eta}</div>}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                              <span style={{ fontSize: 11, color: "var(--text-faint)" }}>
                                Tracking since {new Date(w.added_at).toLocaleDateString()} · {w.price_history?.length || 1} price point{(w.price_history?.length || 1) !== 1 ? "s" : ""}
                              </span>
                              {w.url && (
                                <button onClick={() => window.open(w.url, "_blank")}
                                  style={{ fontSize: 11, color: "var(--text-accent)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>View</button>
                              )}
                            </div>
                            {/* Mini price history */}
                            {w.price_history && w.price_history.length > 1 && (
                              <div style={{ marginTop: 8 }}>
                                <div style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 4 }}>Price History</div>
                                <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 32 }}>
                                  {w.price_history.map((ph, j) => {
                                    const prices = w.price_history.map(p => p.price);
                                    const min = Math.min(...prices);
                                    const max = Math.max(...prices);
                                    const range = max - min || 1;
                                    const height = Math.max(4, ((ph.price - min) / range) * 28);
                                    return (
                                      <div key={j} title={`$${ph.price.toFixed(2)} on ${new Date(ph.date).toLocaleDateString()}`}
                                        style={{ flex: 1, height, background: ph.price <= firstPrice ? "#10b981" : "#ef4444", borderRadius: 2, minWidth: 3, maxWidth: 20 }} />
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
              {tab === "tracking" && (
                <motion.div key="track" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 20 }}>📡</span>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Live Price Tracking</div>
                        <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Watchlist + past purchases monitored automatically</div>
                      </div>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={loadTracking}
                      style={{ fontSize: 11, padding: "4px 10px", borderRadius: 99, background: "var(--bg-option-btn)", color: "var(--text-accent)", border: "1px solid var(--border-option)", cursor: "pointer", fontWeight: 600 }}>
                      Refresh
                    </motion.button>
                  </div>

                  {/* Tracking Status Cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                    <div style={{
                      background: trackingStatus?.tracking_running ? "linear-gradient(135deg, #064e3b, #065f46)" : "linear-gradient(135deg, #78350f, #92400e)",
                      borderRadius: 12, padding: 14, color: "#fff", textAlign: "center",
                    }}>
                      <div style={{ fontSize: 24 }}>{trackingStatus?.tracking_running ? "🟢" : "🔴"}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{trackingStatus?.tracking_running ? "Active" : "Paused"}</div>
                      <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>Tracking Status</div>
                    </div>
                    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, padding: 14, textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{trackingStatus?.watchlist_count ?? profile.watchlist.length}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Watchlist Items</div>
                      <div style={{ fontSize: 10, color: "var(--text-faint)" }}>Every {trackingStatus?.watchlist_interval_minutes ?? 5} min</div>
                    </div>
                    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, padding: 14, textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{trackingStatus?.purchase_count ?? profile.purchase_history.length}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Purchases Tracked</div>
                      <div style={{ fontSize: 10, color: "var(--text-faint)" }}>Every {trackingStatus?.purchase_interval_minutes ?? 30} min</div>
                    </div>
                  </div>

                  {/* Activity Status */}
                  <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, padding: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>Activity Status</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                        <span style={{ color: "var(--text-muted)" }}>User Active</span>
                        <span style={{ color: trackingStatus?.user_active ? "#10b981" : "#ef4444", fontWeight: 600 }}>
                          {trackingStatus?.user_active ? "Yes" : "No — tracking paused"}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                        <span style={{ color: "var(--text-muted)" }}>Last Active</span>
                        <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                          {trackingStatus?.last_active ? new Date(trackingStatus.last_active).toLocaleTimeString() : "—"}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                        <span style={{ color: "var(--text-muted)" }}>Tracking pauses after</span>
                        <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>24h of inactivity</span>
                      </div>
                      {trackingStatus?.hours_until_pause !== undefined && trackingStatus.hours_until_pause > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                          <span style={{ color: "var(--text-muted)" }}>Time until pause</span>
                          <span style={{ color: "#f59e0b", fontWeight: 600 }}>{trackingStatus.hours_until_pause.toFixed(1)}h remaining</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Purchase Price Alerts */}
                  {purchaseAlerts.length > 0 && (
                    <div style={{ background: "linear-gradient(135deg, #ecfdf5, #d1fae5)", border: "1px solid #6ee7b7", borderRadius: 12, padding: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#065f46", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                        Past Purchase Price Drops
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {purchaseAlerts.map(alert => (
                          <div key={alert.product_id} style={{ background: "rgba(255,255,255,0.7)", borderRadius: 8, padding: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "#065f46" }}>{alert.product_name}</div>
                                <div style={{ fontSize: 11, color: "#047857", marginTop: 2 }}>
                                  You paid ${alert.purchased_price.toFixed(2)} — now ${alert.current_market_price.toFixed(2)}
                                </div>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 16, fontWeight: 700, color: "#059669" }}>-${alert.savings.toFixed(2)}</div>
                                <div style={{ fontSize: 10, color: "#047857" }}>{alert.drop_percent.toFixed(1)}% drop</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Tracking Activity */}
                  <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, padding: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10 }}>Recent Tracking Activity</div>
                    {(!trackingStatus?.recent_activity || trackingStatus.recent_activity.length === 0) ? (
                      <div style={{ textAlign: "center", padding: 20, color: "var(--text-faint)", fontSize: 13 }}>
                        No tracking activity yet. Add items to your watchlist or make purchases to start tracking.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {trackingStatus.recent_activity.slice().reverse().slice(0, 15).map((entry, i) => {
                          const isUpdate = entry.type.includes("update") || entry.type.includes("drop");
                          const isPaused = entry.type.includes("paused");
                          return (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: i < 14 ? "1px solid var(--border-default)" : "none" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 12 }}>
                                  {isPaused ? "⏸️" : isUpdate ? "💰" : "🔍"}
                                </span>
                                <div>
                                  <div style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: isUpdate ? 600 : 400 }}>
                                    {entry.product_name || entry.reason || entry.type.replace(/_/g, " ")}
                                  </div>
                                  {entry.old_price !== undefined && entry.new_price !== undefined && (
                                    <div style={{ fontSize: 11, color: entry.new_price < entry.old_price ? "#10b981" : "#ef4444" }}>
                                      ${entry.old_price.toFixed(2)} → ${entry.new_price.toFixed(2)} ({entry.change !== undefined && entry.change < 0 ? "" : "+"}{entry.change?.toFixed(2)})
                                    </div>
                                  )}
                                </div>
                              </div>
                              <span style={{ fontSize: 10, color: "var(--text-faint)" }}>
                                {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* How it works */}
                  <div style={{ background: "var(--bg-muted)", borderRadius: 12, padding: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>How Tracking Works</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "var(--text-secondary)" }}>
                      <div>📋 <strong>Watchlist items</strong> — prices checked every {trackingStatus?.watchlist_interval_minutes ?? 5} minutes</div>
                      <div>🛍️ <strong>Past purchases</strong> — market prices rechecked every {trackingStatus?.purchase_interval_minutes ?? 30} minutes</div>
                      <div>⏰ <strong>Active user only</strong> — tracking pauses if you're away for 24 hours</div>
                      <div>🔔 <strong>Alerts</strong> — notified when prices drop on items you bought or are watching</div>
                    </div>
                  </div>
                </motion.div>
              )}
              {tab === "searches" && (
                <motion.div key="srch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {profile.search_history.length === 0 ? (
                    <div style={{ textAlign: "center", padding: 40, color: "var(--text-faint)" }}>
                      <div style={{ fontSize: 40, marginBottom: 8 }}>🔍</div>
                      <p>Your search history will appear here.</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Recent Searches</span>
                        <button onClick={() => setProfile(p => ({ ...p, search_history: [] }))}
                          style={{ fontSize: 11, color: "var(--text-danger)", background: "none", border: "none", cursor: "pointer" }}>Clear All</button>
                      </div>
                      {profile.search_history.map((s, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 8, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", transition: "background 0.2s, border-color 0.2s" }}
                          onClick={() => send(s.query)}
                          whileHover={{ x: 2 }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 14, color: "var(--text-muted)" }}>🔍</span>
                            <div>
                              <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{s.query}</div>
                              <div style={{ fontSize: 11, color: "var(--text-faint)" }}>
                                {new Date(s.timestamp).toLocaleDateString()} {new Date(s.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                {s.result_count > 0 && <span> · {s.result_count} results</span>}
                              </div>
                            </div>
                          </div>
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Re-search</span>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Buy Modal / Edit Details Modal */}
      <AnimatePresence>
        {buyTarget && buyTarget.id === "__edit__" ? (
          <motion.div key="edit-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "var(--overlay)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}
            onClick={() => setBuyTarget(null)}>
            <EditDetailsModal
              personalInfo={profile.personal_info}
              shippingAddress={profile.shipping_address}
              savedCard={profile.saved_card}
              onSave={(info, addr, card) => {
                savePersonalInfo(info);
                saveAddress(addr);
                if (card) saveCard(card);
                setBuyTarget(null);
              }}
              onClose={() => setBuyTarget(null)}
            />
          </motion.div>
        ) : buyTarget && (
          <BuyModal product={buyTarget} savedCard={profile.saved_card}
            personalInfo={profile.personal_info} shippingAddress={profile.shipping_address}
            onConfirm={handlePurchaseConfirm} onClose={() => setBuyTarget(null)}
            onSaveCard={saveCard} onSavePersonalInfo={savePersonalInfo} onSaveAddress={saveAddress} />
        )}
      </AnimatePresence>
    </div>
  );
}
