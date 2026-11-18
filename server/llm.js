// server/llm.js
// ============================================================================
//  Выбор LLM-провайдера и оркестрация диалога с инструментами (tool calling).
//
//  Провайдеры (по приоритету):
//   • groq   — GroqCloud (https://console.groq.com). OpenAI-совместимый API,
//              LPU-инференс — самый БЫСТРЫЙ и щедрый бесплатный вариант.
//              14 400 запр./день, 500K токенов/день на llama-3.1-8b-instant.
//              Включается переменной GROQ_API_KEY.
//   • gemini — Google AI Studio (Gemini). Включается GEMINI_API_KEY.
//   • xai    — Grok (https://api.x.ai). Включается XAI_API_KEY.
//   • openai — OpenAI.     Включается OPENAI_API_KEY.
//   • demo   — БЕЗ api-ключа. Имитирует ответы по ключевым словам, чтобы UI
//              работал ПРЯМО СЕЙЧАС — до того, как вы подключите настоящий ключ.
//
//  Все провайдеры используют ОДИНАКОВЫЙ OpenAI-совместимый streaming-формат,
//  поэтому идут через одну функцию streamOpenAICompatible().
//
//  Устойчивость к 503/429/сети:
//   • fetchChatCompletion() делает до LLM_MAX_RETRIES (по умолч. 3) попыток с
//     экспоненциальной задержкой + джиттером, прежде чем бросить ошибку.
//   • runConversation() перебирает цепочку моделей (основная + запасные из
//     GROQ_FALLBACK_MODELS / GEMINI_FALLBACK_MODELS), и только если все
//     исчерпаны — мягко уходит в demo.
// ============================================================================

import { toolDefinitions, executeTool, buildActionPaths } from './tools.js'
import { getServices, getMasters, getCategories, getDistricts, formatRange } from './data.js'
import { matchServices, matchDistrict, detectLang } from '../shared/matcher.js'
import { tr } from '../shared/catalogI18n.js'

// --- Какой провайдер активен сейчас ----------------------------------------
// Приоритет: Groq > Gemini > OpenAI > xAI > demo. Меняйте, добавив нужный ключ
// в .env. Groq推荐 как самый быстрый бесплатный (LPU-инференс).
export function getProvider() {
  if (process.env.GROQ_API_KEY) return 'groq'
  if (process.env.GEMINI_API_KEY) return 'gemini'
  if (process.env.OPENAI_API_KEY) return 'openai'
  if (process.env.XAI_API_KEY) return 'xai'
  return 'demo'
}

// Краткая информация для эндпоинта /api/health (видно в консоли при старте).
export function providerInfo() {
  const p = getProvider()
  if (p === 'groq') {
    const chain = groqModelChain()
    return { provider: 'groq', model: chain[0], fallbacks: chain.slice(1), demo: false }
  }
  if (p === 'gemini') {
    const chain = geminiModelChain()
    return { provider: 'gemini', model: chain[0], fallbacks: chain.slice(1), demo: false }
  }
  if (p === 'openai') return { provider: 'openai', model: process.env.OPENAI_MODEL || 'gpt-4o-mini', fallbacks: [], demo: false }
  if (p === 'xai') return { provider: 'xai', model: process.env.XAI_MODEL || 'grok-2-latest', fallbacks: [], demo: false }
  return { provider: 'demo', model: 'rule-based', fallbacks: [], demo: true }
}

// Цепочка моделей для Groq: основная + запасные. llama-3.1-8b-instant — самая
// быстрая и с самым щедрым лимитом (14 400 RPD / 500K TPD), llama-3.3-70b —
// умнее (70B), но лимит жёстче (1000 RPD). Список можно переопределить через
// GROQ_FALLBACK_MODELS=a,b.
function groqModelChain() {
  const primary = process.env.GROQ_MODEL || 'llama-3.1-8b-instant'
  const fallbacks = process.env.GROQ_FALLBACK_MODELS
    ? String(process.env.GROQ_FALLBACK_MODELS)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : ['llama-3.3-70b-versatile']
  return [...new Set([primary, ...fallbacks])]
}

// Цепочка моделей для Gemini: основная + запасные. Запасные нужны, когда
// основная модель временно перегружена (503 "high demand") — пробуем более
// старую/стабильную. Список можно переопределить через GEMINI_FALLBACK_MODELS.
function geminiModelChain() {
  const primary = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  const fallbacks = process.env.GEMINI_FALLBACK_MODELS
    ? String(process.env.GEMINI_FALLBACK_MODELS)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : ['gemini-2.5-flash', 'gemini-2.0-flash']
  return [...new Set([primary, ...fallbacks])]
}

// ===========================================================================
//  Повторные попытки для временных ошибок (503/429/сеть/таймаут)
// ===========================================================================
// Любой провайдер иногда отвечает 503 "high demand" или 429 (rate limit) — это
// ВРЕМЕННО, и запрос часто проходит со второй-третьей попытки. Прежде чем
// менять модель или откатываться в demo, делаем N ретраев с экспоненциальной
// задержкой + джиттером.
//
// Retry только ДО начала стриминга (на этапе fetch + проверки res.ok): если
// стрим уже пошёл, повторный запрос продублировал бы токены пользователю.

const MAX_RETRIES = Number(process.env.LLM_MAX_RETRIES) || 3
const RETRY_BASE_MS = Number(process.env.LLM_RETRY_BASE_MS) || 800

// Однострочное сообщение для логов — без многострочного JSON-тела ошибки.
function shortErr(e) {
  const s = String((e && e.message) || e || '')
  const m = s.match(/LLM API error (\d{3})/)
  if (m) return `HTTP ${m[1]}`
  if (/Failed to fetch|fetch failed|networkerror/i.test(s)) return 'network'
  if (/This operation was aborted/i.test(s)) return 'timeout'
  if (e && e.name === 'AbortError') return 'timeout'
  return s.split('\n')[0].slice(0, 120)
}

// Временная ошибка — повод сделать retry (а не сдаваться сразу).
// 429 = квота/rate limit, 5xx = серверная ошибка провайдера, сеть/таймаут.
function isTransient(e) {
  const status = e && e.status
  if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) return true
  const s = String((e && e.message) || e || '')
  if (/^(Failed to fetch|fetch failed|networkerror|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|This operation was aborted)/i.test(s)) return true
  if (e && (e.name === 'TypeError' || e.name === 'AbortError')) return true
  return false
}

// Повод попробовать СЛЕДУЮЩУЮ модель в цепочке. Временная ошибка ИЛИ 404
// (модель не существует/снята с поддержки) — обе причины сменить модель.
// 401/403 (ключ) — НЕ повод: с тем же ключом другие модели тоже не пройдут.
function shouldTryNextModel(e) {
  if (isTransient(e)) return true
  if (e && e.status === 404) return true
  const s = String((e && e.message) || e || '')
  if (/LLM API error 404/.test(s)) return true
  return false
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Один fetch к /chat/completions с retry для временных ошибок. Возвращает
// готовый Response (со стримом) либо бросает последнюю ошибку.
async function fetchChatCompletion({ baseURL, apiKey, model, messages, tools, signal }) {
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS) || 20000
  let lastErr
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Пользователь закрыл вкладку — выходим без ретраев.
    if (signal?.aborted) throw new DOMException('Aborted by client', 'AbortError')
    const timeoutSignal = AbortSignal.timeout(timeoutMs)
    const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal
    try {
      const res = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          tools,
          tool_choice: 'auto',
          stream: true,
          temperature: Number(process.env.LLM_TEMPERATURE) || 0.85,
          top_p: 0.95,
        }),
        signal: combinedSignal,
      })
      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => '')
        const err = new Error(`LLM API error ${res.status}: ${text.slice(0, 200)}`)
        err.status = res.status
        throw err
      }
      return res
    } catch (e) {
      lastErr = e
      // Disconnect пользователя — не ретраим, некому отвечать.
      if (signal?.aborted) throw e
      // Есть ещё попытки И ошибка временная → ждём и пробуем снова.
      if (attempt < MAX_RETRIES && isTransient(e)) {
        const delay = RETRY_BASE_MS * 2 ** attempt + Math.random() * 250
        console.warn(
          `[llm] ${model} attempt ${attempt + 1}/${MAX_RETRIES + 1} failed (${shortErr(e)}) → retry in ${Math.round(delay)}ms`,
        )
        await sleep(delay)
        continue
      }
      throw e
    }
  }
  throw lastErr
}

// ===========================================================================
//  OpenAI-совместимый streaming-запрос (Groq / Gemini / xAI Grok / OpenAI)
// ===========================================================================
/**
 * Один streaming-запрос к /chat/completions (с уже встроенным retry на этапе
 * установки соединения). @yields {{type:'delta', text} | {type:'tool_calls', calls} | {type:'stop'}}
 *
 * SSE-ответ состоит из кадров `data: {...}\n\n`, заканчивается `data: [DONE]`.
 * Текст приходит порциями в delta.content, tool_calls — тоже порциями
 * (аргументы стримятся как строки), поэтому накапливаем их по индексу.
 */
async function* streamOpenAICompatible({ baseURL, apiKey, model, messages, tools, signal }) {
  const res = await fetchChatCompletion({ baseURL, apiKey, model, messages, tools, signal })

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const toolCallMap = new Map()
  let contentAccum = ''
  let sawToolCalls = false

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let nl
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim()
      buffer = buffer.slice(nl + 1)
      if (!line || line.startsWith(':')) continue
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (payload === '[DONE]') continue
      let json
      try { json = JSON.parse(payload) } catch { continue }
      const choice = json.choices && json.choices[0]
      if (!choice) continue
      const delta = choice.delta || {}

      if (delta.content) {
        contentAccum += delta.content
        yield { type: 'delta', text: delta.content }
      }

      if (delta.tool_calls) {
        sawToolCalls = true
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0
          if (!toolCallMap.has(idx)) toolCallMap.set(idx, { id: '', name: '', arguments: '' })
          const entry = toolCallMap.get(idx)
          if (tc.id) entry.id = tc.id
          if (tc.function) {
            if (tc.function.name) entry.name += tc.function.name
            if (tc.function.arguments) entry.arguments += tc.function.arguments
          }
        }
      }
    }
  }

  if (sawToolCalls && toolCallMap.size) {
    const calls = [...toolCallMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, v]) => ({
        id: v.id || `call_${Math.random().toString(36).slice(2)}`,
        name: v.name,
        arguments: v.arguments,
      }))
    yield { type: 'tool_calls', calls }
  } else {
    yield { type: 'stop', content: contentAccum }
  }
}

// ===========================================================================
//  Демо-провайдер (без api-ключа) — чтобы UI работал сразу
// ===========================================================================

// --- Разнообразие фраз в demo-режиме ---------------------------------------
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

const GREETINGS = [
  'Привет! 👋 Я Ustam. Помогу разобраться с ценами и мастерами, чем займёмся?',
  'Салом! Рад тебя видеть. Что сегодня чиним или проверяем?',
  'Привет-привет! Расскажи, что случилось, или спроси про цену на что-нибудь.',
  'Здравствуйте! Я Ustam, подскажу, сколько что реально стоит. С чем помочь?',
  'О, привет! Давай найдём тебе мастера или проверим честную цену. С чего начнём?',
]
const SMALLTALK = [
  'Всё отлично, спасибо что спросил! А у тебя как, что-то сломалось или просто интересуешься ценами?',
  'Неплохо! Готов помогать. Есть задача по ремонту или хочешь узнать цены?',
  'Бодро, как всегда 😄 Что у тебя на уме?',
]
const THANKS = [
  'Рад помочь! Если что, пиши.',
  'Всегда пожалуйста, обращайся!',
  'Да не за что 🙂 Нужно ещё что-нибудь проверить?',
]
const LIST_INTRO = [
  'Вот что умею подобрать:',
  'Смотри, какие услуги у нас есть:',
  'Держи список:',
]
const LIST_OUTRO = [
  'Опиши проблему, и я подберу подходящее.',
  'Скажи, что у тебя случилось, и разберёмся.',
  'Что из этого тебе нужно?',
]
const ACK = ['Ага, понятно.', 'Так, ясно.', 'Окей, разобрались.', 'Хорошо, записал.']
const FALLBACKS = [
  'Я Ustam: помогаю с ремонтом, мастерами и честными ценами в Узбекистане. Расскажи, что случилось, или спроси, например, «сколько стоит стиральная машина на OLX в Ташкенте?»',
  'Могу подобрать мастера (стиралки, холодильники, кондиционеры, сантехника, электрика и не только) или показать реальные цены с OLX. Что тебе ближе?',
  'Пока не совсем понял, о чём речь 🙂 Опиши проблему своими словами или спроси про цену, и я помогу.',
]

// ---------------------------------------------------------------------------
//  Demo mode (no API key): answers ONLY from servicesDatabase.json with the
//  same matcher and ranking facts as the website.
// ---------------------------------------------------------------------------
const DEMO = {
  ru: {
    found: (s) => `${pick(ACK)} Похоже, это «${s}».`,
    price: (r, u) => ` По объявлениям OLX.uz в Ташкенте: ${r}${u ? ` (${u})` : ''}.`,
    master: (m) => ` Подходящий мастер: ${m.name}${m.verified ? `, проверенный телефон ${m.phoneDisplay}` : ''}${m.responseTime ? `, выезд ${m.responseTime}` : ''}.`,
    next: ' Кнопки ниже — подобрать мастера или проверить цену.',
  },
  uz: {
    found: (s) => `Tushunarli. Bu «${s}» ga oʻxshaydi.`,
    price: (r, u) => ` Toshkent OLX.uz eʼlonlarida: ${r}${u ? ` (${u})` : ''}.`,
    master: (m) => ` Mos usta: ${m.name}${m.verified ? `, tasdiqlangan telefon ${m.phoneDisplay}` : ''}.`,
    next: ' Quyidagi tugmalar — usta tanlash yoki narxni tekshirish.',
  },
  en: {
    found: (s) => `Got it — that sounds like “${s}”.`,
    price: (r, u) => ` On OLX.uz in Tashkent: ${r}${u ? ` (${u})` : ''}.`,
    master: (m) => ` A matching master: ${m.name}${m.verified ? `, verified phone ${m.phoneDisplay}` : ''}.`,
    next: ' Use the buttons below to pick a master or check a price.',
  },
}

async function runDemo({ messages, onEvent }) {
  const last = [...messages].reverse().find((m) => m.role === 'user')
  const text = String((last && last.content) || '')
  const t = text.toLowerCase().trim()
  const lang = detectLang(text)

  if (t.length < 40 && /^(привет|салом|салам|ассалому|здравствуй|здарова|хай|hi\b|hello|добрый|доброе|salom|assalom)/i.test(t)) {
    await streamText(pick(GREETINGS), onEvent)
    return onEvent({ type: 'done' })
  }
  if (t.length < 40 && /как дела|как ты|как жизнь|что нового|nima gap|qalaysan/i.test(t)) {
    await streamText(pick(SMALLTALK), onEvent)
    return onEvent({ type: 'done' })
  }
  if (t.length < 40 && /^(спасибо|благодарю|рахмат|rahmat|thanks|thank you|супер|класс)/i.test(t)) {
    await streamText(pick(THANKS), onEvent)
    return onEvent({ type: 'done' })
  }

  const services = await getServices()
  const categories = await getCategories()
  if (/список|какие услуги|что вы можете|list services|what services|что умеешь|какие есть|qanday xizmat/.test(t)) {
    const lines = categories.map((c) => `• ${c.icon} ${c.title}: ${services.filter((s) => s.categoryId === c.id).map((s) => s.name.split(' (')[0]).slice(0, 3).join('; ')}…`).join('\n')
    await streamText(`${pick(LIST_INTRO)}\n${lines}\n\n${pick(LIST_OUTRO)}`, onEvent)
    return onEvent({ type: 'done' })
  }

  const allUser = messages.filter((m) => m.role === 'user').map((m) => m.content).join(' \n ')
  const id = matchServices(text, services)[0] || matchServices(allUser, services)[0]
  if (!id) {
    await streamText(pick(FALLBACKS), onEvent)
    return onEvent({ type: 'done' })
  }
  const svc = services.find((s) => s.id === id)
  const district = matchDistrict(allUser, await getDistricts())
  // best real master: verified first, then serves the district, then faster
  const masters = (await getMasters())
    .filter((m) => m.serviceIds.includes(id) && (!district || m.districts.includes(district) || m.location === district))
    .sort((a, b) => Number(b.verified) - Number(a.verified) || a.responseMinutes - b.responseMinutes)
  const L = DEMO[lang] || DEMO.ru
  const label = tr(svc.id, lang, svc.name)
  await streamText(L.found(label) + L.price(formatRange(svc.priceFrom, svc.priceTo, lang), svc.unit === 'от' ? '' : tr(svc.unit, lang, svc.unit)) + (masters[0] ? L.master(masters[0]) : '') + L.next, onEvent)
  for (const path of buildActionPaths({ service: id }, services)) onEvent({ type: 'action', path })
  if (masters[0]) onEvent({ type: 'action', path: `/master/${masters[0].id}` })
  onEvent({ type: 'done' })
}

async function streamText(text, onEvent) {
  const tokens = text.match(/\S+\s*/g) || [text]
  for (const tok of tokens) {
    onEvent({ type: 'token', text: tok })
    await sleep(12)
  }
}

// ===========================================================================
//  Рыночный fast-path: «сколько стоит X на OLX» → analyze_market напрямую.
//  analyze_market НЕ требует LLM (просто fetch OLX + статистика), поэтому
//  рыночные вопросы обрабатываем детерминированно и мгновенно — это работает
//  ДАЖЕ В DEMO (когда LLM геоблокнут / нет ключа) и не зависит от того,
//  вызовет ли LLM инструмент. LLM остаётся для сервисных и общих вопросов.
// ===========================================================================

// Сервисный интент → точно НЕ рынок (даже при «сколько стоит» это цена УСЛУГИ).
function looksLikeServiceRequest(t) {
  return /\b(ремонт|почини|чинить|сломал|течёт|не работает|мастер|услуг|выезд|диагностик|починить)\b/.test(t)
}

// Рыночный интент: явный сигнал (OLX / рынок / интернет) ИЛИ «сколько стоит» + товар.
function detectMarketIntent(text) {
  const t = String(text || '').toLowerCase().trim()
  if (!t) return false
  if (looksLikeServiceRequest(t)) return false
  if (/\bolx\b|olx\.uz|на рынке|в интернете|поищи цены|проверь цены|рыночные цены|реальная цена|цена на рынке/.test(t)) return true
  if (/сколько стоит|сколько стоят|почём|по чём|какая цена|какие цены/.test(t)) {
    // нужен товар — чтобы не сработало на «сколько стоит ремонт» (уже отсеян
    // сервисным фильтром, но для надёжности требуем товарное слово)
    if (/\b(стирал|холодильник|кондиционер|телефон|смартфон|телевизор|ноутбук|диван|кровать|шкаф|велосипед|автомобиль|машина|плита|пылесос|микроволновка|обогреватель|бойлер|кухня|гарнитур|телек)\b/.test(t)) return true
  }
  return false
}

// Достаём поисковый запрос из сообщения пользователя.
function extractMarketQuery(text) {
  const t = String(text || '').toLowerCase().trim()
  // 1) «сколько стоит X» / «цены на X» — берём кусок до разделителя.
  const m = t.match(/(?:сколько стоит|сколько стоят|почём|по чём|какая цена|какие цены|цены на|цена на|реальная цена на|поищи цены(?:\s+(?:на|для))?\s*|проверь цены(?:\s+(?:на|для))?\s*)([^?.,!]+?)(?:\s+(?:на\s+olx|olx|в\s+\S+|на\s+рынке|в\s+городе|olx\.uz)\b|[?.,!]|$)/)
  if (m && m[1]) {
    const q = m[1]
      .replace(/\b(на|в|олх|olx|uz|ташкент|tashkent|самарканд|samarkand|бухара|bukhara|наманган|namangan|андижан|andijan|фергана|fergana|городе|рынке|интернете|реальная|поищи|проверь)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (q.length > 1) return q
  }
  // 2) Известный товар → каноничный запрос.
  const products = [
    [/стирал|washing/, 'стиральная машина'],
    [/холодильник|fridge|морозильник/, 'холодильник'],
    [/кондиционер|сплит|split/, 'кондиционер'],
    [/телефон|смартфон|iphone|samsung/, 'телефон'],
    [/телевизор|телек|\btv\b/, 'телевизор'],
    [/ноутбук|лэптоп|laptop/, 'ноутбук'],
    [/кухонная плита|\bплита\b/, 'кухонная плита'],
    [/пылесос/, 'пылесос'],
    [/микроволновка|микроволна/, 'микроволновка'],
    [/обогреватель/, 'обогреватель'],
    [/бойлер/, 'бойлер'],
    [/диван|sofa/, 'диван'],
    [/кровать/, 'кровать'],
    [/шкаф/, 'шкаф'],
    [/велосипед/, 'велосипед'],
    [/автомобиль|\bмашина\b/, 'автомобиль'],
  ]
  for (const [re, q] of products) if (re.test(t)) return q
  // 3) Выкинуть стоп-слова и город — оставшееся как запрос.
  const stop = new Set(['сколько', 'стоит', 'стоят', 'почём', 'по', 'чём', 'какая', 'какие', 'цена', 'цены', 'на', 'в', 'olx', 'олх', 'uz', 'интернете', 'рынке', 'реальная', 'поищи', 'проверь', 'покажи', 'узнать', 'стоит'])
  const cityWords = ['ташкент', 'tashkent', 'самарканд', 'samarkand', 'бухара', 'bukhara', 'наманган', 'namangan', 'андижан', 'andijan', 'фергана', 'fergana']
  const words = t
    .split(/[\s,?.!]+/)
    .filter((w) => w && !stop.has(w) && !cityWords.includes(w))
  const q = words.join(' ').trim()
  return q.length > 1 ? q : null
}

// Презентация результата analyze_market — коротко, с min/median/max и примерами.
async function streamMarketAnswer({ query, city, onEvent, signal }) {
  if (signal?.aborted) throw new DOMException('Aborted by client', 'AbortError')
  await streamText(`Ищу реальные цены на OLX.uz — «${query}»${city ? `, ${city}` : ''}…\n`, onEvent)
  let raw
  try {
    raw = await executeTool('analyze_market', { query, city: city || undefined })
  } catch (e) {
    raw = JSON.stringify({ error: String((e && e.message) || e || 'OLX недоступен').slice(0, 120) })
  }
  let data = null
  try {
    data = raw ? JSON.parse(raw) : null
  } catch {
    data = null
  }

  if (!data) {
    await streamText('Не удалось получить ответ от OLX. Попробуйте позже или иначе сформулируйте товар.', onEvent)
  } else if (data.error) {
    await streamText(
      `Сейчас не удалось получить живые цены с OLX (${data.error}${data.hint ? `; ${data.hint}` : ''}). Попробуйте переформулировать запрос или спросите позже.`,
      onEvent,
    )
  } else if (!data.count || data.count < 3) {
    await streamText(
      `По запросу «${query}» нашёл мало объявлений с ценой${data.note ? `: ${data.note}` : ''}. Попробуйте уточнить товар (например «стиральная машина б/у») или указать другой город.`,
      onEvent,
    )
  } else {
    const lines = [
      `По запросу «${query}»${city ? `, ${city}` : ''} на ${data.source} нашёл ${data.count} объявлений с ценой${data.outliersRemoved ? ` (отброшено ${data.outliersRemoved} выбросов)` : ''}.`,
      `Минимальная: ${data.formatted.min}.`,
      `Медиана: ${data.formatted.median}.`,
      `Средняя: ${data.formatted.mean}.`,
      `Максимальная: ${data.formatted.max}.`,
    ]
    if (Array.isArray(data.samples) && data.samples[0]) {
      lines.push('Примеры объявлений:')
      for (const s of data.samples.slice(0, 2)) {
        lines.push(`• ${s.title}${s.formatted ? ` — ${s.formatted}` : ''}`)
      }
    }
    await streamText(lines.join('\n'), onEvent)
  }
  onEvent({ type: 'done' })
}

// ===========================================================================
//  Оркестратор: стримим → исполняем инструменты → стримим снова (цикл)
//  + перебор моделей в цепочке fallback + откат в demo
// ===========================================================================
/**
 * Полный диалог с перебором моделей и устойчивостью к 503/429/сети:
 *   1. Для каждой модели в цепочке (основная + запасные) запускаем цикл
 *      tool-calling. Внутри — retry на этапе fetch (см. fetchChatCompletion).
 *   2. Если модель упала с временной ошибкой ИЛИ 404 — пробуем следующую.
 *   3. Если все модели исчерпаны и ни одна не стримнула ни токена — мягко
 *      уходим в demo, чтобы бот продолжал отвечать.
 *   4. Если уже стримнули часть ответа и потом упали — не ретраим и не
 *      подмешиваем demo (дубликат/склейка); пробрасываем ошибку наружу.
 */
export async function runConversation({ messages, onEvent, signal }) {
  // === Рыночный fast-path: «сколько стоит X на OLX» → analyze_market напрямую.
  // analyze_market НЕ требует LLM, поэтому обрабатываем ДО провайдера — это
  // работает мгновенно и в demo (LLM геоблокнут / нет ключа), не полагаясь на
  // то, вызовет ли LLM инструмент. LLM остаётся для сервисных/общих вопросов.
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')
  const userText = String((lastUser && lastUser.content) || '')
  if (detectMarketIntent(userText)) {
    const query = extractMarketQuery(userText)
    if (query) {
      const city = 'tashkent' // the database covers Tashkent
      return streamMarketAnswer({ query, city, onEvent, signal })
    }
  }

  const provider = getProvider()

  // demo — отдельная ветка, без LLM и без цикла инструментов.
  if (provider === 'demo') {
    return runDemo({ messages, onEvent })
  }

  // Базовый конфиг провайдера (URL + ключ). Модель подставляется из цепочки.
  const baseConfig =
    provider === 'groq'
      ? {
          baseURL: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
          apiKey: process.env.GROQ_API_KEY,
        }
      : provider === 'gemini'
      ? {
          baseURL: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai',
          apiKey: process.env.GEMINI_API_KEY,
        }
      : provider === 'openai'
      ? {
          baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
          apiKey: process.env.OPENAI_API_KEY,
        }
      : {
          baseURL: process.env.XAI_BASE_URL || 'https://api.x.ai/v1',
          apiKey: process.env.XAI_API_KEY,
        }

  // Цепочка моделей для текущего провайдера.
  const modelChain =
    provider === 'groq'
      ? groqModelChain()
      : provider === 'gemini'
      ? geminiModelChain()
      : provider === 'openai'
      ? [process.env.OPENAI_MODEL || 'gpt-4o-mini']
      : [process.env.XAI_MODEL || 'grok-2-latest']

  const MAX_TURNS = 6 // предохранитель: не больше 6 раундов tool-calling
  let lastErr = null

  for (let mi = 0; mi < modelChain.length; mi++) {
    const model = modelChain[mi]
    const config = { ...baseConfig, model }

    // Локальная копия диалога на каждую попытку модели: если первая модель
    // стримнула tool_calls и упала на втором ходе — не тащим её огрызки в
    // следующую модель, начинаем чисто от исходной истории.
    let convo = [...messages]
    let streamedAny = false

    try {
      for (let turn = 0; turn < MAX_TURNS; turn++) {
        const assistant = { role: 'assistant', content: '', tool_calls: [] }
        let toolCalls = null

        for await (const ev of streamOpenAICompatible({
          ...config,
          messages: convo,
          tools: toolDefinitions,
          signal,
        })) {
          if (ev.type === 'delta') {
            streamedAny = true
            assistant.content += ev.text
            onEvent({ type: 'token', text: ev.text })
          } else if (ev.type === 'tool_calls') {
            toolCalls = ev.calls
          }
        }

        if (!toolCalls) {
          onEvent({ type: 'done' })
          return
        }

        assistant.tool_calls = toolCalls.map((c) => ({
          id: c.id,
          type: 'function',
          function: { name: c.name, arguments: c.arguments },
        }))
        convo.push(assistant)

        for (const call of toolCalls) {
          let args = {}
          try { args = call.arguments ? JSON.parse(call.arguments) : {} } catch { args = {} }

          if (call.name === 'finish') {
            for (const path of buildActionPaths(args, await getServices())) onEvent({ type: 'action', path })
            onEvent({ type: 'done' })
            return
          }

          const result = await executeTool(call.name, args)
          convo.push({ role: 'tool', tool_call_id: call.id, name: call.name, content: result })
        }
      }
      // Достигли лимита раундов — спокойно завершаем.
      onEvent({ type: 'done' })
      return
    } catch (e) {
      lastErr = e
      // Пользователь закрыл вкладку — тихо выходим, без demo-фолбэка.
      if (signal?.aborted) return
      // Уже стримнули часть ответа — нельзя ни ретраить, ни подмешивать demo
      // (дубликат/склейка). Пробрасываем ошибку наружу.
      if (streamedAny) throw e
      // Есть ещё модели в цепочке И ошибка позволяет попробовать другую
      // (transient или 404) — пробуем следующую модель.
      if (mi < modelChain.length - 1 && shouldTryNextModel(e)) {
        console.warn(
          `[llm] model ${model} failed (${shortErr(e)}) → trying fallback ${modelChain[mi + 1]}`,
        )
        continue
      }
      // Модели кончились или ошибка не временная (401/403/400) → demo.
      if (isLLMAvailabilityError(e)) {
        console.warn(
          `[llm] provider ${provider} unavailable after ${mi + 1} model(s) → demo fallback (${shortErr(e)})`,
        )
        return runDemo({ messages, onEvent })
      }
      throw e
    }
  }

  // Все модели в цепочке испробованы, ни одна не дошла до конца.
  if (lastErr && isLLMAvailabilityError(lastErr)) {
    console.warn(
      `[llm] all ${modelChain.length} model(s) failed → demo fallback (${shortErr(lastErr)})`,
    )
    return runDemo({ messages, onEvent })
  }
  if (lastErr) throw lastErr
}

// Признак того, что ошибка от LLM-провайдера — повод уйти в demo, а не пугать
// пользователя сырым сообщением. Любой LLM API error (400 «Invalid Auth key»,
// 401/403 — ключ, 429 — квота, 5xx — сервер) → demo; TypeError/сеть — fetch
// не дошёл; AbortError — сработал наш таймаут LLM_TIMEOUT_MS (провайдер висит).
// Disconnect пользователя обрабатывается отдельно (signal.aborted) до этой
// проверки. Причину всегда печатаем в warning, чтобы не молчала.
function isLLMAvailabilityError(e) {
  const s = String((e && e.message) || e || '')
  return (
    /LLM API error \d{3}/.test(s) ||
    /^(Failed to fetch|fetch failed|networkerror|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|This operation was aborted)/i.test(s) ||
    (e && (e.name === 'TypeError' || e.name === 'AbortError'))
  )
}
