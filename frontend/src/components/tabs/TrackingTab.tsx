import { motion } from "framer-motion";
import type { TrackingStatus, PurchaseAlert } from "../../types";

interface TrackingTabProps {
  trackingStatus: TrackingStatus | null;
  purchaseAlerts: PurchaseAlert[];
  watchlistCount: number;
  purchaseCount: number;
  onRefresh: () => void;
}

export function TrackingTab({ trackingStatus, purchaseAlerts, watchlistCount, purchaseCount, onRefresh }: TrackingTabProps) {
  return (
    <motion.div key="track" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>{"\u{1F4E1}"}</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Live Price Tracking</div>
            <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Watchlist + past purchases monitored automatically</div>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onRefresh}
          style={{ fontSize: 11, padding: "4px 10px", borderRadius: 99, background: "var(--bg-option-btn)", color: "var(--text-accent)", border: "1px solid var(--border-option)", cursor: "pointer", fontWeight: 600 }}
        >
          Refresh
        </motion.button>
      </div>

      {/* Status Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        <div
          style={{
            background: trackingStatus?.tracking_running ? "linear-gradient(135deg, #064e3b, #065f46)" : "linear-gradient(135deg, #78350f, #92400e)",
            borderRadius: 12,
            padding: 14,
            color: "#fff",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 24 }}>{trackingStatus?.tracking_running ? "\u{1F7E2}" : "\u{1F534}"}</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{trackingStatus?.tracking_running ? "Active" : "Paused"}</div>
          <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>Tracking Status</div>
        </div>
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, padding: 14, textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{trackingStatus?.watchlist_count ?? watchlistCount}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Watchlist Items</div>
          <div style={{ fontSize: 10, color: "var(--text-faint)" }}>Every {trackingStatus?.watchlist_interval_minutes ?? 5} min</div>
        </div>
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, padding: 14, textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{trackingStatus?.purchase_count ?? purchaseCount}</div>
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
              {trackingStatus?.last_active ? new Date(trackingStatus.last_active).toLocaleTimeString() : "\u2014"}
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
            {purchaseAlerts.map((alert) => (
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

      {/* Recent Activity */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, padding: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10 }}>Recent Tracking Activity</div>
        {(!trackingStatus?.recent_activity || trackingStatus.recent_activity.length === 0) ? (
          <div style={{ textAlign: "center", padding: 20, color: "var(--text-faint)", fontSize: 13 }}>
            No tracking activity yet. Add items to your watchlist or make purchases to start tracking.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {trackingStatus.recent_activity
              .slice()
              .reverse()
              .slice(0, 15)
              .map((entry, i) => {
                const isUpdate = entry.type.includes("update") || entry.type.includes("drop");
                const isPaused = entry.type.includes("paused");
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "5px 0",
                      borderBottom: i < 14 ? "1px solid var(--border-default)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 12 }}>{isPaused ? "\u23F8\uFE0F" : isUpdate ? "\u{1F4B0}" : "\u{1F50D}"}</span>
                      <div>
                        <div style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: isUpdate ? 600 : 400 }}>
                          {entry.product_name || entry.reason || entry.type.replace(/_/g, " ")}
                        </div>
                        {entry.old_price !== undefined && entry.new_price !== undefined && (
                          <div style={{ fontSize: 11, color: entry.new_price < entry.old_price ? "#10b981" : "#ef4444" }}>
                            ${entry.old_price.toFixed(2)} {"\u2192"} ${entry.new_price.toFixed(2)} ({entry.change !== undefined && entry.change < 0 ? "" : "+"}
                            {entry.change?.toFixed(2)})
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
          <div>{"\u{1F4CB}"} <strong>Watchlist items</strong> — prices checked every {trackingStatus?.watchlist_interval_minutes ?? 5} minutes</div>
          <div>{"\u{1F6CD}\uFE0F"} <strong>Past purchases</strong> — market prices rechecked every {trackingStatus?.purchase_interval_minutes ?? 30} minutes</div>
          <div>{"\u23F0"} <strong>Active user only</strong> — tracking pauses if you're away for 24 hours</div>
          <div>{"\u{1F514}"} <strong>Alerts</strong> — notified when prices drop on items you bought or are watching</div>
        </div>
      </div>
    </motion.div>
  );
}
