import { useTheme } from "../context/ThemeContext";

type TagColorMap = Record<string, { bg: string; text: string }>;

const DARK_COLORS: TagColorMap = {
  "Best overall": { bg: "#1e3a5f", text: "#93c5fd" },
  "Best value": { bg: "#064e3b", text: "#6ee7b7" },
  "Fastest shipping": { bg: "#78350f", text: "#fcd34d" },
  "Budget pick": { bg: "#312e81", text: "#a5b4fc" },
  "Premium pick": { bg: "#701a75", text: "#f0abfc" },
};

const LIGHT_COLORS: TagColorMap = {
  "Best overall": { bg: "#dbeafe", text: "#1e40af" },
  "Best value": { bg: "#d1fae5", text: "#065f46" },
  "Fastest shipping": { bg: "#fef3c7", text: "#92400e" },
  "Budget pick": { bg: "#e0e7ff", text: "#3730a3" },
  "Premium pick": { bg: "#fae8ff", text: "#86198f" },
};

export function useTagColors(): TagColorMap {
  const { isDark } = useTheme();
  return isDark ? DARK_COLORS : LIGHT_COLORS;
}
