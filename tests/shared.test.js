// Tests for the shared logic used by BOTH the website and the chat server.
// Run: npm test
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { normalizeDatabase, responseMinutes } from '../shared/normalize.js'
import { matchServices, matchDistrict, detectLang } from '../shared/matcher.js'
import { tr } from '../shared/catalogI18n.js'
import { formatNumber } from '../shared/stats.js'

const raw = JSON.parse(readFileSync(new URL('../shared/data/servicesDatabase.json', import.meta.url)))
const db = normalizeDatabase(raw)
const svc = (text) => matchServices(text, db.services)[0]

test('database is loaded as-is: 8 categories, 53 services, no invented masters', () => {
  assert.equal(db.categories.length, 8)
  assert.equal(db.services.length, 53)
  // 19 listings + 2 verified masters without a listing = 21 real masters
  assert.equal(db.masters.length, 21)
  assert.equal(db.masters.filter((m) => m.verified).length, 3)
  assert.ok(db.masters.every((m) => m.rating === null), 'no ratings are invented')
})

test('verified master is merged with its OLX listing and keeps the phone', () => {
  const m = db.masters.find((x) => x.olxListingId === 'ID4lbKx')
  assert.equal(m.verified, true)
  assert.equal(m.phone, '+998935859588')
  assert.deepEqual(m.prices.find((p) => p.serviceId === 'ac-cleaning-full'), { serviceId: 'ac-cleaning-full', priceFrom: 150000, priceTo: null, source: 'verified' })
})

test('prices are only taken when stated in the listing text', () => {
  const sp = db.masters.find((x) => x.id === 'master-ac-serviceplus')
  assert.equal(sp.prices.find((p) => p.serviceId === 'ac-install-standard').priceFrom, 450000)
  const rinat = db.masters.find((x) => x.id === 'master-fr-rinat')
  assert.equal(rinat.prices.length, 0)
})

test('every master references existing services', () => {
  const ids = new Set(db.services.map((s) => s.id))
  for (const m of db.masters) for (const id of m.serviceIds) assert.ok(ids.has(id), `${m.id} -> ${id}`)
})

test('response time is parsed for sorting', () => {
  assert.equal(responseMinutes('30 минут'), 30)
  assert.equal(responseMinutes('1–2 часа'), 120)
  assert.equal(responseMinutes('день обращения'), 480)
})

test('AI matcher understands RU / UZ / EN problems', () => {
  assert.equal(svc('кондиционер не холодит'), 'ac-freon-refill')
  assert.equal(svc('стиралка не сливает воду'), 'wm-pump-replace')
  assert.equal(svc('Kir yuvish mashinasi suvni chiqarmayapti'), 'wm-pump-replace')
  assert.equal(svc('холодильник не морозит'), 'fr-freon-refill')
  assert.equal(svc('the TV has sound but no picture'), 'tv-backlight-replace')
  assert.equal(svc('газовая плита пахнет газом'), 'st-gas-valve-replace')
  assert.equal(svc('холодильник'), 'fr-diagnostic')
  assert.equal(svc('погода завтра'), undefined)
})

test('district, language and catalog translations', () => {
  assert.equal(matchDistrict('я в Юнусабаде', db.districts), 'Юнусабадский')
  assert.equal(detectLang('привет'), 'ru')
  assert.equal(detectLang('usta kerak'), 'uz')
  assert.equal(tr('ac-freon-refill', 'en'), 'AC freon refill')
  assert.equal(tr('ac-freon-refill', 'ru', 'Заправка'), 'Заправка')
  assert.equal(formatNumber(1250000), '1 250 000')
})
