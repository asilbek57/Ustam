// shared/stats.js
// ============================================================================
//  Price statistics — ONE implementation used by the website (TypeScript
//  imports this file) AND by the Node chat server. So the numbers the AI
//  assistant says are always identical to the numbers on the page.
//  Pure functions, no browser/Node APIs.
// ============================================================================

/** Median of a numeric array. @param {number[]} values */
export function median(values) {
  if (!values || values.length === 0) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/** Q1 / Q3 quartiles. @param {number[]} values */
export function quartiles(values) {
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  const lower = s.slice(0, mid)
  const upper = s.slice(s.length % 2 === 0 ? mid : mid + 1)
  return { q1: lower.length ? median(lower) : s[0], q3: upper.length ? median(upper) : s[s.length - 1] }
}

/**
 * Removes outliers with the 1.5×IQR rule (junk quotes like "1 000 sum" or
 * "×3 price"). With fewer than 4 samples everything is kept.
 * @param {number[]} values
 */
export function removeOutliers(values) {
  if (!values || values.length < 4) return [...(values || [])]
  const { q1, q3 } = quartiles(values)
  const iqr = q3 - q1
  return values.filter((v) => v >= q1 - 1.5 * iqr && v <= q3 + 1.5 * iqr)
}

/**
 * min / average / median / max after outlier removal.
 * @param {number[]} values
 * @returns {{min:number,max:number,average:number,median:number,count:number,rawCount:number}|null}
 */
export function summarize(values) {
  const clean = removeOutliers(values || [])
  if (!clean.length) return null
  const s = [...clean].sort((a, b) => a - b)
  return {
    min: s[0],
    max: s[s.length - 1],
    average: Math.round(s.reduce((a, b) => a + b, 0) / s.length),
    median: Math.round(median(s)),
    count: s.length,
    rawCount: values.length,
  }
}

/** ±15% band around the median counts as a fair price. */
export const FAIR_BAND = 15

/**
 * Verdict for a quoted price vs the market median.
 * @returns {{label:'cheap'|'fair'|'overpriced', diff:number}}
 */
export function verdict(price, med) {
  if (!med || price == null) return { label: 'fair', diff: 0 }
  const diff = ((price - med) / med) * 100
  if (diff <= -FAIR_BAND) return { label: 'cheap', diff }
  if (diff >= FAIR_BAND) return { label: 'overpriced', diff }
  return { label: 'fair', diff }
}

/** "2026-05" from an ISO date. */
export function monthKey(iso) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Continuous monthly series (last N months, gaps = null) of median price and count.
 * @param {{price:number, createdAt:string}[]} reports
 */
export function monthlySeries(reports, monthsBack = 6, now = new Date('2026-11-17T12:00:00Z')) {
  const by = new Map()
  for (const r of reports || []) {
    const k = monthKey(r.createdAt)
    if (!k) continue
    if (!by.has(k)) by.set(k, [])
    by.get(k).push(r.price)
  }
  const out = []
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const arr = by.get(k) || []
    const st = summarize(arr)
    out.push({ month: k, monthIndex: d.getMonth(), median: st ? st.median : null, count: arr.length })
  }
  return out
}

/** Price trend: last 2 months vs previous 2 months (% change of medians). */
export function trend(reports) {
  const s = monthlySeries(reports)
  const a = summarize(s.slice(-2).flatMap((m) => (m.median ? [m.median] : [])))
  const b = summarize(s.slice(-4, -2).flatMap((m) => (m.median ? [m.median] : [])))
  if (!a || !b) return { dir: 'flat', pct: 0 }
  const pct = Math.round(((a.average - b.average) / b.average) * 100)
  return { dir: pct > 2 ? 'up' : pct < -2 ? 'down' : 'flat', pct }
}

/** 1250000 -> "1 250 000" */
export function formatNumber(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/** 1250000 -> "1 250 000 sum" (currency word is passed in for i18n) */
export function formatUZS(n, currency = 'sum') {
  return `${formatNumber(n)} ${currency}`
}
