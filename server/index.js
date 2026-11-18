import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runConversation, providerInfo } from './llm.js'
import { SYSTEM_PROMPT } from './prompts.js'
import { analyzeMarket } from './marketAgent.js'

const app = express()
const PORT = Number(process.env.PORT) || 8787
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const isProduction = process.env.NODE_ENV === 'production'
const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || (isProduction ? '' : 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173'))
    .split(',').map((s) => s.trim()).filter(Boolean),
)

app.disable('x-powered-by')
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  next()
})
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true)
    return callback(new Error('Origin not allowed'))
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}))
app.use(express.json({ limit: '64kb', strict: true }))

// Small in-memory rate limiter. For multi-instance deployments, replace with Redis.
const buckets = new Map()
function rateLimit({ windowMs = 60_000, max = 30 } = {}) {
  return (req, res, next) => {
    const now = Date.now()
    const key = req.ip || req.socket.remoteAddress || 'unknown'
    let bucket = buckets.get(key)
    if (!bucket || now - bucket.start >= windowMs) bucket = { start: now, count: 0 }
    bucket.count += 1
    buckets.set(key, bucket)
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (now - v.start >= windowMs) buckets.delete(k)
    }
    res.setHeader('RateLimit-Limit', String(max))
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - bucket.count)))
    if (bucket.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((windowMs - (now - bucket.start)) / 1000)))
      return res.status(429).json({ error: 'Too many requests. Please try again shortly.' })
    }
    next()
  }
}

app.get('/api/health', (_req, res) => {
  const info = providerInfo()
  res.json({ status: 'ok', provider: info.provider, demo: info.demo })
})

app.get('/api/market', rateLimit({ windowMs: 60_000, max: 10 }), async (req, res) => {
  const query = String(req.query.q || req.query.query || '').trim().slice(0, 120)
  const city = req.query.city ? String(req.query.city).trim().slice(0, 60) : null
  if (!query) return res.status(400).json({ error: 'q (query) required' })
  try {
    const result = await analyzeMarket({ query, city })
    return res.json(result)
  } catch (error) {
    console.error('[market] request failed:', error?.message || error)
    return res.status(502).json({ error: 'Market data is temporarily unavailable.' })
  }
})

app.post('/api/chat', rateLimit({ windowMs: 60_000, max: 15 }), async (req, res) => {
  const incoming = req.body?.messages
  if (!Array.isArray(incoming) || incoming.length === 0 || incoming.length > 30) {
    return res.status(400).json({ error: 'messages must contain between 1 and 30 entries' })
  }
  const userMessages = []
  for (const item of incoming) {
    if (!item || !['user', 'assistant'].includes(item.role) || typeof item.content !== 'string') {
      return res.status(400).json({ error: 'Each message must have a valid role and text content.' })
    }
    const content = item.content.trim()
    if (!content || content.length > 4000) {
      return res.status(400).json({ error: 'Each message must contain 1–4000 characters.' })
    }
    userMessages.push({ role: item.role, content })
  }
  if (userMessages[userMessages.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'The final message must be from the user.' })
  }

  const messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...userMessages]
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders?.()
  const send = (event) => {
    if (!res.writableEnded && !res.destroyed) res.write(`data: ${JSON.stringify(event)}\n\n`)
  }
  const controller = new AbortController()
  res.on('close', () => { if (!res.writableEnded) controller.abort() })
  try {
    await runConversation({ messages, signal: controller.signal, onEvent: send })
  } catch (error) {
    console.error('[chat] request failed:', error?.message || error)
    send({ type: 'error', message: 'The assistant is temporarily unavailable. Please try again.' })
  } finally {
    if (!res.writableEnded) res.end()
  }
})

// Serve the built React app from the same process in production.
const distPath = path.join(projectRoot, 'dist')
if (isProduction) {
  app.use(express.static(distPath, { index: false, maxAge: '1h' }))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next()
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.use((error, _req, res, _next) => {
  if (error?.type === 'entity.too.large') return res.status(413).json({ error: 'Request body is too large.' })
  if (error?.message === 'Origin not allowed') return res.status(403).json({ error: 'Origin not allowed.' })
  console.error('[server] unhandled error:', error?.message || error)
  if (!res.headersSent) res.status(500).json({ error: 'Internal server error.' })
})

app.listen(PORT, () => {
  const info = providerInfo()
  console.log(`\n  Ustam server → http://localhost:${PORT}`)
  console.log(`  provider: ${info.provider}${info.demo ? ' (demo mode)' : ''}\n`)
})
