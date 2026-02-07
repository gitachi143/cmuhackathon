import { useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

import type { UIProduct, ChatMsg, LearnedPreferences, TrackingStatus, PurchaseAlert, PersonalInfo, ShippingAddress, SavedCardDetails } from "./types";

// Hooks
import { useProfile, mergeLearnedPreferences } from "./hooks/useProfile";
import { useMessages } from "./hooks/useMessages";
import { useProducts } from "./hooks/useProducts";

// API
import { searchBackend, recordPurchase, fetchTrackingData, sendHeartbeat } from "./api";

// Layout
import { Header } from "./components/layout/Header";
import { IntroPage } from "./components/layout/IntroPage";

// Chat
import { ChatPanel } from "./components/chat/ChatPanel";
import { PreferencesPanel } from "./components/chat/PreferencesPanel";

// Products
import { ProductCard } from "./components/products/ProductCard";

// Modals
import { BuyModal } from "./components/modals/BuyModal";
import { EditDetailsModal } from "./components/modals/EditDetailsModal";

// Tabs
import { HistoryTab } from "./components/tabs/HistoryTab";
import { WatchlistTab } from "./components/tabs/WatchlistTab";
import { TrackingTab } from "./components/tabs/TrackingTab";
import { SpendingTab } from "./components/tabs/SpendingTab";
import { SearchesTab } from "./components/tabs/SearchesTab";

// ── Main App ───────────────────────────────────────────
export default function CliqApp() {
  const { profile, setProfile } = useProfile();
  const { messages, setMessages, mkId, clearMessages } = useMessages();
  const { products, setProducts, clearProducts } = useProducts();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [buyTarget, setBuyTarget] = useState<UIProduct | null>(null);
  const [tab, setTab] = useState("products");
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus | null>(null);
  const [purchaseAlerts, setPurchaseAlerts] = useState<PurchaseAlert[]>([]);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(() => {
    try {
      return localStorage.getItem("cliq_has_searched") === "true";
    } catch {
      return false;
    }
  });

  // Persist search state
  useEffect(() => {
    localStorage.setItem("cliq_has_searched", String(hasSearched));
  }, [hasSearched]);

  // Load tracking data when tracking tab is opened
  const loadTracking = useCallback(async () => {
    try {
      const data = await fetchTrackingData();
      setTrackingStatus(data.status);
      setPurchaseAlerts(data.alerts);
    } catch (e) {
      console.error("Tracking fetch error:", e);
    }
  }, []);

  useEffect(() => {
    if (tab === "tracking") loadTracking();
  }, [tab, loadTracking]);

  // Heartbeat: keep backend tracking alive while user is on the site
  useEffect(() => {
    const interval = setInterval(() => {
      sendHeartbeat();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Search handler ──────────────────────────────────
  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;
      if (!hasSearched) {
        setHasSearched(true);
        setMessages([{ id: "w", role: "agent", text: "Let me think about what you need...", thinking: null, options: [], products: [] }]);
      }

      // If there's a pending query (user is answering a follow-up), combine them
      let queryToSend = text;
      if (pendingQuery) {
        queryToSend = `${pendingQuery} - ${text}`;
        setPendingQuery(null);
      }

      const userMsg: ChatMsg = { id: mkId(), role: "user", text, thinking: null, options: [], products: [] };
      setMessages((p) => [...p, userMsg]);
      setLoading(true);
      try {
        const history = messages
          .filter((m) => m.role !== "follow_up")
          .slice(-10)
          .map((m) => ({ role: m.role, text: m.text }));
        const result = await searchBackend(queryToSend, profile, history);

        // Record search in history
        setProfile((prev) => ({
          ...prev,
          search_history: [{ query: text, timestamp: new Date().toISOString(), result_count: result.products.length }, ...prev.search_history].slice(0, 50),
        }));

        // Merge any learned preferences from the AI
        if (result.learned_preferences) {
          setProfile((prev) => ({
            ...prev,
            learned: mergeLearnedPreferences(prev.learned, result.learned_preferences!),
          }));
        }

        if (result.ambiguous && result.follow_up_question) {
          // Store the original query so follow-up answers are combined with it
          setPendingQuery(text);
          setMessages((p) => [...p, {
            id: mkId(),
            role: "follow_up",
            text: result.follow_up_question!,
            thinking: result.thinking,
            options: result.follow_up_options,
            products: [],
          }]);
        } else {
          setProducts(result.products);
          setTab("products");
          setMessages((p) => [...p, {
            id: mkId(),
            role: "agent",
            text: result.summary,
            thinking: result.thinking,
            options: [],
            products: result.products,
          }]);

          // Update prices for any tracked products
          result.products.forEach((rp: UIProduct) => {
            setProfile((prev) => {
              const tracked = prev.watchlist.find((w) => w.product_id === rp.id);
              if (tracked && tracked.current_price !== rp.price) {
                return {
                  ...prev,
                  watchlist: prev.watchlist.map((w) =>
                    w.product_id === rp.id ? { ...w, current_price: rp.price, price_history: [...w.price_history, { price: rp.price, date: new Date().toISOString() }] } : w
                  ),
                };
              }
              return prev;
            });
          });
        }
      } catch {
        setMessages((p) => [...p, { id: mkId(), role: "agent", text: "Something went wrong. Please try again.", thinking: null, options: [], products: [] }]);
      }
      setLoading(false);
    },
    [messages, loading, profile, hasSearched, pendingQuery, mkId, setMessages, setProducts, setProfile]
  );

  // ── Product action handlers ──────────────────────────
  const handleBuy = (product: UIProduct) => setBuyTarget(product);

  const handleWatch = (product: UIProduct) => {
    const existing = profile.watchlist.find((w) => w.product_id === product.id);
    if (existing) {
      if (existing.current_price !== product.price) {
        setProfile((p) => ({
          ...p,
          watchlist: p.watchlist.map((w) =>
            w.product_id === product.id ? { ...w, current_price: product.price, price_history: [...w.price_history, { price: product.price, date: new Date().toISOString() }] } : w
          ),
        }));
        setMessages((p) => [...p, { id: mkId(), role: "agent", text: `Price updated for "${product.title}": $${existing.current_price.toFixed(2)} \u2192 $${product.price.toFixed(2)}`, thinking: null, options: [], products: [] }]);
      } else {
        setMessages((p) => [...p, { id: mkId(), role: "agent", text: `"${product.title}" is already on your watchlist.`, thinking: null, options: [], products: [] }]);
      }
    } else {
      setProfile((p) => ({
        ...p,
        watchlist: [
          ...p.watchlist,
          {
            product_id: product.id,
            product_title: product.title,
            current_price: product.price,
            target_price: null,
            added_at: new Date().toISOString(),
            price_history: [{ price: product.price, date: new Date().toISOString() }],
            brand: product.brand,
            category: product.category,
            source: product.source,
            url: product.url,
            shipping_eta: product.shipping_eta,
          },
        ],
      }));
      setMessages((p) => [...p, { id: mkId(), role: "agent", text: `Added "${product.title}" to your watchlist. I'll keep an eye on the price for you.`, thinking: null, options: [], products: [] }]);
    }
  };

  const handlePurchaseConfirm = (product: UIProduct, cardName: string) => {
    recordPurchase(product, cardName);
    setProfile((p) => ({
      ...p,
      purchase_history: [...p.purchase_history, { product_id: product.id, product_title: product.title, price: product.price, category: product.category, card_used: cardName, timestamp: new Date().toISOString() }],
    }));
    setMessages((p) => [...p, { id: mkId(), role: "agent", text: `Order placed for ${product.title} at $${product.price.toFixed(2)}! \u{1F389} (Simulated \u2014 no real charge)`, thinking: null, options: [], products: [] }]);
  };

  const saveCard = (card: SavedCardDetails) => setProfile((p) => ({ ...p, saved_card: card }));
  const savePersonalInfo = (info: PersonalInfo) => setProfile((p) => ({ ...p, personal_info: info }));
  const saveAddress = (addr: ShippingAddress) => setProfile((p) => ({ ...p, shipping_address: addr }));

  const totalSpent = profile.purchase_history.reduce((s, p) => s + p.price, 0);

  const handleReset = () => {
    setHasSearched(false);
    clearProducts();
    clearMessages();
    setInput("");
    localStorage.removeItem("cliq_has_searched");
  };

  const handleUpdateLearned = (updated: LearnedPreferences) => {
    setProfile((p) => ({ ...p, learned: updated }));
  };

  const handleClearLearned = () => {
    setProfile((p) => ({
      ...p,
      learned: {
        gender: null,
        age_range: null,
        style: null,
        interests: [],
        sizes: {},
        dislikes: [],
        use_cases: [],
        favorite_colors: [],
        climate: null,
      },
    }));
  };

  // ── Google-style Intro Page ──────────────────────────
  if (!hasSearched) {
    return <IntroPage input={input} setInput={setInput} loading={loading} onSend={send} />;
  }

  // ── Post-Search Results Layout ─────────────────────
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-page)",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        transition: "background 0.2s ease",
      }}
    >
      <Header
        input={input}
        setInput={setInput}
        loading={loading}
        totalSpent={totalSpent}
        watchlistCount={profile.watchlist.length}
        onSend={send}
        onReset={handleReset}
      />

      {/* Main */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Chat + Preferences Panel */}
        <div style={{ flex: "0 0 38%", display: "flex", flexDirection: "column", borderRight: "1px solid var(--border-default)" }}>
          <ChatPanel messages={messages} loading={loading} learned={profile.learned} onSend={send} />
          <PreferencesPanel
            learned={profile.learned}
            onUpdate={handleUpdateLearned}
            onClear={handleClearLearned}
          />
        </div>

        {/* Right Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}
        >
          {/* Tab bar */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid var(--border-default)",
              background: "var(--bg-surface)",
              flexShrink: 0,
              transition: "background 0.2s, border-color 0.2s",
              overflowX: "auto",
            }}
          >
            {(
              [
                ["products", `Products (${products.length})`],
                ["history", `History (${profile.purchase_history.length})`],
                ["watchlist", `Watchlist (${profile.watchlist.length})`],
                ["tracking", "Tracking"],
                ["spending", "Spending"],
                ["searches", `Searches (${profile.search_history.length})`],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  fontSize: 12,
                  fontWeight: tab === k ? 600 : 400,
                  color: tab === k ? "var(--text-accent)" : "var(--text-muted)",
                  background: "none",
                  border: "none",
                  borderBottom: tab === k ? "2px solid var(--text-accent)" : "2px solid transparent",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            <AnimatePresence mode="wait">
              {tab === "products" && (
                <motion.div
                  key="prod"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}
                >
                  {products.length === 0 ? (
                    <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 40, color: "var(--text-faint)" }}>
                      <div style={{ fontSize: 40, marginBottom: 8 }}>{"\u{1F50D}"}</div>
                      <p>Your search results will appear here.</p>
                    </div>
                  ) : (
                    products.map((p) => <ProductCard key={p.id} product={p} onBuy={handleBuy} onWatch={handleWatch} />)
                  )}
                </motion.div>
              )}

              {tab === "history" && <HistoryTab purchaseHistory={profile.purchase_history} />}

              {tab === "watchlist" && (
                <WatchlistTab
                  watchlist={profile.watchlist}
                  onRemove={(i) => setProfile((p) => ({ ...p, watchlist: p.watchlist.filter((_, j) => j !== i) }))}
                  onSetTargetPrice={(i, price) =>
                    setProfile((p) => ({
                      ...p,
                      watchlist: p.watchlist.map((item, j) => (j === i ? { ...item, target_price: price } : item)),
                    }))
                  }
                />
              )}

              {tab === "tracking" && (
                <TrackingTab
                  trackingStatus={trackingStatus}
                  purchaseAlerts={purchaseAlerts}
                  watchlistCount={profile.watchlist.length}
                  purchaseCount={profile.purchase_history.length}
                  onRefresh={loadTracking}
                />
              )}

              {tab === "spending" && (
                <SpendingTab
                  profile={profile}
                  setProfile={setProfile}
                  onEditDetails={() =>
                    setBuyTarget({ id: "__edit__", title: "Edit Info", brand: "", price: 0, original_price: null, shipping_eta: "", rating: 0, reviews: 0, tag: "", explanation: "", source: "", url: "", category: "", coupons: 0, specs: {} })
                  }
                />
              )}

              {tab === "searches" && (
                <SearchesTab
                  searchHistory={profile.search_history}
                  onClearHistory={() => setProfile((p) => ({ ...p, search_history: [] }))}
                  onReSearch={send}
                />
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Buy Modal / Edit Details Modal */}
      <AnimatePresence>
        {buyTarget && buyTarget.id === "__edit__" ? (
          <motion.div
            key="edit-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "var(--overlay)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 50,
            }}
            onClick={() => setBuyTarget(null)}
          >
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
        ) : (
          buyTarget && (
            <BuyModal
              product={buyTarget}
              savedCard={profile.saved_card}
              personalInfo={profile.personal_info}
              shippingAddress={profile.shipping_address}
              onConfirm={handlePurchaseConfirm}
              onClose={() => setBuyTarget(null)}
              onSaveCard={saveCard}
              onSavePersonalInfo={savePersonalInfo}
              onSaveAddress={saveAddress}
            />
          )
        )}
      </AnimatePresence>
    </div>
  );
}
