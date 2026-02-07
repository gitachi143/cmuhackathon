import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { UIProduct } from "../../types";
import { getCategoryEmoji } from "../../utils";
import { useTagColors } from "../../hooks";
import { Stars } from "../common/Stars";

function ProductImage({ src, category, tagBg }: { src: string | null; category: string; tagBg: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        style={{
          background: `linear-gradient(135deg, ${tagBg}, var(--bg-muted))`,
          borderRadius: 8,
          height: 120,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
        }}
      >
        {getCategoryEmoji(category)}
      </div>
    );
  }

  return (
    <div
      style={{
        borderRadius: 8,
        height: 120,
        overflow: "hidden",
        background: "var(--bg-muted)",
      }}
    >
      <img
        src={src}
        alt=""
        onError={() => setFailed(true)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
    </div>
  );
}

interface ProductCardProps {
  product: UIProduct;
  onBuy: (p: UIProduct) => void;
  onWatch: (p: UIProduct) => void;
}

export function ProductCard({ product: p, onBuy, onWatch }: ProductCardProps) {
  const [showLink, setShowLink] = useState(false);
  const tagColors = useTagColors();
  const tc = tagColors[p.tag] || tagColors["Best overall"];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: "0 8px 25px rgba(0,0,0,0.15)" }}
      transition={{ duration: 0.2 }}
      style={{
        background: "var(--bg-surface)",
        borderRadius: 12,
        padding: 16,
        border: "1px solid var(--border-default)",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        transition: "background 0.2s, border-color 0.2s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span
          style={{
            background: tc.bg,
            color: tc.text,
            fontSize: 11,
            fontWeight: 600,
            padding: "3px 8px",
            borderRadius: 99,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {p.tag}
        </span>
        {p.coupons > 0 && (
          <span style={{ fontSize: 11, color: "var(--text-success)", fontWeight: 500 }}>
            {"\u{1F3F7}\uFE0F"} {p.coupons} coupon{p.coupons > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <ProductImage src={p.image_url} category={p.category} tagBg={tc.bg} />

      <div>
        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)", lineHeight: 1.3 }}>{p.title}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.brand}</div>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>${p.price.toFixed(2)}</span>
        {p.original_price && (
          <span style={{ fontSize: 13, color: "var(--text-faint)", textDecoration: "line-through" }}>
            ${p.original_price.toFixed(2)}
          </span>
        )}
      </div>

      <Stars rating={p.rating} />

      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
        {"\u{1F4E6}"} {p.shipping_eta} {"\u00B7"} {p.reviews.toLocaleString()} reviews
      </div>

      <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4, margin: 0 }}>{p.explanation}</p>

      {Object.keys(p.specs).length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {Object.entries(p.specs).map(([k, v]) => (
            <span
              key={k}
              style={{
                fontSize: 10,
                background: "var(--bg-muted)",
                color: "var(--text-secondary)",
                padding: "2px 6px",
                borderRadius: 4,
              }}
            >
              {v}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
        <motion.button
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.02 }}
          onClick={() => onBuy(p)}
          style={{
            flex: 1,
            background: "var(--bg-btn-primary)",
            color: "var(--text-on-primary)",
            border: "none",
            borderRadius: 8,
            padding: "8px 0",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {"\u26A1"} One-Click Buy
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onWatch(p)}
          style={{
            background: "var(--bg-btn-secondary)",
            border: "1px solid var(--border-default)",
            borderRadius: 8,
            padding: "8px 12px",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          {"\u{1F441}\uFE0F"}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowLink(true)}
          style={{
            background: "var(--bg-btn-secondary)",
            border: "1px solid var(--border-default)",
            borderRadius: 8,
            padding: "8px 12px",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          {"\u{1F517}"}
        </motion.button>
      </div>

      <AnimatePresence>
        {showLink && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              position: "absolute",
              bottom: 60,
              left: 16,
              right: 16,
              background: "var(--bg-warning)",
              border: "1px solid var(--border-warning)",
              borderRadius: 8,
              padding: 10,
              fontSize: 12,
              zIndex: 10,
            }}
          >
            <div style={{ fontWeight: 600, color: "var(--text-warning-title)" }}>
              {"\u26A0\uFE0F"} You are leaving Cliq
            </div>
            <div style={{ color: "var(--text-warning-body)", marginTop: 2 }}>
              {"\u2192"} {p.source} (
              {(() => {
                try {
                  return new URL(p.url).hostname;
                } catch {
                  return p.url;
                }
              })()}
              )
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <button
                onClick={() => window.open(p.url, "_blank")}
                style={{
                  fontSize: 11,
                  background: "#f59e0b",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  padding: "4px 10px",
                  cursor: "pointer",
                }}
              >
                Continue
              </button>
              <button
                onClick={() => setShowLink(false)}
                style={{
                  fontSize: 11,
                  background: "var(--bg-muted)",
                  color: "var(--text-secondary)",
                  border: "none",
                  borderRadius: 4,
                  padding: "4px 10px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
