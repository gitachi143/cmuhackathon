import { motion } from "framer-motion";
import type { SearchHistoryEntry } from "../../types";

interface SearchesTabProps {
  searchHistory: SearchHistoryEntry[];
  onClearHistory: () => void;
  onReSearch: (query: string) => void;
}

export function SearchesTab({ searchHistory, onClearHistory, onReSearch }: SearchesTabProps) {
  if (searchHistory.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "var(--text-faint)" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>{"\u{1F50D}"}</div>
        <p>Your search history will appear here.</p>
      </div>
    );
  }

  return (
    <motion.div key="srch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Recent Searches</span>
          <button
            onClick={onClearHistory}
            style={{ fontSize: 11, color: "var(--text-danger)", background: "none", border: "none", cursor: "pointer" }}
          >
            Clear All
          </button>
        </div>
        {searchHistory.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              borderRadius: 8,
              padding: "10px 12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
              transition: "background 0.2s, border-color 0.2s",
            }}
            onClick={() => onReSearch(s.query)}
            whileHover={{ x: 2 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, color: "var(--text-muted)" }}>{"\u{1F50D}"}</span>
              <div>
                <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{s.query}</div>
                <div style={{ fontSize: 11, color: "var(--text-faint)" }}>
                  {new Date(s.timestamp).toLocaleDateString()}{" "}
                  {new Date(s.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {s.result_count > 0 && <span> {"\u00B7"} {s.result_count} results</span>}
                </div>
              </div>
            </div>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Re-search</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
