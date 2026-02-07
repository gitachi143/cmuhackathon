import { motion } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.08 }}
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        position: "relative",
        width: 44,
        height: 24,
        borderRadius: 99,
        border: "1px solid var(--border-default)",
        background: isDark ? "#1e3a5f" : "#e0e7ff",
        cursor: "pointer",
        padding: 0,
        display: "flex",
        alignItems: "center",
        transition: "background 0.3s ease, border-color 0.3s ease",
      }}
    >
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        style={{
          width: 18,
          height: 18,
          borderRadius: 99,
          background: isDark ? "#60a5fa" : "#f59e0b",
          marginLeft: isDark ? 22 : 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          boxShadow: isDark
            ? "0 0 6px rgba(96,165,250,0.5)"
            : "0 0 6px rgba(245,158,11,0.4)",
        }}
      >
        {isDark ? "\u{1F319}" : "\u2600\uFE0F"}
      </motion.div>
    </motion.button>
  );
}
