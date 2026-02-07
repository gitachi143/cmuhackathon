import { motion } from "framer-motion";
import { ThemeToggle } from "../common/ThemeToggle";

interface HeaderProps {
  input: string;
  setInput: (val: string) => void;
  loading: boolean;
  watchlistCount: number;
  onSend: (text: string) => void;
  onReset: () => void;
  onOpenSettings: () => void;
}

export function Header({ input, setInput, loading, watchlistCount, onSend, onReset, onOpenSettings }: HeaderProps) {
  return (
    <header
      style={{
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border-default)",
        padding: "10px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexShrink: 0,
        transition: "background 0.2s, border-color 0.2s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onReset}
          style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <span style={{ fontSize: 22 }}>{"\u{1F6D2}"}</span>
          <span style={{ fontWeight: 700, fontSize: 18, color: "var(--text-primary)" }}>Cliq</span>
        </motion.button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginLeft: 16,
            background: "var(--bg-muted)",
            border: "1px solid var(--border-default)",
            borderRadius: 9999,
            padding: "6px 14px",
            width: 340,
            transition: "background 0.2s, border-color 0.2s",
          }}
        >
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{"\u{1F50D}"}</span>
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
            placeholder="Search for products..."
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: 13,
              background: "transparent",
              color: "var(--text-primary)",
            }}
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              onSend(input);
              setInput("");
            }}
            disabled={loading || !input.trim()}
            style={{
              background: "none",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: 13,
              color: loading || !input.trim() ? "var(--text-faint)" : "var(--text-accent)",
              fontWeight: 600,
              padding: "2px 4px",
            }}
          >
            Go
          </motion.button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {watchlistCount > 0 && (
          <span style={{ fontSize: 12, color: "var(--text-muted)", background: "var(--bg-muted)", padding: "4px 10px", borderRadius: 99 }}>
            {"\u{1F441}\uFE0F"} {watchlistCount} watching
          </span>
        )}
        <ThemeToggle />
        <motion.button
          whileHover={{ scale: 1.1, rotate: 30 }}
          whileTap={{ scale: 0.9 }}
          onClick={onOpenSettings}
          style={{
            background: "var(--bg-muted)",
            border: "1px solid var(--border-default)",
            borderRadius: "50%",
            width: 34,
            height: 34,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: 16,
            color: "var(--text-muted)",
            transition: "background 0.2s, border-color 0.2s",
          }}
          title="Settings"
        >
          {"\u2699\uFE0F"}
        </motion.button>
      </div>
    </header>
  );
}
