// server/tools.js
// ============================================================================
//  Инструменты (function calling) для LLM. Дают модели доступ к базе
//  servicesDatabase.json (цены OLX.uz Ташкент + реальные мастера) — чтобы она
//  не выдумывала цифры и мастеров, а брала их только из данных.
//
//  Две части:
//   1. toolDefinitions — описания в формате OpenAI tool-calling (Gemini через
//      её OpenAI-совместимый endpoint, а также xAI/Grok и OpenAI используют
//      одинаковый формат).
//   2. executeTool(name, args) — исполняет инструмент и возвращает строку (JSON),
//      которую модель увидит как результат вызова.
// ============================================================================

import { getServices, getMasters, getCategories, resolveService, formatRange } from './data.js'
import { matchServices, matchDistrict } from '../shared/matcher.js'
import { analyzeMarket } from './marketAgent.js'

// --- 1. Описания инструментов (формат OpenAI / xAI) ------------------------
export const toolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'list_services',
      description:
        'Получить список услуг каталога Ustam (id, название, категория), опционально по категории. Используй, когда пользователь просит показать услуги.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'id категории: air-conditioners, washing-machines, refrigerators, dishwashers, tvs, stoves, microwaves, handyman',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_service',
      description:
        'Подобрать услугу по свободному описанию проблемы на русском, узбекском или английском (например "течёт раковина"). Возвращает до 3 подходящих услуг с id.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Описание проблемы пользователя' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_price_info',
      description:
        'Цена услуги по базе (объявления OLX.uz, Ташкент): диапазон priceFrom–priceTo в сумах, единица, что входит, гарантия и источник.',
      parameters: {
        type: 'object',
        properties: {
          service: { type: 'string', description: 'id услуги (из find_service/list_services)' },
        },
        required: ['service'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'finish',
      description:
        'Вызови, когда определил нужную услугу (и город, если известен). Пользователь получит кнопки «Заказать мастера» и «Проверить цену» — это завершает диалог.',
      parameters: {
        type: 'object',
        properties: {
          service: { type: 'string', description: 'id услуги из каталога' },
          city: { type: 'string', description: 'Город (id), если пользователь его назвал' },
        },
        required: ['service'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_masters',
      description:
        'Реальные мастера и сервисные центры из базы (объявления OLX.uz), которые делают услугу; опционально по району Ташкента. Возвращает тип, районы, время выезда, опыт, цену мастера (если указана), телефон (только у проверенных) и ссылку. Рейтингов в базе НЕТ — не придумывай их.',
      parameters: {
        type: 'object',
        properties: {
          service: { type: 'string', description: 'id услуги' },
          district: { type: 'string', description: 'Район Ташкента по-русски, напр. «Юнусабадский» (необязательно)' },
        },
        required: ['service'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'analyze_market',
      description:
        'Анализирует ЖИВЫЕ цены на рынке Узбекистана — ищет объявления на OLX.uz, извлекает цены, фильтрует выбросы (IQR) и считает min / медиану / среднее / max. Возвращает также 5 примеров объявлений с ценами. Используй, когда пользователь спрашивает про РЕАЛЬНЫЕ рыночные цены в интернете: «сколько на OLX», «какая цена на рынке», «проверь цены в интернете», «поищи цены на стиралку». Если инструмент вернул error или мало данных — честно скажи это и предложи цену из базы через get_price_info.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Что ищем на OLX — товар или услуга. Например «стиральная машина», «ремонт холодильника», «кондиционер». Формулируй как поисковый запрос.',
          },
          city: {
            type: 'string',
            description: 'Город (опционально): Tashkent, Samarkand, Bukhara, Namangan, Andijan, Fergana. Если не задан — поиск по всему Узбекистану.',
          },
        },
        required: ['query'],
      },
    },
  },
]

// --- 2. Исполнитель инструментов -------------------------------------------
/**
 * Выполнить один инструмент.
 * @returns {string} JSON-строка с результатом (модель увидит её как tool-сообщение).
 */
export async function executeTool(name, args) {
  try {
    switch (name) {
      case 'list_services': {
        const all = await getServices()
        const filtered = args.category ? all.filter((s) => s.categoryId === args.category) : all
        return JSON.stringify(filtered.map((s) => ({ id: s.id, name: s.name, category: s.categoryId, price: formatRange(s.priceFrom, s.priceTo) })))
      }

      case 'find_service': {
        // Тот же мультиязычный матчер, что и на сайте (shared/matcher.js).
        const services = await getServices()
        const ids = matchServices(args.query || '', services)
        if (ids.length) {
          return JSON.stringify({ found: true, services: ids.map((id) => { const s = services.find((x) => x.id === id); return { id, name: s.name, category: s.categoryId, price: formatRange(s.priceFrom, s.priceTo) } }) })
        }
        return JSON.stringify({ found: false, hint: 'Спросите у пользователя: какая техника и что именно случилось.' })
      }

      case 'get_price_info': {
        const s = await resolveService(args.service)
        if (!s) return JSON.stringify({ found: false })
        return JSON.stringify({
          id: s.id, service: s.name, city: 'Ташкент',
          priceFrom: s.priceFrom, priceTo: s.priceTo, formatted: formatRange(s.priceFrom, s.priceTo),
          unit: s.unit, includes: s.description, warranty: s.warranty,
          source: { olx: s.source.olx, web: s.source.web, note: s.source.note },
        })
      }

      case 'find_masters': {
        const s = await resolveService(args.service)
        if (!s) return JSON.stringify({ found: false })
        const masters = (await getMasters()).filter((m) => m.serviceIds.includes(s.id) && (!args.district || m.districts.includes(args.district) || m.location === args.district))
        return JSON.stringify(masters.slice(0, 6).map((m) => {
          const p = m.prices.find((x) => x.serviceId === s.id)
          return {
            id: m.id, name: m.name, type: m.type === 'center' ? 'Сервисный центр' : 'Частный мастер',
            verifiedPhone: m.verified ? m.phoneDisplay : null, responseTime: m.responseTime, experience: m.experienceLabel,
            districts: m.districts.length >= 13 ? 'все районы Ташкента' : m.districts.join(', '),
            masterPrice: p ? formatRange(p.priceFrom, p.priceTo) : null, url: m.url,
          }
        }))
      }

      case 'finish': {
        // Сами кнопки-переходы создаёт llm.js (это действие, а не данные).
        return JSON.stringify({ ok: true, service: args.service, city: args.city || null })
      }

      case 'analyze_market': {
        // Агент анализа рынка: живые цены с OLX.uz + статистика (min/median/max).
        const result = await analyzeMarket({ query: args.query, city: args.city })
        return JSON.stringify(result)
      }

      default:
        return JSON.stringify({ error: 'unknown tool' })
    }
  } catch (e) {
    return JSON.stringify({ error: String((e && e.message) || e) })
  }
}

// --- 3. Кнопки-переходы для сайта -------------------------------------------
/**
 * Из аргументов finish строит пути, которые сайт покажет кнопками:
 *   /c/<категория>?svc=<id>   — подобрать мастера (услуга уже выбрана)
 *   /check?service=<id>        — проверить цену
 */
export function buildActionPaths(args, services) {
  const s = services.find((x) => x.id === args.service) ||
    services.find((x) => x.name.toLowerCase() === String(args.service || '').toLowerCase())
  if (!s) return []
  return [`/c/${s.categoryId}?svc=${encodeURIComponent(s.id)}`, `/check?service=${encodeURIComponent(s.id)}`]
}

// Совместимость: старое имя.
export function buildCheckPath(args) {
  const p = new URLSearchParams()
  if (args.service) p.set('service', args.service)
  if (args.city) p.set('city', args.city)
  return `/check?${p.toString()}`
}

export { resolveService, matchDistrict, getCategories }
