/**
 * DOMAIN LAYER — AI ranking of REAL masters (servicesDatabase.json).
 *
 * The source has no ratings, so nothing is invented. The AI compares what
 * is actually known about each master:
 *   coverage    — share of the client's services the master does
 *   price       — the master's stated price vs the OLX market range
 *                 (only when a price is really stated; otherwise neutral)
 *   verified    — phone confirmed via OLX
 *   speed       — stated response time ("30 минут", "1–2 часа", …)
 *   experience  — stated years ("7+")
 * Filters: district (the master must go there), visit type (workshop =
 * service centres), master type, verified only.
 */
import { priceOf, rangePosition } from './pricing';
import type { ID, Master, Service, VisitType } from './types';

export type Strategy = 'ai_best' | 'cheapest' | 'fastest' | 'experienced';
export const STRATEGIES: Strategy[] = ['ai_best', 'cheapest', 'fastest', 'experienced'];
export type MasterTypeFilter = 'any' | 'private' | 'center';
export type Badge = 'aiPick' | 'verified' | 'bestPrice' | 'fastest' | 'priceKnown';

export interface RankQuery {
  serviceIds: ID[];          // selected services (may be empty)
  categoryId?: ID | null;    // scope when nothing is selected
  district: string | null;   // client's district (null = any)
  visitType: VisitType | 'any';
  strategy: Strategy;
  type: MasterTypeFilter;
  onlyVerified: boolean;
}

export interface RankedMaster {
  master: Master;
  coverage: number;              // 0..1
  covered: ID[];                 // selected services this master does
  knownTotal: number | null;     // sum of stated prices if ALL covered services have one
  pricePosition: number | null;  // 0 = cheapest end of market, 1 = most expensive
  score: number;                 // 0..1 AI score
  badges: Badge[];
}

/** Tunable weights of the AI score (sum = 1). */
export const WEIGHTS = { coverage: 0.35, price: 0.2, verified: 0.2, speed: 0.15, experience: 0.1 };
const NEUTRAL_PRICE = 0.45; // unknown price: slightly below average, never a bonus
const clamp = (v: number) => Math.min(1, Math.max(0, v));

export function rankMasters(masters: Master[], services: Service[], q: RankQuery): RankedMaster[] {
  const svc = new Map(services.map((s) => [s.id, s]));
  const out: RankedMaster[] = [];

  for (const m of masters) {
    if (q.onlyVerified && !m.verified) continue;
    if (q.type !== 'any' && m.type !== q.type) continue;
    if (q.visitType === 'workshop' && m.type !== 'center') continue; // workshop = service centre
    if (q.district && !m.districts.includes(q.district) && m.location !== q.district) continue;

    let covered: ID[];
    let coverage: number;
    if (q.serviceIds.length) {
      covered = q.serviceIds.filter((id) => m.serviceIds.includes(id));
      if (!covered.length) continue;
      coverage = covered.length / q.serviceIds.length;
    } else {
      if (q.categoryId && !m.categoryIds.includes(q.categoryId)) continue;
      covered = [];
      coverage = 1;
    }

    // price: only from prices really stated for this master
    const scope = covered.length ? covered : m.serviceIds;
    const stated = scope.map((id) => ({ p: priceOf(m.prices, id), s: svc.get(id) })).filter((x) => x.p && x.s);
    const pricePosition = stated.length
      ? stated.reduce((a, x) => a + rangePosition(x.p!.priceFrom, x.s!), 0) / stated.length
      : null;
    const knownTotal = covered.length && stated.length === covered.length ? stated.reduce((a, x) => a + x.p!.priceFrom, 0) : null;

    const priceScore = pricePosition == null ? NEUTRAL_PRICE : 1 - pricePosition;
    const speed = clamp(1 - (m.responseMinutes - 30) / 450);
    const experience = clamp(m.experienceYears / 10);
    const score =
      WEIGHTS.coverage * coverage + WEIGHTS.price * priceScore + WEIGHTS.verified * (m.verified ? 1 : 0) +
      WEIGHTS.speed * speed + WEIGHTS.experience * experience;

    out.push({ master: m, coverage, covered, knownTotal, pricePosition, score, badges: [] });
  }

  const priceKey = (r: RankedMaster) => r.knownTotal ?? (r.pricePosition != null ? 1e12 + r.pricePosition : 2e12);
  const sorters: Record<Strategy, (a: RankedMaster, b: RankedMaster) => number> = {
    ai_best: (a, b) => b.score - a.score,
    cheapest: (a, b) => priceKey(a) - priceKey(b) || b.score - a.score,
    fastest: (a, b) => a.master.responseMinutes - b.master.responseMinutes || b.score - a.score,
    experienced: (a, b) => b.master.experienceYears - a.master.experienceYears || b.score - a.score,
  };
  out.sort(sorters[q.strategy]);
  attachBadges(out);
  return out;
}

function attachBadges(list: RankedMaster[]) {
  if (!list.length) return;
  const best = list.reduce((a, b) => (b.score > a.score ? b : a));
  const withPrice = list.filter((r) => r.pricePosition != null);
  const cheapest = withPrice.length > 1 ? withPrice.reduce((a, b) => ((b.knownTotal ?? b.pricePosition!) < (a.knownTotal ?? a.pricePosition!) ? b : a)) : null;
  const fastest = list.reduce((a, b) => (b.master.responseMinutes < a.master.responseMinutes ? b : a));
  for (const r of list) {
    if (r === best) r.badges.push('aiPick');
    if (r.master.verified) r.badges.push('verified');
    if (r === cheapest) r.badges.push('bestPrice');
    if (r === fastest && list.length > 1) r.badges.push('fastest');
    if (r.pricePosition != null && r !== cheapest) r.badges.push('priceKnown');
  }
}

/** The single best option for a set of services (used by "AI recommends"). */
export function bestOption(masters: Master[], services: Service[], serviceIds: ID[], district: string | null): RankedMaster | null {
  if (!serviceIds.length) return null;
  return rankMasters(masters, services, {
    serviceIds, district, visitType: 'any', strategy: 'ai_best', type: 'any', onlyVerified: false,
  })[0] ?? null;
}
