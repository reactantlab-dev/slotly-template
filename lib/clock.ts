/**
 * The only source of "now" for business logic.
 * Tests and demos freeze time with SLOTLY_NOW (ISO 8601, UTC). Never call `new Date()` for "now" elsewhere.
 */
export function now(): Date {
  const frozen = process.env.SLOTLY_NOW;
  if (!frozen) return new Date();
  const date = new Date(frozen);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`SLOTLY_NOW is not a valid ISO date: "${frozen}"`);
  }
  return date;
}
