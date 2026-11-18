/**
 * APPLICATION LAYER — AI advisor (on-device, instant).
 *  matchTask()      free text (RU / UZ / EN) -> service ids from servicesDatabase
 *  whyText()        plain-language reasons for a recommended master (real facts only)
 *  explainRanking() summary for the masters list
 *  priceAdvice()    advice for the fair-price check
 */
import { matchServices } from '../../shared/matcher.js';
import type { Key } from '../i18n/dictionary';
import type { RankedMaster } from '../domain/recommendation';
import type { ID, Service } from '../domain/types';
import type { Verdict } from '../domain/pricing';

type T = (key: Key, params?: Record<string, string | number>) => string;

export function matchTask(text: string, services: Service[]): ID[] {
  return text.trim() ? matchServices(text, services) : [];
}

/** "phone confirmed · arrives in 30 минут · experience 7+ · stated price 150 000 сум (lower part of the market)" */
export function whyText(t: T, money: (n: number) => string, r: RankedMaster, selected: number): string {
  const m = r.master;
  const parts: string[] = [];
  if (selected > 1) parts.push(r.coverage === 1 ? t('ai.coversAll') : t('ai.covers', { a: r.covered.length, b: selected }));
  if (m.verified) parts.push(t('ai.verified'));
  if (m.responseTime) parts.push(t('ai.responds', { t: m.responseTime }));
  if (m.experienceLabel) parts.push(t('ai.exp', { e: m.experienceLabel }));
  if (r.knownTotal != null) {
    const where = r.pricePosition! < 0.34 ? t('ai.lowEnd') : r.pricePosition! > 0.66 ? t('ai.highEnd') : t('ai.midEnd');
    parts.push(`${t('ai.price', { p: money(r.knownTotal) })} (${where})`);
  }
  return parts.join(' · ');
}

export function explainRanking(t: T, money: (n: number) => string, ranked: RankedMaster[], district: string, districtName: string, selected: number): string {
  if (!ranked.length) return t('exp.none');
  const best = ranked.reduce((a, b) => (b.score > a.score ? b : a));
  return [
    t('exp.found', { n: ranked.length, d: district ? t('exp.inDistrict', { d: districtName }) : '' }),
    t('exp.best', { name: best.master.name, why: whyText(t, money, best, selected) }),
    t('exp.honest'),
  ].join(' ');
}

export function priceAdvice(t: T, v: Verdict | null, warranty: string): string {
  if (!v) return t('pc.adviceNone');
  if (v === 'below') return t('pc.adviceBelow', { w: warranty && warranty !== '—' ? warranty : '—' });
  if (v === 'above') return t('pc.adviceAbove');
  return t('pc.adviceFair');
}
