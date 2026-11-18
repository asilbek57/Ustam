// server/data.js
// ============================================================================
//  Data for the AI chat: ONE source — shared/data/servicesDatabase.json,
//  normalised by shared/normalize.js exactly like on the website, so the
//  bot's numbers and masters always match the pages.
// ============================================================================

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { normalizeDatabase } from '../shared/normalize.js'
import { formatNumber } from '../shared/stats.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const raw = JSON.parse(readFileSync(path.join(__dirname, '../shared/data/servicesDatabase.json'), 'utf8'))
const db = normalizeDatabase(raw)

export const getDatabase = () => db
export const getServices = async () => db.services
export const getMasters = async () => db.masters
export const getDistricts = async () => db.districts
export const getCategories = async () => db.categories

/** Accepts a service id, an exact Russian name or a part of it. */
export async function resolveService(ref) {
  if (!ref) return null
  const q = String(ref).toLowerCase().trim()
  return db.services.find((s) => s.id === ref) || db.services.find((s) => s.name.toLowerCase() === q) || db.services.find((s) => s.name.toLowerCase().includes(q)) || null
}

const WORDS = {
  ru: { cur: 'сум', from: (n) => `от ${n}`, free: 'бесплатно (при ремонте)', freeTo: (n) => `бесплатно – ${n}` },
  uz: { cur: "so'm", from: (n) => `${n} dan`, free: 'bepul (taʼmirda)', freeTo: (n) => `bepul – ${n}` },
  en: { cur: 'sum', from: (n) => `from ${n}`, free: 'free (with repair)', freeTo: (n) => `free – ${n}` },
}

/** "350 000 – 700 000 сум" / "от 120 000 сум" / "бесплатно – 50 000 сум" (in the reply language) */
export function formatRange(from, to, lang = 'ru') {
  const w = WORDS[lang] || WORDS.ru
  const n = (x) => `${formatNumber(x)} ${w.cur}`
  if (to == null) return from === 0 ? w.free : w.from(n(from))
  if (from === 0) return w.freeTo(n(to))
  return `${formatNumber(from)} – ${n(to)}`
}

/** 1250000 -> "1 250 000 сум" (used by marketAgent.js) */
export function formatUZS(n, opts = {}) {
  const { withSymbol = true, currency = 'сум' } = opts
  return formatNumber(n) + (withSymbol ? ` ${currency}` : '')
}
