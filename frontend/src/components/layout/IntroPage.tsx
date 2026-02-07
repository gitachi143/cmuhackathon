import { motion } from "framer-motion";
import { ThemeToggle } from "../common/ThemeToggle";

const SUGGESTIONS = [
  "I need a warm winter jacket",
  "Budget monitor for home office",
  "Carry-on suitcase under $150",
  "Cheap reliable headphones",
];

interface IntroPageProps {
  input: string;
  setInput: (val: string) => void;
  loading: boolean;
  onSend: (text: string) => void;
}

export function IntroPage({ input, setInput, loading, onSend }: IntroPageProps) {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-page)",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        transition: "background 0.3s ease",
        position: "relative",
      }}
    >
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
            <span style={{ fontSize: 48 }}>{"\u{1F6D2}"}</span>
            <span style={{ fontSize: 56, fontWeight: 700, color: "var(--text-primary)", letterSpacing: -2 }}>Cliq</span>
          </div>
          <p style={{ fontSize: 16, color: "var(--text-muted)", fontWeight: 400 }}>Your AI shopping assistant</p>
        </div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          style={{ width: "100%", marginBottom: 24 }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              borderRadius: 9999,
              padding: "12px 20px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              transition: "box-shadow 0.2s, border-color 0.2s, background 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
            }}
          >
            <span style={{ fontSize: 18, color: "var(--text-muted)", flexShrink: 0 }}>{"\u{1F50D}"}</span>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend(input);
                  setInput("");
                }
              }}
              placeholder="Describe what you're looking for..."
              autoFocus
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                fontSize: 16,
                background: "transparent",
                color: "var(--text-primary)",
                lineHeight: 1.5,
              }}
            />
            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              onClick={() => {
                onSend(input);
                setInput("");
              }}
              disabled={loading || !input.trim()}
              style={{
                background: loading || !input.trim() ? "var(--bg-btn-primary-disabled)" : "var(--bg-btn-primary)",
                color: "var(--text-on-primary)",
                border: "none",
                borderRadius: 9999,
                padding: "8px 20px",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: 14,
                flexShrink: 0,
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
          {SUGGESTIONS.map((s) => (
            <motion.button
              key={s}
              whileHover={{ scale: 1.04, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setInput("");
                onSend(s);
              }}
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                borderRadius: 9999,
                padding: "8px 16px",
                cursor: "pointer",
                fontWeight: 500,
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
