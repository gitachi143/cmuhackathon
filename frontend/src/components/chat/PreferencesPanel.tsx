import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LearnedPreferences } from "../../types";

interface PreferencesPanelProps {
  learned: LearnedPreferences;
  onUpdate: (updated: LearnedPreferences) => void;
  onClear: () => void;
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  marginBottom: 4,
};

const VALUE_STYLE: React.CSSProperties = {
  fontSize: 13,
  color: "var(--text-primary)",
  padding: "4px 8px",
  background: "var(--bg-muted)",
  borderRadius: 6,
  display: "inline-block",
};

const TAG_STYLE: React.CSSProperties = {
  fontSize: 12,
  padding: "3px 10px",
  borderRadius: 99,
  background: "var(--bg-option-btn)",
  color: "var(--text-accent)",
  border: "1px solid var(--border-option)",
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
};

export function PreferencesPanel({ learned, onUpdate, onClear }: PreferencesPanelProps) {
  const [open, setOpen] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const hasAny =
    learned.gender ||
    learned.age_range ||
    learned.style ||
    learned.climate ||
    learned.interests.length > 0 ||
    learned.use_cases.length > 0 ||
    learned.favorite_colors.length > 0 ||
    Object.keys(learned.sizes).length > 0 ||
    learned.dislikes.length > 0;

  const count = [
    learned.gender,
    learned.age_range,
    learned.style,
    learned.climate,
  ].filter(Boolean).length +
    learned.interests.length +
    learned.use_cases.length +
    learned.favorite_colors.length +
    Object.keys(learned.sizes).length +
    learned.dislikes.length;

  const removeFromArray = (field: keyof LearnedPreferences, value: string) => {
    const arr = learned[field];
    if (Array.isArray(arr)) {
      onUpdate({ ...learned, [field]: (arr as string[]).filter((v) => v !== value) });
    }
  };

  const removeSize = (key: string) => {
    const newSizes = { ...learned.sizes };
    delete newSizes[key];
    onUpdate({ ...learned, sizes: newSizes });
  };

  const clearField = (field: keyof LearnedPreferences) => {
    if (Array.isArray(learned[field])) {
      onUpdate({ ...learned, [field]: [] });
    } else if (typeof learned[field] === "object" && learned[field] !== null) {
      onUpdate({ ...learned, [field]: {} as never });
    } else {
      onUpdate({ ...learned, [field]: null as never });
    }
  };

  const startEdit = (field: string, current: string) => {
    setEditingField(field);
    setEditValue(current);
  };

  const saveEdit = () => {
    if (!editingField || !editValue.trim()) {
      setEditingField(null);
      return;
    }
    onUpdate({ ...learned, [editingField]: editValue.trim() });
    setEditingField(null);
    setEditValue("");
  };

  return (
    <div
      style={{
        borderTop: "1px solid var(--border-default)",
        background: "var(--bg-surface)",
        transition: "background 0.2s",
      }}
    >
      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-muted)",
        }}
      >
        <span>{open ? "\u25BC" : "\u25B6"} Your Preferences {hasAny ? `(${count})` : "(none yet)"}</span>
        {hasAny && (
          <span
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            style={{ fontSize: 11, color: "var(--text-faint)", cursor: "pointer" }}
          >
            Clear all
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: "hidden", padding: "0 16px 12px" }}
          >
            {!hasAny ? (
              <p style={{ fontSize: 12, color: "var(--text-faint)", fontStyle: "italic", margin: 0 }}>
                Start chatting and Cliq will learn your preferences automatically! Try mentioning your gender, style, activities, or sizes.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Scalar fields */}
                {(
                  [
                    ["gender", "Gender", learned.gender],
                    ["age_range", "Age Range", learned.age_range],
                    ["style", "Style", learned.style],
                    ["climate", "Climate", learned.climate],
                  ] as const
                ).map(([field, label, value]) =>
                  value ? (
                    <div key={field}>
                      <div style={LABEL_STYLE}>{label}</div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {editingField === field ? (
                          <input
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={saveEdit}
                            onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                            style={{
                              fontSize: 13,
                              padding: "3px 8px",
                              border: "1px solid var(--border-option)",
                              borderRadius: 6,
                              outline: "none",
                              background: "var(--bg-muted)",
                              color: "var(--text-primary)",
                              width: 120,
                            }}
                          />
                        ) : (
                          <span
                            style={{ ...VALUE_STYLE, cursor: "pointer" }}
                            onClick={() => startEdit(field, value)}
                            title="Click to edit"
                          >
                            {value}
                          </span>
                        )}
                        <button
                          onClick={() => clearField(field)}
                          style={{
                            fontSize: 11,
                            color: "var(--text-faint)",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          x
                        </button>
                      </div>
                    </div>
                  ) : null
                )}

                {/* Array fields */}
                {(
                  [
                    ["interests", "Interests", learned.interests],
                    ["use_cases", "Use Cases", learned.use_cases],
                    ["favorite_colors", "Colors", learned.favorite_colors],
                    ["dislikes", "Dislikes", learned.dislikes],
                  ] as const
                ).map(([field, label, values]) =>
                  values.length > 0 ? (
                    <div key={field}>
                      <div style={LABEL_STYLE}>{label}</div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {values.map((v) => (
                          <span key={v} style={TAG_STYLE}>
                            {v}
                            <button
                              onClick={() => removeFromArray(field, v)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                fontSize: 11,
                                color: "var(--text-muted)",
                                padding: 0,
                                lineHeight: 1,
                              }}
                            >
                              x
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null
                )}

                {/* Sizes */}
                {Object.keys(learned.sizes).length > 0 && (
                  <div>
                    <div style={LABEL_STYLE}>Sizes</div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {Object.entries(learned.sizes).map(([k, v]) => (
                        <span key={k} style={TAG_STYLE}>
                          {k}: {v}
                          <button
                            onClick={() => removeSize(k)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontSize: 11,
                              color: "var(--text-muted)",
                              padding: 0,
                              lineHeight: 1,
                            }}
                          >
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
