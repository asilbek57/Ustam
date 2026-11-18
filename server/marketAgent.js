// server/marketAgent.js
// ============================================================================
//  Агент анализа рынка. Ищет ЖИВЫЕ цены на бытовых площадках Узбекистана
//  (сейчас — OLX.uz), извлекает цены из объявлений, фильтрует выбросы методом
//  IQR и считает min / медиану / среднее / max. Используется как инструмент
//  LLM-агента (analyze_market в tools.js) — чтобы бот мог ответить «сколько
//  реально стоит на OLX» вместо данных из встроенной базы.
//
//  Почему OLX.uz: крупнейшая доска объявлений UZ, карточки маркированы
//  data-cy="l-card". Без API-ключа, без зависимостей.
//
//  ВАЖНО про TLS-фингерпринт: Node fetch (undici) OLX.uz БЛОКИРУЕТ (403) —
//  WAF ловит TLS-handshake undici как не-браузер. curl с теми же заголовками
//  проходит (HTTP 200). Поэтому запрос делаем ЧЕРЕЗ curl subprocess; если curl
//  не установлен — fallback на Node fetch (сработает не всегда, но честно).
//
//  Честность:
//   • Если fetch упал (сеть/блок/таймаут) — возвращаем {error}, и LLM-агент
//     откатывается на get_price_info (база Ustam), честно говоря пользователю,
//     что живые данные сейчас недоступны.
//   • Парсинг regex'ом по HTML — хрупок при редизайне OLX. IQR-фильтр сглаживает
//     мусорные цены (кредитные виджеты, аксессуары), а медиана устойчива к ним.
//   • Это не официальное API OLX: для продакшна с большим трафиком нужно
//     партнёрство/официальный API, иначе IP могут забанить.
// ============================================================================

import { formatUZS } from './data.js'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const OLX_BASE = 'https://www.olx.uz'
const FETCH_TIMEOUT_MS = 15000
const MIN_PRICES_FOR_STATS = 3 // меньше — не считаем статистику, просто список

// OLX использует слаги городов/регионов в пути: /tashkent/list/q-.../.
// Если город не сопоставлен — ищем по всему Узбекистану.
const CITY_SLUGS = {
  tashkent: 'tashkent',
  ташкент: 'tashkent',
  samarkand: 'samarkand',
  самарканд: 'samarkand',
  bukhara: 'bukhara',
  бухара: 'bukhara',
  namangan: 'namangan',
  наманган: 'namangan',
  andijan: 'andijan',
  андижан: 'andijan',
  fergana: 'fergana',
  фергана: 'fergana',
}

function citySlug(city) {
  if (!city) return null
  return CITY_SLUGS[String(city).toLowerCase().trim()] || null
}

// URL поиска OLX: кодируем запрос как кебаб-слаг (как делает сам OLX).
function olxSearchUrl(query, city) {
  const q = String(query || '')
    .trim()
    .toLowerCase()
    .replace(/[\s]+/g, '-') // пробелы → дефисы
    .replace(/[^a-zа-я0-9-]/gi, '') // выкидываем пунктуацию
  const slug = citySlug(city)
  const path = slug ? `/${slug}/list/q-${q}/` : `/list/q-${q}/`
  return `${OLX_BASE}${path}`
}

// ============================================================================
//  Публичный метод — точка входа для tools.js и /api/market
// ============================================================================
/**
 * Найти живые цены на OLX.uz по запросу и посчитать статистику.
 * @param {string} query  что ищем ("стиральная машина", "ремонт холодильника")
 * @param {string} [city] город (Tashkent, Samarkand, ...) — опционально
 * @returns {Promise<object>} статистика + примеры объявлений, или {error}
 */
export async function analyzeMarket({ query, city } = {}) {
  if (!query || !String(query).trim()) {
    return { error: 'query required', query, city }
  }
  const url = olxSearchUrl(query, city)
  let html
  try {
    html = await fetchOlxHtml(url)
  } catch (e) {
    return {
      source: 'olx.uz',
      query,
      city: city || null,
      url,
      error: String((e && e.message) || e),
      hint: 'живые данные недоступны — используй get_price_info из базы',
    }
  }

  const listings = parseOlxCards(html)
  const priced = listings.filter((l) => l.price != null)
  const samples = priced.slice(0, 5)

  if (priced.length < MIN_PRICES_FOR_STATS) {
    return {
      source: 'olx.uz',
      query,
      city: city || null,
      url,
      fetchedAt: new Date().toISOString(),
      count: priced.length,
      totalListings: listings.length,
      samples,
      note: priced.length === 0
        ? 'не нашёл объявлений с ценой (возможно, у услуг цена «договорная»). Используй get_price_info из базы.'
        : `мало цен для статистики (${priced.length}). Используй get_price_info.`,
    }
  }

  const stats = computeStats(priced.map((l) => l.price))
  return {
    source: 'olx.uz',
    query,
    city: city || null,
    url,
    fetchedAt: new Date().toISOString(),
    totalListings: listings.length,
    count: stats.count,
    filteredCount: stats.filteredCount,
    outliersRemoved: stats.outliersRemoved,
    min: stats.min,
    median: stats.median,
    mean: stats.mean,
    max: stats.max,
    currency: 'UZS',
    formatted: {
      min: formatUZS(stats.min),
      median: formatUZS(stats.median),
      mean: formatUZS(stats.mean),
      max: formatUZS(stats.max),
    },
    samples: samples.map((s) => ({ ...s, formatted: formatUZS(s.price) })),
  }
}

// ============================================================================
//  Fetch HTML с OLX.uz
// ============================================================================
// OLX.uz WAF БЛОКИРУЕТ Node fetch (undici): его TLS-handshake отличается от
// браузерного/curl, и антибот отдаёт 403 на те же заголовки, под которыми
// curl получает 200. Поэтому запрос делаем ЧЕРЕЗ curl subprocess (он есть на
// всех Linux/macOS и Windows 10+). Если curl не установлен — fallback на
// Node fetch (может 403-нуть, но тогда analyzeMarket вернёт {error} и агент
// откатится на get_price_info).
const OLX_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

async function fetchOlxHtml(url) {
  // 1) Основной путь — curl subprocess (обходит TLS-фп блокировку OLX).
  if (curlAvailable !== false) {
    try {
      const { stdout } = await execFileAsync(
        'curl',
        [
          '-sS',
          '--max-time', String(Math.floor(FETCH_TIMEOUT_MS / 1000)),
          '-L', // следовать редиректам
          '-A', OLX_UA,
          '-H', 'Accept: text/html,application/xhtml+xml',
          '-H', 'Accept-Language: ru,en;q=0.8',
          '-w', '\n%{http_code}', // HTTP-статус отдельной последней строкой
          url,
        ],
        { timeout: FETCH_TIMEOUT_MS + 5000, maxBuffer: 10 * 1024 * 1024 },
      )
      const lastNl = stdout.lastIndexOf('\n')
      const code = parseInt(stdout.slice(lastNl + 1).trim(), 10)
      const body = stdout.slice(0, lastNl)
      if (code === 200 && body) return body
      // 429/503 — транзиентно, один retry через паузу.
      if (code === 429 || code === 503) {
        await new Promise((r) => setTimeout(r, 1200))
        return fetchOlxHtmlViaCurl(url) // одна повторная попытка без рекурсивного разрастания
      }
      const err = new Error(`OLX HTTP ${code || 'unknown'}`)
      err.status = code || 0
      throw err
    } catch (e) {
      // ENOENT = curl не установлен — запомним, чтобы не пытаться снова.
      if (e && e.code === 'ENOENT') {
        curlAvailable = false
        console.warn('[market] curl не найден — fallback на Node fetch (OLX может 403-нуть)')
      } else if (!/OLX HTTP/.test(String(e && e.message))) {
        // Сетевая/таймаут ошибка curl — логируем, падаем дальше в fallback.
      } else {
        // HTTP-ошибка от OLX (403/404/...) — пробрасываем, fallback не поможет.
        throw e
      }
    }
  }
  // 2) Fallback — Node fetch (если curl отсутствует). На OLX часто 403.
  return fetchOlxHtmlViaFetch(url)
}

// Повторная попытка curl без риска бесконечной рекурсии (вызывается только
// из fetchOlxHtml после 429/503).
async function fetchOlxHtmlViaCurl(url) {
  const { stdout } = await execFileAsync(
    'curl',
    ['-sS', '--max-time', String(Math.floor(FETCH_TIMEOUT_MS / 1000)), '-L', '-A', OLX_UA,
      '-H', 'Accept: text/html,application/xhtml+xml', '-H', 'Accept-Language: ru,en;q=0.8',
      '-w', '\n%{http_code}', url],
    { timeout: FETCH_TIMEOUT_MS + 5000, maxBuffer: 10 * 1024 * 1024 },
  )
  const lastNl = stdout.lastIndexOf('\n')
  const code = parseInt(stdout.slice(lastNl + 1).trim(), 10)
  const body = stdout.slice(0, lastNl)
  if (code === 200 && body) return body
  const err = new Error(`OLX HTTP ${code || 'unknown'}`)
  err.status = code || 0
  throw err
}

// Fallback на Node fetch — используется только если curl не установлен.
// Заголовки МИНИМАЛЬНЫЕ (UA+Accept+Accept-Language): sec-fetch-* / sec-ch-ua
// триггерят 403 (антибот ловит поддельный браузер по TLS-фп undici).
async function fetchOlxHtmlViaFetch(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': OLX_UA,
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'ru,en;q=0.8',
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: 'follow',
  })
  if (res.ok) return res.text()
  const err = new Error(`OLX HTTP ${res.status}`)
  err.status = res.status
  throw err
}

// Признак: curl доступен в системе. null = ещё не проверяли, false = нет.
let curlAvailable = null

// ============================================================================
//  Парсер карточек объявлений OLX
// ============================================================================
// Карточка маркирована data-cy="l-card", внутри — data-cy="ad-card-title"
// (текст в первой <a>) и цена вида "850 000 сум". "договорная" = цены нет.
// parseOlxCards и computeStats экспортируются для direct unit-теста (без сети).
export function parseOlxCards(html) {
  const cards = html.split('data-cy="l-card"').slice(1)
  const listings = []
  for (const card of cards) {
    // Заголовок: на OLX title-элемент — <div data-cy="ad-card-title">, а сам
    // текст — внутри первой <a> (ссылка на объявление). Берём текст этой <a>,
    // это надёжнее чем чанк до </div> (вложенных div'ов много). Выкидываем
    // <style>/<script> на всякий случай.
    let title = ''
    const marker = 'data-cy="ad-card-title"'
    const mi = card.indexOf(marker)
    if (mi >= 0) {
      const gt = card.indexOf('>', mi)
      if (gt >= 0) {
        const aOpen = card.indexOf('<a', gt + 1)
        const aGt = aOpen >= 0 ? card.indexOf('>', aOpen) : -1
        const aClose = aGt >= 0 ? card.indexOf('</a>', aGt) : -1
        if (aGt >= 0 && aClose >= 0) {
          title = stripTags(card.slice(aGt + 1, aClose)).trim().slice(0, 80)
        } else {
          // Запас: чанк после title-тега (если нет <a>).
          title = stripTags(card.slice(gt + 1, gt + 1 + 200)).trim().slice(0, 80)
        }
      }
    }
    // "договорная" / "торг" — цены нет.
    const negotiable = /договорн/i.test(card)
    // Цена: ПЕРВЫЙ паттерн "N NNN сум" в карточке (цена объявления идёт первой,
    // до любых кредитных калькуляторов).
    let price = null
    if (!negotiable) {
      const pm = card.match(/([0-9][0-9 \u00a0]{2,})\s*сум/)
      if (pm) {
        const n = parseInt(pm[1].replace(/[\s\u00a0]/g, ''), 10)
        if (Number.isFinite(n) && n > 0) price = n
      }
    }
    if (title || price != null) listings.push({ title: title || '(без названия)', price })
  }
  return listings
}

// Снять теги, предварительно вырезав <style>/<script> (иначе CSS утекает в текст).
function stripTags(s) {
  return s
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
// ============================================================================
//  Статистика с IQR-фильтром выбросов
// ============================================================================
// Зачем IQR: на OLX в выдаче бывают аксессуары (5 000 сум) и премиум/кредитные
// виджеты (50 000 000 сум), которые не отражают «типичную» цену. IQR отсекает
// всё, что выходит за 1.5×IQR от квартилей — медиана и диапазон становятся
// реалистичными. min/max отдаются ПОСЛЕ фильтра (это «реальный рынок», а не
// один случайный аксессуар).
export function computeStats(prices) {
  const sorted = [...prices].sort((a, b) => a - b)
  const n = sorted.length
  const q1 = quantile(sorted, 0.25)
  const q3 = quantile(sorted, 0.75)
  const iqr = q3 - q1
  const lo = q1 - 1.5 * iqr
  const hi = q3 + 1.5 * iqr
  const filtered = sorted.filter((p) => p >= lo && p <= hi)
  const f = filtered.length ? filtered : sorted // если всё выбросы — берём как есть
  const sum = f.reduce((a, b) => a + b, 0)
  return {
    count: n,
    filteredCount: f.length,
    outliersRemoved: n - f.length,
    min: f[0],
    max: f[f.length - 1],
    median: quantile(f, 0.5),
    mean: Math.round(sum / f.length),
  }
}

// Квантиль по линейной интерполяции (метод R-1 → проще, достаточно для цен).
function quantile(sorted, q) {
  if (sorted.length === 0) return 0
  const i = (sorted.length - 1) * q
  const lo = Math.floor(i)
  const hi = Math.ceil(i)
  if (lo === hi) return sorted[lo]
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo))
}
