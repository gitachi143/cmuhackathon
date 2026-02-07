import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";

interface BudgetFilterProps {
  min: number;
  max: number;
  minVal: number;
  maxVal: number;
  onChange: (min: number, max: number) => void;
}

export function BudgetFilter({ min, max, minVal, maxVal, onChange }: BudgetFilterProps) {
  const [dragging, setDragging] = useState<"min" | "max" | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const getPercent = useCallback(
    (val: number) => ((val - min) / (max - min)) * 100,
    [min, max]
  );

  const getValueFromPosition = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return min;
      const rect = trackRef.current.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      // Snap to steps of 10
      const raw = min + percent * (max - min);
      return Math.round(raw / 10) * 10;
    },
    [min, max]
  );

  const handlePointerDown = useCallback(
    (thumb: "min" | "max") => (e: React.PointerEvent) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(thumb);
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const val = getValueFromPosition(e.clientX);
      if (dragging === "min") {
        onChange(Math.min(val, maxVal - 10), maxVal);
      } else {
        onChange(minVal, Math.max(val, minVal + 10));
      }
    },
    [dragging, minVal, maxVal, onChange, getValueFromPosition]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  // Handle track click to jump the nearest thumb
  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      const val = getValueFromPosition(e.clientX);
      const distToMin = Math.abs(val - minVal);
      const distToMax = Math.abs(val - maxVal);
      if (distToMin <= distToMax) {
        onChange(Math.min(val, maxVal - 10), maxVal);
      } else {
        onChange(minVal, Math.max(val, minVal + 10));
      }
    },
    [minVal, maxVal, onChange, getValueFromPosition]
  );

  const leftPercent = getPercent(minVal);
  const rightPercent = getPercent(maxVal);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-default)",
        borderRadius: 10,
        padding: "12px 16px",
        marginBottom: 12,
        transition: "background 0.2s, border-color 0.2s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
          Budget Filter
        </span>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-accent)" }}>
          ${minVal} &ndash; ${maxVal}
        </span>
      </div>

      {/* Dual range slider */}
      <div
        ref={trackRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClick={handleTrackClick}
        style={{
          position: "relative",
          height: 32,
          cursor: "pointer",
          touchAction: "none",
          userSelect: "none",
        }}
      >
        {/* Track background */}
        <div
          style={{
            position: "absolute",
            top: 13,
            left: 0,
            right: 0,
            height: 6,
            borderRadius: 3,
            background: "var(--bg-progress-track)",
          }}
        />

        {/* Active range fill */}
        <div
          style={{
            position: "absolute",
            top: 13,
            left: `${leftPercent}%`,
            width: `${rightPercent - leftPercent}%`,
            height: 6,
            borderRadius: 3,
            background: "var(--bg-progress-fill)",
            transition: dragging ? "none" : "left 0.1s, width 0.1s",
          }}
        />

        {/* Min thumb */}
        <div
          onPointerDown={handlePointerDown("min")}
          style={{
            position: "absolute",
            top: 6,
            left: `${leftPercent}%`,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "var(--bg-surface)",
            border: "2px solid var(--bg-progress-fill)",
            boxShadow: dragging === "min" ? "0 0 0 4px rgba(37,99,235,0.2)" : "0 1px 3px rgba(0,0,0,0.15)",
            transform: "translateX(-50%)",
            cursor: "grab",
            zIndex: 2,
            transition: dragging === "min" ? "none" : "left 0.1s",
          }}
        />

        {/* Max thumb */}
        <div
          onPointerDown={handlePointerDown("max")}
          style={{
            position: "absolute",
            top: 6,
            left: `${rightPercent}%`,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "var(--bg-surface)",
            border: "2px solid var(--bg-progress-fill)",
            boxShadow: dragging === "max" ? "0 0 0 4px rgba(37,99,235,0.2)" : "0 1px 3px rgba(0,0,0,0.15)",
            transform: "translateX(-50%)",
            cursor: "grab",
            zIndex: 2,
            transition: dragging === "max" ? "none" : "left 0.1s",
          }}
        />
      </div>

      {/* Min/Max labels */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
        <span style={{ fontSize: 11, color: "var(--text-faint)" }}>${min}</span>
        <span style={{ fontSize: 11, color: "var(--text-faint)" }}>${max}</span>
      </div>
    </motion.div>
  );
}
