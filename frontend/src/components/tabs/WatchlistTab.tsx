import { motion } from "framer-motion";
import type { WatchlistItem } from "../../types";
import { getCategoryEmoji } from "../../utils";

interface WatchlistTabProps {
  watchlist: WatchlistItem[];
  onRemove: (index: number) => void;
  onSetTargetPrice: (index: number, price: number | null) => void;
}

export function WatchlistTab({ watchlist, onRemove, onSetTargetPrice }: WatchlistTabProps) {
  if (watchlist.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "var(--text-faint)" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>{"\u{1F441}\uFE0F"}</div>
        <p>No items on your watchlist. Click the {"\u{1F441}\uFE0F"} button on any product to watch it.</p>
      </div>
    );
  }

  // Price drop summary
  const drops = watchlist.filter((w) => {
    const first = w.price_history?.[0]?.price ?? w.current_price;
    return w.current_price < first;
  });
  const totalSavings = drops.reduce((s, w) => s + ((w.price_history?.[0]?.price ?? w.current_price) - w.current_price), 0);

  return (
    <motion.div key="watch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Price Drop Summary */}
        {drops.length > 0 && (
          <div style={{ background: "linear-gradient(135deg, #ecfdf5, #d1fae5)", border: "1px solid #6ee7b7", borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#065f46", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Price Drops Detected
                </div>
                <div style={{ fontSize: 13, color: "#047857", marginTop: 2 }}>
                  {drops.length} item{drops.length > 1 ? "s" : ""} dropped in price
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#059669" }}>${totalSavings.toFixed(2)}</div>
                <div style={{ fontSize: 11, color: "#047857" }}>potential savings</div>
              </div>
            </div>
          </div>
        )}

        {watchlist.map((w, i) => {
          const firstPrice = w.price_history?.[0]?.price ?? w.current_price;
          const priceDiff = w.current_price - firstPrice;
          const pctChange = firstPrice > 0 ? (priceDiff / firstPrice) * 100 : 0;
          const hitTarget = w.target_price !== null && w.current_price <= w.target_price;

          return (
            <div
              key={i}
              style={{
                background: "var(--bg-surface)",
                borderRadius: 10,
                padding: 14,
                border: hitTarget ? "2px solid #10b981" : priceDiff < 0 ? "1px solid #6ee7b7" : "1px solid var(--border-default)",
                transition: "background 0.2s, border-color 0.2s",
              }}
            >
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
                    {w.brand && <span>{w.brand} {"\u00B7"} </span>}
                    {w.source && <span>{w.source} {"\u00B7"} </span>}
                    {getCategoryEmoji(w.category || "")} {(w.category || "").replace(/_/g, " ")}
                  </div>
                </div>
                <button
                  onClick={() => onRemove(i)}
                  style={{ fontSize: 12, color: "var(--text-danger)", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}
                >
                  Remove
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>${w.current_price.toFixed(2)}</span>
                {priceDiff !== 0 && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: priceDiff < 0 ? "#10b981" : "#ef4444" }}>
                    {priceDiff < 0 ? "\u25BC" : "\u25B2"} ${Math.abs(priceDiff).toFixed(2)} ({Math.abs(pctChange).toFixed(1)}%)
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
                  onChange={(e) => {
                    const val = e.target.value ? parseFloat(e.target.value) : null;
                    onSetTargetPrice(i, val);
                  }}
                  style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 12, color: "var(--text-primary)", fontWeight: 600, minWidth: 0 }}
                />
                {w.target_price !== null && w.target_price > 0 && (
                  <span style={{ fontSize: 10, color: w.current_price <= w.target_price ? "#10b981" : "#f59e0b", fontWeight: 600 }}>
                    {w.current_price <= w.target_price ? "Reached!" : `$${(w.current_price - w.target_price).toFixed(2)} away`}
                  </span>
                )}
              </div>

              {w.shipping_eta && (
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>{"\u{1F4E6}"} {w.shipping_eta}</div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                <span style={{ fontSize: 11, color: "var(--text-faint)" }}>
                  Tracking since {new Date(w.added_at).toLocaleDateString()} {"\u00B7"} {w.price_history?.length || 1} price point{(w.price_history?.length || 1) !== 1 ? "s" : ""}
                </span>
                {w.url && (
                  <button
                    onClick={() => window.open(w.url, "_blank")}
                    style={{ fontSize: 11, color: "var(--text-accent)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                  >
                    View
                  </button>
                )}
              </div>

              {/* Mini price history */}
              {w.price_history && w.price_history.length > 1 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 4 }}>Price History</div>
                  <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 32 }}>
                    {w.price_history.map((ph, j) => {
                      const prices = w.price_history.map((p) => p.price);
                      const min = Math.min(...prices);
                      const max = Math.max(...prices);
                      const range = max - min || 1;
                      const height = Math.max(4, ((ph.price - min) / range) * 28);
                      return (
                        <div
                          key={j}
                          title={`$${ph.price.toFixed(2)} on ${new Date(ph.date).toLocaleDateString()}`}
                          style={{ flex: 1, height, background: ph.price <= firstPrice ? "#10b981" : "#ef4444", borderRadius: 2, minWidth: 3, maxWidth: 20 }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
