export function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.3;
  return (
    <span style={{ color: "#f59e0b", fontSize: 14, letterSpacing: 1 }}>
      {"\u2605".repeat(full)}
      {half ? "\u00BD" : ""}
      {"\u2606".repeat(5 - full - (half ? 1 : 0))}
      <span style={{ color: "var(--text-muted)", fontSize: 12, marginLeft: 4 }}>{rating}</span>
    </span>
  );
}
