/**
 * PRESENTATION LAYER — user preferences: language, theme, Tashkent district.
 * Saved in localStorage (when available) and exposed with helpers:
 *   t(key, params)  — interface text in the current language
 *   tc(key, ru)     — catalog term (service/category id, unit, district…)
 *   money(n)        — "1 250 000 сум"
 *   range(from, to) — "350 000 – 700 000 сум" / "от 120 000 сум"
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { formatNumber } from '../../shared/stats.js';
import { tr } from '../../shared/catalogI18n.js';
import { D, LANG_INDEX, type Key, type Lang } from '../i18n/dictionary';

export type Theme = 'light' | 'dark';

interface Prefs {
  lang: Lang;
  theme: Theme;
  district: string; // '' = all of Tashkent
  setLang: (l: Lang) => void;
  setTheme: (t: Theme) => void;
  setDistrict: (d: string) => void;
  t: (key: Key, params?: Record<string, string | number>) => string;
  tc: (key: string, ru?: string) => string;
  money: (n: number) => string;
  range: (from: number, to: number | null) => string;
  unit: (u: string) => string; // '' when the source has no real unit
}

const KEY = 'ustam.prefs.v2';

/** Russian plural: 1 год, 2 года, 5 лет, 21 год, 11 лет. */
function pluralRu(n: number, [one, few, many]: string[]): string {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many ?? one;
  if (b === 1) return one;
  if (b >= 2 && b <= 4) return few ?? one;
  return many ?? one;
}

function load(): Partial<Pick<Prefs, 'lang' | 'theme' | 'district'>> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}

/** First visit: Russian unless the browser says Uzbek/English; theme from OS. */
function defaults() {
  const nav = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'ru';
  const lang: Lang = nav.startsWith('uz') ? 'uz' : nav.startsWith('en') ? 'en' : 'ru';
  const dark = typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
  return { lang, theme: (dark ? 'dark' : 'light') as Theme, district: '' };
}

const Ctx = createContext<Prefs | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(() => ({ ...defaults(), ...load() }));

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable */
    }
    document.documentElement.dataset.theme = state.theme;
    document.documentElement.lang = state.lang;
  }, [state]);

  const setLang = useCallback((lang: Lang) => setState((s) => ({ ...s, lang })), []);
  const setTheme = useCallback((theme: Theme) => setState((s) => ({ ...s, theme })), []);
  const setDistrict = useCallback((district: string) => setState((s) => ({ ...s, district })), []);

  const value = useMemo<Prefs>(() => {
    const i = LANG_INDEX[state.lang];
    const t = (key: Key, params?: Record<string, string | number>) => {
      let s: string = D[key]?.[i] ?? key;
      if (params) {
        // plural forms: "{n:год|года|лет}" picks the right Russian word for n
        s = s.replace(/\{(\w+):([^}]+)\}/g, (_, k: string, forms: string) => pluralRu(Number(params[k]), forms.split('|')));
        for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v));
      }
      return s;
    };
    const currency = D['common.currency'][i];
    const money = (n: number) => `${formatNumber(n)} ${currency}`;
    return {
      ...state, setLang, setTheme, setDistrict, t, money,
      tc: (key: string, ru?: string) => tr(key, state.lang, ru),
      unit: (u: string) => (u && u !== 'от' ? tr(u, state.lang, u) : ''),
      // price range exactly as the source states it
      range: (from: number, to: number | null) => {
        if (to == null) return from === 0 ? t('price.free') : t('price.from', { a: money(from) });
        if (from === 0) return t('price.upTo', { b: money(to) });
        return `${formatNumber(from)} – ${money(to)}`;
      },
    };
  }, [state, setLang, setTheme, setDistrict]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrefs(): Prefs {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePrefs must be used inside <PrefsProvider>');
  return v;
}
