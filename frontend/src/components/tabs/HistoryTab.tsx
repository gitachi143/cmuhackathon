import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import type { UserProfile } from "../../types";
import { fetchShippingStatuses } from "../../api";

interface HistoryTabProps {
  purchaseHistory: UserProfile["purchase_history"];
}

const STATUS_STEPS = [
  "processing",
  "confirmed",
  "shipped",
  "in_transit",
  "out_for_delivery",
  "delivered",
] as const;

const STATUS_LABELS: Record<string, string> = {
  processing: "Processing",
  confirmed: "Confirmed",
  shipped: "Shipped",
  in_transit: "In Transit",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
};

const STATUS_COLORS: Record<string, string> = {
  processing: "#f59e0b",
  confirmed: "#3b82f6",
  shipped: "#8b5cf6",
  in_transit: "#6366f1",
  out_for_delivery: "#f97316",
  delivered: "#22c55e",
};

function getStepIndex(status: string): number {
  const idx = STATUS_STEPS.indexOf(status as (typeof STATUS_STEPS)[number]);
  return idx >= 0 ? idx : 0;
}

function ShippingProgressBar({ status }: { status: string }) {
  const stepIdx = getStepIndex(status);
  const color = STATUS_COLORS[status] || "#6b7280";

  return (
    <div style={{ marginTop: 10 }}>
      {/* Step dots + connecting lines */}
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        {STATUS_STEPS.map((step, i) => {
          const reached = i <= stepIdx;
          const isActive = i === stepIdx;
          return (
            <div key={step} style={{ display: "flex", alignItems: "center", flex: i < STATUS_STEPS.length - 1 ? 1 : "none" }}>
              {/* Dot */}
              <div
                style={{
                  width: isActive ? 14 : 10,
                  height: isActive ? 14 : 10,
                  borderRadius: "50%",
                  background: reached ? color : "var(--border-default)",
                  border: isActive ? `2px solid ${color}` : "none",
                  boxShadow: isActive ? `0 0 6px ${color}60` : "none",
                  transition: "all 0.3s ease",
                  flexShrink: 0,
                }}
                title={STATUS_LABELS[step]}
              />
              {/* Connecting line */}
              {i < STATUS_STEPS.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: 3,
                    background: i < stepIdx ? color : "var(--border-default)",
                    borderRadius: 2,
                    transition: "background 0.3s ease",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
      {/* Label */}
      <div
        style={{
          marginTop: 6,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span
          style={{
            display: "inline-block",
            padding: "2px 8px",
            borderRadius: 9999,
            fontSize: 11,
            fontWeight: 600,
            color: "#fff",
            background: color,
          }}
        >
          {STATUS_LABELS[status] || status}
        </span>
        {status !== "delivered" && (
          <span style={{ fontSize: 11, color: "var(--text-faint)" }}>
            Updating live...
          </span>
        )}
      </div>
    </div>
  );
}

export function HistoryTab({ purchaseHistory }: HistoryTabProps) {
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchShippingStatuses();
      const map: Record<string, string> = {};
      for (const s of data.shipments) {
        map[s.product_id] = s.shipping_status;
      }
      setStatuses(map);
      setLastRefresh(new Date());
    } catch (e) {
      console.error("Shipping status fetch error:", e);
    }
  }, []);

  // Initial fetch + 30-second polling
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  // Also refresh when new purchases are added
  useEffect(() => {
    if (purchaseHistory.length > 0) {
      refresh();
    }
  }, [purchaseHistory.length, refresh]);

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
      {/* Refresh indicator */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
          padding: "6px 10px",
          background: "var(--bg-surface)",
          borderRadius: 8,
          border: "1px solid var(--border-default)",
        }}
      >
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {lastRefresh
            ? `Last updated: ${lastRefresh.toLocaleTimeString()}`
            : "Loading statuses..."}
        </span>
        <button
          onClick={refresh}
          style={{
            fontSize: 12,
            color: "var(--text-accent)",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            padding: "2px 8px",
          }}
        >
          Refresh
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[...purchaseHistory].reverse().map((p, i) => {
          const status = statuses[p.product_id] || p.shipping_status || "processing";
          const isDelivered = status === "delivered";

          return (
            <div
              key={p.order_id || i}
              style={{
                background: "var(--bg-surface)",
                border: `1px solid ${isDelivered ? "#22c55e40" : "var(--border-default)"}`,
                borderRadius: 12,
                padding: 14,
                transition: "background 0.2s, border-color 0.2s",
              }}
            >
              {/* Header row: product name + price */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>
                    {p.product_title}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    {p.card_used} {"\u00B7"} {new Date(p.timestamp).toLocaleDateString()}
                    {p.order_id && (
                      <>
                        {" \u00B7 "}
                        <span style={{ fontFamily: "monospace", fontSize: 11 }}>
                          #{p.order_id}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)", flexShrink: 0, marginLeft: 12 }}>
                  ${p.price.toFixed(2)}
                </div>
              </div>

              {/* Shipping progress */}
              <ShippingProgressBar status={status} />
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
