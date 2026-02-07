import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

interface UserProfile {
  id: string; price_sensitivity: string; shipping_preference: string;
  preferred_brands: string[]; saved_card: { nickname: string; card_type: string; is_virtual: boolean } | null;
  purchase_history: { product_id: string; product_title: string; price: number; category: string; card_used: string; timestamp: string }[];
  watchlist: { product_id: string; product_title: string; current_price: number; target_price: number | null }[];
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

// ── Tag Colors ─────────────────────────────────────────
const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  "Best overall": { bg: "#dbeafe", text: "#1e40af" },
  "Best value": { bg: "#d1fae5", text: "#065f46" },
  "Fastest shipping": { bg: "#fef3c7", text: "#92400e" },
  "Budget pick": { bg: "#e0e7ff", text: "#3730a3" },
  "Premium pick": { bg: "#fae8ff", text: "#86198f" },
};

// ── Star Rating ────────────────────────────────────────
function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.3;
  return (
    <span style={{ color: "#f59e0b", fontSize: 14, letterSpacing: 1 }}>
      {"★".repeat(full)}{half ? "½" : ""}{"☆".repeat(5 - full - (half ? 1 : 0))}
      <span style={{ color: "#6b7280", fontSize: 12, marginLeft: 4 }}>{rating}</span>
    </span>
  );
}

// ── Product Card ───────────────────────────────────────
function ProductCard({ product: p, onBuy, onWatch }: { product: UIProduct; onBuy: (p: UIProduct) => void; onWatch: (p: UIProduct) => void }) {
  const [showLink, setShowLink] = useState(false);
  const tc = TAG_COLORS[p.tag] || TAG_COLORS["Best overall"];
  return (
    <motion.div
      layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: "0 8px 25px rgba(0,0,0,0.1)" }}
      transition={{ duration: 0.2 }}
      style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #e5e7eb", position: "relative", display: "flex", flexDirection: "column", gap: 8 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ background: tc.bg, color: tc.text, fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 99, textTransform: "uppercase", letterSpacing: 0.5 }}>{p.tag}</span>
        {p.coupons > 0 && <span style={{ fontSize: 11, color: "#059669", fontWeight: 500 }}>🏷️ {p.coupons} coupon{p.coupons > 1 ? "s" : ""}</span>}
      </div>
      <div style={{ background: `linear-gradient(135deg, ${tc.bg}, #f3f4f6)`, borderRadius: 8, height: 80, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
        {getCategoryEmoji(p.category)}
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, color: "#111827", lineHeight: 1.3 }}>{p.title}</div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>{p.brand}</div>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>${p.price.toFixed(2)}</span>
        {p.original_price && <span style={{ fontSize: 13, color: "#9ca3af", textDecoration: "line-through" }}>${p.original_price.toFixed(2)}</span>}
      </div>
      <Stars rating={p.rating} />
      <div style={{ fontSize: 12, color: "#6b7280" }}>📦 {p.shipping_eta} · {p.reviews.toLocaleString()} reviews</div>
      <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.4, margin: 0 }}>{p.explanation}</p>
      {Object.keys(p.specs).length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {Object.entries(p.specs).map(([k, v]) => (
            <span key={k} style={{ fontSize: 10, background: "#f3f4f6", color: "#374151", padding: "2px 6px", borderRadius: 4 }}>{v}</span>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
        <motion.button whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}
          onClick={() => onBuy(p)}
          style={{ flex: 1, background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "8px 0", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
        >⚡ One-Click Buy</motion.button>
        <motion.button whileTap={{ scale: 0.95 }}
          onClick={() => onWatch(p)}
          style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: 13 }}
        >👁️</motion.button>
        <motion.button whileTap={{ scale: 0.95 }}
          onClick={() => setShowLink(true)}
          style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: 13 }}
        >🔗</motion.button>
      </div>
      <AnimatePresence>
        {showLink && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ position: "absolute", bottom: 60, left: 16, right: 16, background: "#fffbeb", border: "1px solid #fbbf24", borderRadius: 8, padding: 10, fontSize: 12, zIndex: 10 }}
          >
            <div style={{ fontWeight: 600, color: "#92400e" }}>⚠️ You are leaving Cliq</div>
            <div style={{ color: "#78716c", marginTop: 2 }}>→ {p.source} ({(() => { try { return new URL(p.url).hostname; } catch { return p.url; } })()})</div>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <button onClick={() => window.open(p.url, "_blank")} style={{ fontSize: 11, background: "#f59e0b", color: "#fff", border: "none", borderRadius: 4, padding: "4px 10px", cursor: "pointer" }}>Continue</button>
              <button onClick={() => setShowLink(false)} style={{ fontSize: 11, background: "#e5e7eb", border: "none", borderRadius: 4, padding: "4px 10px", cursor: "pointer" }}>Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── One-Click Buy Modal ────────────────────────────────
function BuyModal({ product, savedCard, onConfirm, onClose, onSaveCard }: {
  product: UIProduct; savedCard: UserProfile["saved_card"];
  onConfirm: (p: UIProduct, card: string) => void; onClose: () => void;
  onSaveCard: (card: NonNullable<UserProfile["saved_card"]>) => void;
}) {
  const [step, setStep] = useState(savedCard ? "confirm" : "card");
  const [nickname, setNickname] = useState("Visa ending in 1234");
  const [isVirtual, setIsVirtual] = useState(false);
  const [success, setSuccess] = useState(false);
  const autofillFields = { name: "Alex Johnson", email: "alex@example.com", address: "5032 Forbes Ave, Pittsburgh, PA", card: nickname };

  if (success) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} style={{ background: "#fff", borderRadius: 16, padding: 32, textAlign: "center", maxWidth: 380 }}>
          <div style={{ fontSize: 48 }}>🎉</div>
          <h3 style={{ margin: "12px 0 4px", color: "#111827" }}>Order Placed!</h3>
          <p style={{ color: "#6b7280", fontSize: 14 }}>{product.title} — ${product.price.toFixed(2)}</p>
          <p style={{ color: "#9ca3af", fontSize: 12 }}>This is a simulated purchase. No real charge.</p>
          <button onClick={onClose} style={{ marginTop: 12, background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontWeight: 600, cursor: "pointer" }}>Done</button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={onClose}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} onClick={e => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 16, padding: 24, maxWidth: 400, width: "90%", maxHeight: "85vh", overflowY: "auto" }}>
        {step === "card" ? (
          <>
            <h3 style={{ margin: "0 0 4px", color: "#111827" }}>Set Up Payment</h3>
            <p style={{ color: "#6b7280", fontSize: 13, margin: "0 0 16px" }}>Save a card for one-click purchases</p>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Card Nickname</label>
            <input value={nickname} onChange={e => setNickname(e.target.value)} style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, marginTop: 4, marginBottom: 12, fontSize: 14, boxSizing: "border-box" }} />
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151", cursor: "pointer" }}>
              <input type="checkbox" checked={isVirtual} onChange={e => setIsVirtual(e.target.checked)} /> Use a virtual card
            </label>
            <p style={{ fontSize: 11, color: "#9ca3af", margin: "8px 0 0" }}>🔒 This is a simulation — no real card data is stored</p>
            <button onClick={() => { onSaveCard({ nickname, card_type: "visa", is_virtual: isVirtual }); setStep("confirm"); }}
              style={{ width: "100%", marginTop: 16, background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "10px 0", fontWeight: 600, cursor: "pointer" }}>Save & Continue</button>
          </>
        ) : (
          <>
            <h3 style={{ margin: "0 0 12px", color: "#111827" }}>Confirm Purchase</h3>
            <div style={{ background: "#f9fafb", borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{product.title}</div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>{product.brand} · {product.shipping_eta}</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>${product.price.toFixed(2)}</div>
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>Paying with: <strong>{savedCard?.nickname || nickname}</strong></div>
            <div style={{ background: "#eff6ff", borderRadius: 8, padding: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#1e40af", marginBottom: 4 }}>🔍 Fields we would auto-fill:</div>
              {Object.entries(autofillFields).map(([k, v]) => (
                <div key={k} style={{ fontSize: 11, color: "#374151", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#6b7280" }}>{k}:</span><span>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={onClose} style={{ flex: 1, background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 0", cursor: "pointer", fontWeight: 500 }}>Cancel</button>
              <motion.button whileTap={{ scale: 0.95 }}
                onClick={() => { setSuccess(true); onConfirm(product, savedCard?.nickname || nickname); }}
                style={{ flex: 2, background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "10px 0", fontWeight: 600, cursor: "pointer" }}>Confirm Purchase</motion.button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Main App ───────────────────────────────────────────
export default function CliqApp() {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: "w", role: "agent", text: 'Hi! I\'m your Cliq assistant. Tell me what you\'re looking for in plain English — like "I need a warm jacket for this Pittsburgh cold" — and I\'ll find the best options for you.', options: [], products: [] },
  ]);
  const [products, setProducts] = useState<UIProduct[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [buyTarget, setBuyTarget] = useState<UIProduct | null>(null);
  const [tab, setTab] = useState("products");
  const [profile, setProfile] = useState<UserProfile>(() => {
    const defaults = { id: "default_user", price_sensitivity: "balanced", shipping_preference: "normal", preferred_brands: [], saved_card: null, purchase_history: [], watchlist: [] };
    try {
      const saved = localStorage.getItem("cliq_profile_v2");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!["fastest", "normal", "cheapest"].includes(parsed.shipping_preference)) parsed.shipping_preference = "normal";
        if (!["budget", "balanced", "premium"].includes(parsed.price_sensitivity)) parsed.price_sensitivity = "balanced";
        return { ...defaults, ...parsed };
      }
    } catch {}
    return defaults;
  });
  const msgEnd = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);
  const mkId = () => `m${++idRef.current}`;

  // Persist profile
  useEffect(() => {
    localStorage.setItem("cliq_profile_v2", JSON.stringify(profile));
  }, [profile]);

  useEffect(() => { msgEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMsg = { id: mkId(), role: "user", text, options: [], products: [] };
    setMessages(p => [...p, userMsg]);
    setLoading(true);
    try {
      const history = messages.filter(m => m.role !== "follow_up").slice(-8).map(m => ({ role: m.role, text: m.text }));
      const result = await searchBackend(text, profile, history);

      if (result.ambiguous && result.follow_up_question) {
        setMessages(p => [...p, { id: mkId(), role: "follow_up", text: result.follow_up_question!, options: result.follow_up_options, products: [] }]);
      } else {
        setProducts(result.products);
        setTab("products");
        setMessages(p => [...p, { id: mkId(), role: "agent", text: result.summary, options: [], products: result.products }]);
      }
    } catch {
      setMessages(p => [...p, { id: mkId(), role: "agent", text: "Something went wrong. Please try again.", options: [], products: [] }]);
    }
    setLoading(false);
  }, [messages, loading, profile]);

  const handleBuy = (product: UIProduct) => setBuyTarget(product);
  const handleWatch = (product: UIProduct) => {
    setProfile(p => ({ ...p, watchlist: [...p.watchlist, { product_id: product.id, product_title: product.title, current_price: product.price, target_price: null }] }));
    setMessages(p => [...p, { id: mkId(), role: "agent", text: `Added "${product.title}" to your watchlist. I'll keep an eye on the price for you.`, options: [], products: [] }]);
  };
  const handlePurchaseConfirm = (product: UIProduct, cardName: string) => {
    recordPurchase(product, cardName);
    setProfile(p => ({ ...p, purchase_history: [...p.purchase_history, { product_id: product.id, product_title: product.title, price: product.price, category: product.category, card_used: cardName, timestamp: new Date().toISOString() }] }));
    setMessages(p => [...p, { id: mkId(), role: "agent", text: `Order placed for ${product.title} at $${product.price.toFixed(2)}! 🎉 (Simulated — no real charge)`, options: [], products: [] }]);
  };
  const saveCard = (card: NonNullable<UserProfile["saved_card"]>) => setProfile(p => ({ ...p, saved_card: card }));
  const totalSpent = profile.purchase_history.reduce((s, p) => s + p.price, 0);
  const byCat: Record<string, number> = {};
  profile.purchase_history.forEach(p => { byCat[p.category || "other"] = (byCat[p.category || "other"] || 0) + p.price; });

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Header */}
      <header style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 22 }}>🛒</span>
          <span style={{ fontWeight: 700, fontSize: 18, color: "#111827" }}>Cliq</span>
          <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: 4 }}>AI Shopping Agent</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: "#6b7280", background: "#f3f4f6", padding: "4px 10px", borderRadius: 99 }}>
            💰 ${totalSpent.toFixed(2)} spent
          </span>
          {profile.watchlist.length > 0 && (
            <span style={{ fontSize: 12, color: "#6b7280", background: "#f3f4f6", padding: "4px 10px", borderRadius: 99 }}>
              👁️ {profile.watchlist.length} watching
            </span>
          )}
        </div>
      </header>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Chat */}
        <div style={{ flex: "0 0 45%", display: "flex", flexDirection: "column", borderRight: "1px solid #e5e7eb" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map(msg => (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-start", gap: 8 }}>
                {msg.role !== "user" && <div style={{ width: 28, height: 28, borderRadius: 99, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🤖</div>}
                <div style={{
                  maxWidth: "80%", padding: "10px 14px", borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: msg.role === "user" ? "#2563eb" : "#fff", color: msg.role === "user" ? "#fff" : "#111827",
                  border: msg.role === "user" ? "none" : "1px solid #e5e7eb", fontSize: 14, lineHeight: 1.5,
                }}>
                  {msg.text}
                  {msg.options && msg.options.length > 0 && (
                    <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                      {msg.options.map(opt => (
                        <motion.button key={opt} whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.03 }}
                          onClick={() => send(opt)}
                          style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: 99, padding: "5px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
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
                <div style={{ width: 28, height: 28, borderRadius: 99, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🤖</div>
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "10px 16px", fontSize: 14, color: "#6b7280" }}>
                  <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }}>Searching for the best options...</motion.span>
                </div>
              </motion.div>
            )}
            <div ref={msgEnd} />
          </div>
          {/* Input */}
          <div style={{ padding: "10px 16px", borderTop: "1px solid #e5e7eb", background: "#fff" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); setInput(""); } }}
                placeholder="Describe what you're looking for..."
                style={{ flex: 1, padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 14, outline: "none" }}
              />
              <motion.button whileTap={{ scale: 0.9 }}
                onClick={() => { send(input); setInput(""); }}
                disabled={loading || !input.trim()}
                style={{ background: loading || !input.trim() ? "#93c5fd" : "#2563eb", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontSize: 14 }}>
                Send
              </motion.button>
            </div>
            <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
              {["I need a warm winter jacket", "Budget monitor for home office", "Carry-on suitcase under $150", "Cheap reliable headphones"].map(s => (
                <button key={s} onClick={() => setInput(s)}
                  style={{ fontSize: 11, color: "#6b7280", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 99, padding: "3px 10px", cursor: "pointer" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", background: "#fff", flexShrink: 0 }}>
            {([["products", `Products (${products.length})`], ["history", `History (${profile.purchase_history.length})`], ["spending", "Spending"], ["watchlist", `Watchlist (${profile.watchlist.length})`]] as const).map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)}
                style={{ flex: 1, padding: "10px 0", fontSize: 13, fontWeight: tab === k ? 600 : 400, color: tab === k ? "#2563eb" : "#6b7280", background: "none", border: "none", borderBottom: tab === k ? "2px solid #2563eb" : "2px solid transparent", cursor: "pointer" }}>
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
                    <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 40, color: "#9ca3af" }}>
                      <div style={{ fontSize: 40, marginBottom: 8 }}>🔍</div>
                      <p>Start a search to see product recommendations here.</p>
                    </div>
                  ) : products.map(p => <ProductCard key={p.id} product={p} onBuy={handleBuy} onWatch={handleWatch} />)}
                </motion.div>
              )}
              {tab === "history" && (
                <motion.div key="hist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {profile.purchase_history.length === 0 ? (
                    <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
                      <div style={{ fontSize: 40, marginBottom: 8 }}>📦</div>
                      <p>No purchases yet. Try the one-click buy!</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {profile.purchase_history.map((p, i) => (
                        <div key={i} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{p.product_title}</div>
                            <div style={{ fontSize: 12, color: "#6b7280" }}>{p.card_used} · {new Date(p.timestamp).toLocaleDateString()}</div>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>${p.price.toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
              {tab === "spending" && (
                <motion.div key="spend" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, textAlign: "center" }}>
                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Total Spent</div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: "#111827" }}>${totalSpent.toFixed(2)}</div>
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>{profile.purchase_history.length} purchase{profile.purchase_history.length !== 1 ? "s" : ""}</div>
                  </div>
                  {Object.keys(byCat).length > 0 && (
                    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 10 }}>By Category</div>
                      {Object.entries(byCat).map(([cat, amt]) => (
                        <div key={cat} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}>
                          <span style={{ fontSize: 13, color: "#374151", textTransform: "capitalize" }}>{cat.replace(/_/g, " ")}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 80, height: 6, background: "#e5e7eb", borderRadius: 3, overflow: "hidden" }}>
                              <div style={{ height: "100%", background: "#2563eb", borderRadius: 3, width: `${Math.min((amt / totalSpent) * 100, 100)}%` }} />
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>${amt.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 10 }}>Your Preferences</div>
                    {([["Price Sensitivity", "price_sensitivity", ["budget", "balanced", "premium"]], ["Shipping", "shipping_preference", ["fastest", "normal", "cheapest"]]] as const).map(([label, key, opts]) => (
                      <div key={key} style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{label}</div>
                        <div style={{ display: "flex", gap: 4 }}>
                          {opts.map(o => (
                            <button key={o} onClick={() => setProfile(p => ({ ...p, [key]: o }))}
                              style={{ flex: 1, padding: "6px 0", fontSize: 12, fontWeight: (profile as any)[key] === o ? 600 : 400, background: (profile as any)[key] === o ? "#eff6ff" : "#f9fafb", color: (profile as any)[key] === o ? "#2563eb" : "#6b7280", border: (profile as any)[key] === o ? "1px solid #bfdbfe" : "1px solid #e5e7eb", borderRadius: 6, cursor: "pointer", textTransform: "capitalize" }}>
                              {o}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
              {tab === "watchlist" && (
                <motion.div key="watch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {profile.watchlist.length === 0 ? (
                    <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
                      <div style={{ fontSize: 40, marginBottom: 8 }}>👁️</div>
                      <p>No items on your watchlist. Click the 👁️ button on any product to watch it.</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {profile.watchlist.map((w, i) => (
                        <div key={i} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{w.product_title}</div>
                            <div style={{ fontSize: 12, color: "#6b7280" }}>Current: ${w.current_price.toFixed(2)}</div>
                          </div>
                          <button onClick={() => setProfile(p => ({ ...p, watchlist: p.watchlist.filter((_, j) => j !== i) }))}
                            style={{ fontSize: 12, color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}>Remove</button>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Buy Modal */}
      <AnimatePresence>
        {buyTarget && (
          <BuyModal product={buyTarget} savedCard={profile.saved_card}
            onConfirm={handlePurchaseConfirm} onClose={() => setBuyTarget(null)} onSaveCard={saveCard} />
        )}
      </AnimatePresence>
    </div>
  );
}
