import { motion } from "framer-motion";
import type { UserProfile } from "../../types";
import { getCategoryEmoji } from "../../utils";

interface SpendingTabProps {
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  onEditDetails: () => void;
}

export function SpendingTab({ profile, setProfile, onEditDetails }: SpendingTabProps) {
  const totalSpent = profile.purchase_history.reduce((s, p) => s + p.price, 0);
  const byCat: Record<string, number> = {};
  profile.purchase_history.forEach((p) => {
    byCat[p.category || "other"] = (byCat[p.category || "other"] || 0) + p.price;
  });

  return (
    <motion.div key="spend" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
        {[
          { label: "Purchases", value: `${profile.purchase_history.length}`, color: "#10b981" },
          { label: "Watchlist", value: `${profile.watchlist.length}`, color: "#f59e0b" },
        ].map((c) => (
          <div
            key={c.label}
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              borderRadius: 10,
              padding: "14px 12px",
              textAlign: "center",
              borderTop: `3px solid ${c.color}`,
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{c.value}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* By Category */}
      {Object.keys(byCat).length > 0 && (
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>Spending by Category</div>
          {Object.entries(byCat)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, amount]) => (
              <div key={cat} style={{ padding: "5px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                    {getCategoryEmoji(cat)} {cat.replace(/_/g, " ")}
                  </span>
                  <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>${amount.toFixed(2)}</span>
                </div>
                <div style={{ width: "100%", height: 6, background: "var(--bg-progress-track)", borderRadius: 3, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      background: "linear-gradient(90deg, #6366f1, #a78bfa)",
                      borderRadius: 3,
                      width: `${Math.min((amount / (totalSpent || 1)) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Preferences */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, padding: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>Your Preferences</div>
        {(
          [
            ["Price Sensitivity", "price_sensitivity", ["budget", "balanced", "premium"]],
            ["Shipping", "shipping_preference", ["fastest", "normal", "cheapest"]],
          ] as const
        ).map(([label, key, opts]) => (
          <div key={key} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 3 }}>{label}</div>
            <div style={{ display: "flex", gap: 4 }}>
              {opts.map((o) => {
                const isActive = profile[key] === o;
                return (
                  <button
                    key={o}
                    onClick={() => setProfile((p) => ({ ...p, [key]: o }))}
                    style={{
                      flex: 1,
                      padding: "5px 0",
                      fontSize: 11,
                      fontWeight: isActive ? 600 : 400,
                      background: isActive ? "var(--bg-option-btn)" : "var(--bg-suggestion)",
                      color: isActive ? "var(--text-accent)" : "var(--text-muted)",
                      border: isActive ? "1px solid var(--border-option)" : "1px solid var(--border-default)",
                      borderRadius: 6,
                      cursor: "pointer",
                      textTransform: "capitalize",
                    }}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <button
          onClick={onEditDetails}
          style={{
            width: "100%",
            marginTop: 8,
            padding: "7px 0",
            fontSize: 11,
            fontWeight: 600,
            background: "var(--bg-btn-secondary)",
            color: "var(--text-accent)",
            border: "1px solid var(--border-default)",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Edit Details
        </button>
      </div>
    </motion.div>
  );
}
