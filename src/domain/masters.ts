/**
 * DOMAIN LAYER — registered masters.
 * Converts what a master fills in the cabinet into the public Master shape
 * used everywhere (cards, ranking, map), and validates the profile.
 */
import { responseMinutes } from '../../shared/normalize.js';
import type { ID, Master, MasterProfileInput, Service } from './types';

export const EMPTY_PROFILE: MasterProfileInput = {
  name: '', title: '', bio: '', type: 'private', categoryIds: [], serviceIds: [], prices: [],
  districts: [], point: null, workshopAddress: null, experienceYears: 1, responseTime: '1 час',
  phone: '', telegram: null, photo: null, published: false,
};

export function profileToMaster(id: ID, userId: ID, p: MasterProfileInput, services: Service[]): Master {
  const svc = new Map(services.map((s) => [s.id, s]));
  const serviceIds = p.serviceIds.filter((s) => svc.has(s));
  return {
    id,
    userId,
    registered: true,
    name: p.name,
    title: p.title || p.name,
    type: p.type,
    categoryIds: [...new Set([...p.categoryIds, ...serviceIds.map((s) => svc.get(s)!.categoryId)])],
    districts: p.districts,
    location: p.point?.label ?? null,
    experienceYears: p.experienceYears,
    experienceLabel: p.experienceYears ? `${p.experienceYears}` : null,
    responseTime: p.responseTime || null,
    responseMinutes: responseMinutes(p.responseTime),
    serviceIds,
    prices: p.prices.filter((x) => serviceIds.includes(x.serviceId) && x.priceFrom >= 0).map((x) => ({ ...x, source: 'own' as const })),
    url: null,
    olxListingId: null,
    note: p.bio,
    verified: false,
    phone: p.phone || null,
    phoneDisplay: p.phone || null,
    verifiedAt: null,
    rating: null,
    bio: p.bio,
    photo: p.photo,
    telegram: p.telegram,
    point: p.point,
    workshopAddress: p.workshopAddress,
  };
}

/** Problems that block publishing (i18n keys). */
export function profileProblems(p: MasterProfileInput): string[] {
  const out: string[] = [];
  if (p.name.trim().length < 2) out.push('pro.err.name');
  if (!/^\+?\d[\d\s()-]{7,}$/.test(p.phone.trim())) out.push('pro.err.phone');
  if (!p.serviceIds.length) out.push('pro.err.services');
  if (!p.districts.length && !p.point) out.push('pro.err.area');
  return out;
}

/** "@username" normalised; accepts t.me links. */
export function normalizeTelegram(v: string | null): string | null {
  if (!v) return null;
  const m = v.trim().replace(/^https?:\/\/t\.me\//i, '').replace(/^@/, '');
  return m ? `@${m}` : null;
}
