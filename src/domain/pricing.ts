/**
 * DOMAIN LAYER — prices.
 * The market reference is the price range from servicesDatabase.json
 * (collected from OLX.uz Tashkent listings): priceFrom – priceTo.
 */
import type { MasterPrice, Service } from './types';

export type Verdict = 'below' | 'fair' | 'above';

/** If a service only has "от X", a quote above X × this factor is called high. */
export const OPEN_RANGE_FACTOR = 2;

/**
 * Compares a quoted price with the market range.
 *  below  — cheaper than the lowest market price (ask what is included)
 *  fair   — inside the range
 *  above  — more expensive than the highest market price
 * diff = % distance from the nearest edge of the range.
 */
export function priceVerdict(quote: number, s: Pick<Service, 'priceFrom' | 'priceTo'>): { label: Verdict; diff: number; openRange: boolean } {
  const openRange = s.priceTo == null;
  const hi = s.priceTo ?? s.priceFrom * OPEN_RANGE_FACTOR;
  if (quote < s.priceFrom) {
    return { label: 'below', diff: s.priceFrom ? Math.round(((quote - s.priceFrom) / s.priceFrom) * 100) : 0, openRange };
  }
  if (quote > hi) return { label: 'above', diff: Math.round(((quote - hi) / hi) * 100), openRange };
  return { label: 'fair', diff: 0, openRange };
}

/** Sum of ranges for a basket: from = Σ priceFrom, to = Σ priceTo (null if any is open). */
export function basketRange(services: Service[]): { from: number; to: number | null } {
  const from = services.reduce((a, s) => a + s.priceFrom, 0);
  const to = services.every((s) => s.priceTo != null) ? services.reduce((a, s) => a + (s.priceTo as number), 0) : null;
  return { from, to };
}

/**
 * Where a master's stated price sits in the market range: 0 = cheapest end,
 * 1 = most expensive end (clamped). For "от X" ranges, X×2 is the far end.
 */
export function rangePosition(price: number, s: Pick<Service, 'priceFrom' | 'priceTo'>): number {
  const hi = s.priceTo ?? s.priceFrom * OPEN_RANGE_FACTOR;
  if (hi <= s.priceFrom) return 0;
  return Math.min(1, Math.max(0, (price - s.priceFrom) / (hi - s.priceFrom)));
}

/** A master's stated price for a service, if any. */
export function priceOf(prices: MasterPrice[], serviceId: string): MasterPrice | undefined {
  return prices.find((p) => p.serviceId === serviceId);
}
