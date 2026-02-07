export function getCategoryEmoji(cat: string): string {
  const c = cat.toLowerCase();
  if (c.includes("jacket") || c.includes("coat") || c.includes("winter") || c.includes("cloth")) return "\u{1F9E5}";
  if (c.includes("monitor") || c.includes("screen") || c.includes("display")) return "\u{1F5A5}\uFE0F";
  if (c.includes("suitcase") || c.includes("luggage") || c.includes("travel")) return "\u{1F9F3}";
  if (c.includes("headphone") || c.includes("audio") || c.includes("earbud")) return "\u{1F3A7}";
  if (c.includes("shoe") || c.includes("sneaker") || c.includes("boot") || c.includes("running")) return "\u{1F45F}";
  if (c.includes("laptop") || c.includes("computer") || c.includes("notebook")) return "\u{1F4BB}";
  return "\u{1F4E6}";
}
