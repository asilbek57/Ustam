// Domain tests for the marketplace features (run with Node's type stripping).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeMasterStats, jobsToCsv } from '../src/domain/analytics.ts';
import { nearestDistrict, distanceKm, DISTRICT_CENTERS } from '../src/domain/geo.ts';
import { EMPTY_PROFILE, profileProblems, normalizeTelegram } from '../src/domain/masters.ts';

const base = { masterId: 'm1', masterName: 'A', clientId: 'c', clientName: 'C', clientPhone: null, categoryId: 'x', serviceIds: ['s1'],
  title: '', description: '', district: null, address: '', point: null, scheduledAt: null, visitType: 'home', estimateFrom: 0, estimateTo: null,
  paymentMethod: 'cash', source: 'platform', updatedAt: '' };

test('analytics: revenue, profit, unpaid, acceptance, monthly', () => {
  const now = new Date('2026-11-15T12:00:00Z');
  const jobs = [
    { ...base, id: '1', status: 'done', price: 300000, partsCost: 100000, paid: true, createdAt: '2026-11-02T10:00:00Z', completedAt: '2026-11-03T10:00:00Z' },
    { ...base, id: '2', status: 'done', price: 200000, partsCost: 0, paid: false, paymentMethod: 'card', createdAt: '2026-10-02T10:00:00Z', completedAt: '2026-10-05T10:00:00Z' },
    { ...base, id: '3', status: 'cancelled', price: null, partsCost: 0, paid: false, createdAt: '2026-11-04T10:00:00Z', completedAt: null },
    { ...base, id: '4', status: 'new', price: null, partsCost: 0, paid: false, createdAt: '2026-11-10T10:00:00Z', completedAt: null },
  ] as any[];
  const s = computeMasterStats(jobs, now);
  assert.equal(s.revenue, 500000);
  assert.equal(s.profit, 400000);
  assert.equal(s.unpaid, 200000);
  assert.equal(s.avgCheck, 250000);
  assert.equal(Math.round(s.acceptanceRate * 100), 67);
  assert.equal(s.monthly.at(-1)!.revenue, 300000);
  assert.equal(s.monthly.at(-2)!.revenue, 200000);
  assert.equal(s.byPayment.card, 200000);
  assert.match(jobsToCsv(jobs, (id) => id), /Выручка|Цена/);
});

test('geo: nearest district and distance', () => {
  const c = DISTRICT_CENTERS['Юнусабадский'] ?? Object.values(DISTRICT_CENTERS)[0];
  const name = Object.entries(DISTRICT_CENTERS).find(([, v]) => v === c)![0];
  assert.equal(nearestDistrict({ lat: c.lat + 0.001, lng: c.lng }), name);
  assert.ok(distanceKm({ lat: 41.3, lng: 69.2 }, { lat: 41.31, lng: 69.2 }) > 1);
});

test('master profile validation and telegram', () => {
  assert.ok(profileProblems(EMPTY_PROFILE).length >= 3);
  assert.equal(normalizeTelegram('https://t.me/usta_ali'), '@usta_ali');
});
