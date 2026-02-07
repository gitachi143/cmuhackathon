import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ChatMsg, LearnedPreferences } from "../../types";

interface ChatPanelProps {
  messages: ChatMsg[];
  loading: boolean;
  learned: LearnedPreferences;
  onSend: (text: string) => void;
}

/** Small pill showing a single learned fact. */
function ContextBadge({ label, value, onRemove }: { label: string; value: string; onRemove?: () => void }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        padding: "2px 8px",
        borderRadius: 99,
        background: "var(--bg-option-btn)",
        color: "var(--text-accent)",
        border: "1px solid var(--border-option)",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontWeight: 600 }}>{label}:</span> {value}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 11,
            color: "var(--text-muted)",
            padding: "0 2px",
            lineHeight: 1,
          }}
          title={`Remove ${label}`}
        >
          x
        </button>
      )}
    </span>
  );
}

/** Renders the "thinking" bubble that shows the AI's reasoning. */
function ThinkingBubble({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      style={{
        fontSize: 12,
        color: "var(--text-muted)",
        background: "var(--bg-muted)",
        borderRadius: 8,
        padding: "6px 10px",
        marginTop: 6,
        cursor: "pointer",
        borderLeft: "3px solid var(--text-accent)",
      }}
      onClick={() => setExpanded((p) => !p)}
    >
      <span style={{ fontWeight: 600 }}>Thinking: </span>
      {expanded ? text : text.length > 80 ? text.slice(0, 80) + "..." : text}
    </motion.div>
  );
}

export function ChatPanel({ messages, loading, learned, onSend }: ChatPanelProps) {
  const msgEnd = useRef<HTMLDivElement>(null);
  const [showContext, setShowContext] = useState(true);

  useEffect(() => {
    msgEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Collect active context badges from learned prefs
  const contextItems: { label: string; value: string }[] = [];
  if (learned.gender) contextItems.push({ label: "Gender", value: learned.gender });
  if (learned.age_range) contextItems.push({ label: "Age", value: learned.age_range });
  if (learned.style) contextItems.push({ label: "Style", value: learned.style });
  if (learned.climate) contextItems.push({ label: "Climate", value: learned.climate });
  learned.interests.forEach((i) => contextItems.push({ label: "Interest", value: i }));
  learned.use_cases.forEach((u) => contextItems.push({ label: "Use", value: u }));
  learned.favorite_colors.forEach((c) => contextItems.push({ label: "Color", value: c }));
  Object.entries(learned.sizes).forEach(([k, v]) => contextItems.push({ label: `Size (${k})`, value: v }));
  learned.dislikes.forEach((d) => contextItems.push({ label: "Dislike", value: d }));

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}
    >
      {/* Context bar - shows what Cliq knows */}
      {contextItems.length > 0 && (
        <div
          style={{
            padding: "6px 12px",
            borderBottom: "1px solid var(--border-default)",
            background: "var(--bg-surface)",
            transition: "background 0.2s",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: showContext ? 4 : 0 }}>
            <button
              onClick={() => setShowContext((p) => !p)}
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-muted)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {showContext ? "\u25BC" : "\u25B6"} What Cliq knows about you ({contextItems.length})
            </button>
          </div>
          <AnimatePresence>
            {showContext && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{ display: "flex", gap: 4, flexWrap: "wrap", overflow: "hidden" }}
              >
                {contextItems.map((item, i) => (
                  <ContextBadge key={`${item.label}-${item.value}-${i}`} label={item.label} value={item.value} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Messages */}
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

              {/* Thinking indicator */}
              {msg.thinking && <ThinkingBubble text={msg.thinking} />}

              {/* Follow-up options */}
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
                Thinking about your request...
              </motion.span>
            </div>
          </motion.div>
        )}
        <div ref={msgEnd} />
      </div>

      {/* Smart suggestions - context-aware */}
      <ChatSuggestions learned={learned} onSend={onSend} />
    </motion.div>
  );
}

/** Dynamic suggestions based on what Cliq knows about the user. */
function ChatSuggestions({ learned, onSend }: { learned: LearnedPreferences; onSend: (text: string) => void }) {
  // Build context-aware suggestions
  const suggestions: string[] = [];

  if (!learned.gender && !learned.style) {
    suggestions.push("I need a warm winter jacket");
    suggestions.push("Budget monitor for home office");
    suggestions.push("Carry-on suitcase under $150");
    suggestions.push("Cheap reliable headphones");
  } else {
    // Personalized suggestions
    if (learned.use_cases.includes("hiking")) {
      suggestions.push("Waterproof hiking boots");
      suggestions.push("Lightweight hiking backpack");
    }
    if (learned.use_cases.includes("gaming")) {
      suggestions.push("Gaming headset under $100");
      suggestions.push("144Hz gaming monitor");
    }
    if (learned.climate === "cold") {
      suggestions.push("Insulated winter boots");
      suggestions.push("Thermal base layers");
    }
    if (learned.style === "casual") {
      suggestions.push("Casual everyday sneakers");
    }
    if (learned.style === "sporty") {
      suggestions.push("Running shoes for daily training");
    }
    // Always add some general ones
    if (suggestions.length < 3) {
      suggestions.push("Show me something new");
      suggestions.push("Best deals right now");
    }
    if (suggestions.length < 4) {
      suggestions.push("Surprise me with a recommendation");
    }
  }

  return (
    <div
      style={{
        padding: "8px 16px",
        borderTop: "1px solid var(--border-default)",
        background: "var(--bg-surface)",
        transition: "background 0.2s, border-color 0.2s",
      }}
    >
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {suggestions.slice(0, 4).map((s) => (
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
  );
}
