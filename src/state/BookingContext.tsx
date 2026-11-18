/**
 * PRESENTATION LAYER — booking state (the "order in progress").
 * Holds address, date/time, visit type, task description, cart and chosen master.
 * A reducer keeps every state change explicit and testable.
 */
import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import type { GeoPoint, ID, VisitType } from '../domain/types';

export interface Schedule {
  dayOffset: number; // 0 = today, 1 = tomorrow, ...
  hour: number;
  minute: number;
}

export interface BookingState {
  address: string;
  point: GeoPoint | null;   // customer's location on the map
  schedule: Schedule | null;
  visitType: VisitType;
  description: string;
  categorySlug: string | null; // category id
  cart: Record<ID, number>; // serviceId -> quantity
  masterId: ID | null;
}

type Action =
  | { type: 'setAddress'; address: string }
  | { type: 'setPoint'; point: GeoPoint | null }
  | { type: 'setSchedule'; schedule: Schedule }
  | { type: 'setVisitType'; visitType: VisitType }
  | { type: 'setDescription'; description: string }
  | { type: 'enterCategory'; slug: string }
  | { type: 'setQty'; serviceId: ID; qty: number }
  | { type: 'addMany'; serviceIds: ID[] }
  | { type: 'chooseMaster'; masterId: ID | null }
  | { type: 'resetOrder' };

const ADDRESS_KEY = 'ustam.address';
const POINT_KEY = 'ustam.point';
function loadPoint(): GeoPoint | null {
  try { return JSON.parse(localStorage.getItem(POINT_KEY) || 'null'); } catch { return null; }
}
const DEFAULT_ADDRESS = '';
function loadAddress(): string {
  try {
    return localStorage.getItem(ADDRESS_KEY) || DEFAULT_ADDRESS;
  } catch {
    return DEFAULT_ADDRESS;
  }
}

const initial: BookingState = {
  address: DEFAULT_ADDRESS, point: null, schedule: null, visitType: 'home', description: '',
  categorySlug: null, cart: {}, masterId: null,
};

function reducer(s: BookingState, a: Action): BookingState {
  switch (a.type) {
    case 'setAddress':
      return { ...s, address: a.address };
    case 'setPoint':
      return { ...s, point: a.point };
    case 'setSchedule':
      return { ...s, schedule: a.schedule };
    case 'setVisitType':
      return { ...s, visitType: a.visitType, masterId: null };
    case 'setDescription':
      return { ...s, description: a.description };
    case 'enterCategory':
      // Switching category starts a fresh basket.
      return s.categorySlug === a.slug ? s : { ...s, categorySlug: a.slug, cart: {}, description: '', masterId: null };
    case 'setQty': {
      const cart = { ...s.cart };
      if (a.qty <= 0) delete cart[a.serviceId];
      else cart[a.serviceId] = a.qty;
      return { ...s, cart, masterId: null };
    }
    case 'addMany': {
      const cart = { ...s.cart };
      for (const id of a.serviceIds) cart[id] = cart[id] || 1;
      return { ...s, cart, masterId: null };
    }
    case 'chooseMaster':
      return { ...s, masterId: a.masterId };
    case 'resetOrder':
      return { ...initial, address: s.address, point: s.point, visitType: s.visitType };
  }
}

const Ctx = createContext<{ state: BookingState; dispatch: React.Dispatch<Action> } | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial, (i) => ({ ...i, address: loadAddress(), point: loadPoint() }));

  // Persist only the address — everything else is per-order.
  useEffect(() => {
    try {
      localStorage.setItem(ADDRESS_KEY, state.address);
    } catch {
      /* storage unavailable */
    }
  }, [state.address]);
  useEffect(() => {
    try { localStorage.setItem(POINT_KEY, JSON.stringify(state.point)); } catch { /* ignore */ }
  }, [state.point]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBooking() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useBooking must be used inside <BookingProvider>');
  return ctx;
}

// ---- helpers ----------------------------------------------------------

export function scheduleToDate(s: Schedule): Date {
  const d = new Date();
  d.setDate(d.getDate() + s.dayOffset);
  d.setHours(s.hour, s.minute, 0, 0);
  return d;
}

/** "Today, 14:30" — day words come from i18n. */
export function formatSchedule(s: Schedule, today: string, tomorrow: string, locale: string): string {
  const day = s.dayOffset === 0 ? today : s.dayOffset === 1 ? tomorrow
    : scheduleToDate(s).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
  return `${day}, ${String(s.hour).padStart(2, '0')}:${String(s.minute).padStart(2, '0')}`;
}
