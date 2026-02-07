import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import type { ChatMsg } from "../../types";

const SUGGESTIONS = [
  "I need a warm winter jacket",
  "Budget monitor for home office",
  "Carry-on suitcase under $150",
  "Cheap reliable headphones",
];

interface ChatPanelProps {
  messages: ChatMsg[];
  loading: boolean;
  onSend: (text: string) => void;
}

export function ChatPanel({ messages, loading, onSend }: ChatPanelProps) {
  const msgEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    msgEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      style={{ flex: "0 0 38%", display: "flex", flexDirection: "column", borderRight: "1px solid var(--border-default)" }}
    >
      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              alignItems: "flex-start",
              gap: 8,
            }}
          >
            {msg.role !== "user" && (
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 99,
                  background: "var(--bg-bot-avatar)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  flexShrink: 0,
                }}
              >
                {"\u{1F916}"}
              </div>
            )}
            <div
              style={{
                maxWidth: "80%",
                padding: "10px 14px",
                borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                background: msg.role === "user" ? "var(--bg-user-msg)" : "var(--bg-agent-msg)",
                color: msg.role === "user" ? "var(--text-on-primary)" : "var(--text-primary)",
                border: msg.role === "user" ? "none" : "1px solid var(--border-default)",
                fontSize: 14,
                lineHeight: 1.5,
                transition: "background 0.2s, border-color 0.2s, color 0.2s",
              }}
            >
              {msg.text}
              {msg.options && msg.options.length > 0 && (
                <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                  {msg.options.map((opt) => (
                    <motion.button
                      key={opt}
                      whileTap={{ scale: 0.95 }}
                      whileHover={{ scale: 1.03 }}
                      onClick={() => onSend(opt)}
                      style={{
                        background: "var(--bg-option-btn)",
                        color: "var(--text-accent)",
                        border: "1px solid var(--border-option)",
                        borderRadius: 99,
                        padding: "5px 14px",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {opt}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 99,
                background: "var(--bg-bot-avatar)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
              }}
            >
              {"\u{1F916}"}
            </div>
            <div
              style={{
                background: "var(--bg-agent-msg)",
                border: "1px solid var(--border-default)",
                borderRadius: 16,
                padding: "10px 16px",
                fontSize: 14,
                color: "var(--text-muted)",
              }}
            >
              <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                Searching for the best options...
              </motion.span>
            </div>
          </motion.div>
        )}
        <div ref={msgEnd} />
      </div>

      {/* Quick suggestions in chat */}
      <div
        style={{
          padding: "8px 16px",
          borderTop: "1px solid var(--border-default)",
          background: "var(--bg-surface)",
          transition: "background 0.2s, border-color 0.2s",
        }}
      >
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onSend(s)}
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                background: "var(--bg-suggestion)",
                border: "1px solid var(--border-default)",
                borderRadius: 99,
                padding: "3px 10px",
                cursor: "pointer",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
