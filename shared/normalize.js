// shared/normalize.js
// ============================================================================
//  Adapter for the ONE data source of the project:
//      shared/data/servicesDatabase.json   (OLX.uz Tashkent price base)
//
//  Turns the raw file into the shapes the website and the chat server use:
//    - services get their categoryId
//    - "masters" and "verifiedMasters" are merged by OLX listing id
//      (a verified master = same listing + confirmed phone number)
//    - each master gets the prices that are REALLY stated for them:
//        * from the verified price list (source: 'verified'), or
//        * parsed from the listing text, e.g. "чистка 150 000 сум" (source: 'listing')
//      Nothing is invented: if a price is not stated, it stays unknown.
//    - response time / experience become numbers for sorting.
//  Used by: src/data/demoRepository.ts, server/data.js, scripts/build_sql.mjs
// ============================================================================

/** Which service a price phrase refers to (matched against the master's own serviceIds). */
const PRICE_RULES = [
  [/диагност/i, ['-diagnostic']],
  [/капитальн/i, ['-general-repair']],
  [/подшипник/i, ['-bearing-replace']],
  [/барабан/i, ['-drum-repair']],
  [/шланг/i, ['-hose-replace']],
  [/компрессор/i, ['-compressor-replace']],
  [/no.?frost/i, ['-nofrost-repair']],
  [/чистк/i, ['-cleaning-full', '-filter-cleaning']],
  [/заправк/i, ['-freon-refill']],
  [/профилактик/i, ['-prevention']],
  [/установк/i, ['-install-standard', '-install']],
  [/ремонт/i, ['-repair-general', '-general-repair']],
]

/** "150 000" / "110 800" -> number; null if none. */
function parseSum(text) {
  const m = String(text).match(/(\d{1,3}(?:[\s ]\d{3})+|\d+)\s*(?:сум|сўм|so'm)/i)
  return m ? Number(m[1].replace(/[\s ]/g, '')) : null
}

/** Map a free-text price phrase to one of the master's services. */
function serviceForPhrase(phrase, serviceIds) {
  for (const [re, suffixes] of PRICE_RULES) {
    if (!re.test(phrase)) continue
    for (const suf of suffixes) {
      const id = serviceIds.find((sid) => sid.endsWith(suf))
      if (id) return id
    }
  }
  return null
}

/** "30 минут" -> 30, "1 час" -> 60, "1–2 часа" -> 120, "день обращения" -> 480 */
export function responseMinutes(label) {
  const t = String(label || '').toLowerCase()
  if (/круглосуточно/.test(t)) return 90
  if (/день/.test(t)) return 480
  const nums = (t.match(/\d+/g) || []).map(Number)
  if (!nums.length) return 240
  const max = Math.max(...nums)
  return /мин/.test(t) ? max : max * 60
}

/** "7+" -> 7 */
const years = (label) => Number(String(label || '').match(/\d+/)?.[0] || 0)

/**
 * @param {any} raw  parsed servicesDatabase.json
 * @returns {{meta:any, districts:string[], categories:any[], services:any[], masters:any[]}}
 */
export function normalizeDatabase(raw) {
  const categories = raw.categories.map((c, i) => ({ id: c.id, title: c.title, icon: c.icon, sortOrder: i }))
  const services = raw.categories.flatMap((c) =>
    c.services.map((s) => ({
      id: s.id,
      categoryId: c.id,
      name: s.name,
      priceFrom: s.priceFrom,
      priceTo: s.priceTo ?? null,
      unit: s.unit,
      description: s.description,
      warranty: s.warranty,
      districts: s.district || [],
      source: s.source || {},
    })),
  )
  const svcById = new Map(services.map((s) => [s.id, s]))
  const catByTitle = new Map(raw.categories.map((c) => [c.title, c.id]))

  const verifiedByListing = new Map((raw.verifiedMasters || []).map((v) => [v.olxListingId, v]))
  const usedVerified = new Set()

  const build = (m, v) => {
    const serviceIds = [...new Set([...(m.serviceIds || []), ...((v && v.serviceIds) || [])])].filter((id) => svcById.has(id))
    const prices = new Map()
    // 1) verified price list (phone confirmed by OLX)
    for (const p of (v && v.prices) || []) {
      const id = serviceForPhrase(p.service, serviceIds)
      if (id && !prices.has(id)) prices.set(id, { serviceId: id, priceFrom: p.priceFrom, priceTo: p.priceTo ?? null, source: 'verified' })
    }
    // 2) prices written in the listing text
    for (const phrase of String(m.note || '').split(/[,.;:«»]/)) {
      const sum = parseSum(phrase)
      if (sum == null) continue
      const id = serviceForPhrase(phrase, serviceIds)
      if (id && !prices.has(id)) prices.set(id, { serviceId: id, priceFrom: sum, priceTo: null, source: 'listing' })
    }
    const specialization = [...new Set([...(m.specialization || []), ...((v && v.specialization) || [])])]
    return {
      id: m.id,
      name: v ? v.name : m.name,
      title: v ? v.service : m.name,
      type: (m.type || 'Частный мастер') === 'Сервисный центр' ? 'center' : 'private',
      categoryIds: [...new Set(serviceIds.map((id) => svcById.get(id).categoryId).concat(specialization.map((s) => catByTitle.get(s)).filter(Boolean)))],
      districts: m.districts || (v && v.districts) || [],
      location: v ? v.districts?.[0] ?? null : null,
      experienceYears: years(v ? v.experienceYears : m.experienceYears),
      experienceLabel: (v ? v.experienceYears : m.experienceYears) || null,
      responseTime: (v ? v.responseTime : m.responseTime) || null,
      responseMinutes: responseMinutes(v ? v.responseTime : m.responseTime),
      serviceIds,
      prices: [...prices.values()],
      url: (v && v.url) || m.url || null,
      olxListingId: m.olxListingId || (v && v.olxListingId) || null,
      note: v ? v.note : m.note,
      verified: Boolean(v),
      phone: v ? v.phone : null,
      phoneDisplay: v ? v.phoneDisplay : null,
      verifiedAt: v ? v.verifiedAt : null,
      rating: null, // the source has no ratings — we never invent them
    }
  }

  const masters = (raw.masters || []).map((m) => {
    const v = m.olxListingId ? verifiedByListing.get(m.olxListingId) : null
    if (v) usedVerified.add(v.id)
    return build(m, v)
  })
  // verified masters that have no matching listing in "masters"
  for (const v of raw.verifiedMasters || []) {
    if (usedVerified.has(v.id)) continue
    masters.push(build({ ...v, id: v.id, type: 'Частный мастер', districts: v.districts }, v))
  }
  // verified first, then the rest in source order
  masters.sort((a, b) => Number(b.verified) - Number(a.verified))

  return { meta: raw.meta, districts: raw.districts || [], categories, services, masters }
}
