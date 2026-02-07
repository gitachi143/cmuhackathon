import { motion } from "framer-motion";
import type { UserProfile } from "../../types";

interface HistoryTabProps {
  purchaseHistory: UserProfile["purchase_history"];
}

export function HistoryTab({ purchaseHistory }: HistoryTabProps) {
  if (purchaseHistory.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "var(--text-faint)" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>{"\u{1F4E6}"}</div>
        <p>No purchases yet. Try the one-click buy!</p>
      </div>
    );
  }

  return (
    <motion.div key="hist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {purchaseHistory.map((p, i) => (
          <div
            key={i}
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              borderRadius: 10,
              padding: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              transition: "background 0.2s, border-color 0.2s",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{p.product_title}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {p.card_used} {"\u00B7"} {new Date(p.timestamp).toLocaleDateString()}
              </div>
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>${p.price.toFixed(2)}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
