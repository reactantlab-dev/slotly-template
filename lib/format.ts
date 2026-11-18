const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** 5500 → "$55", 3550 → "$35.50" */
export function formatPrice(priceCents: number): string {
  return priceFormatter.format(priceCents / 100);
}

/** 30 → "30 min", 60 → "1 h", 90 → "1 h 30 min" */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
