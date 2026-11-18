/**
 * DOMAIN LAYER — financial analytics for a master's own orders.
 * Pure functions over Job[]: revenue, parts, profit, average check,
 * acceptance rate, unpaid amount, monthly series, by service, by payment.
 */
import type { Job, JobStatus, PaymentMethod } from './types';

export interface MasterStats {
  revenue: number;          // Σ price of done jobs
  parts: number;            // Σ parts cost of done jobs
  profit: number;           // revenue − parts
  done: number;
  active: number;           // accepted + in progress
  newCount: number;
  cancelled: number;
  avgCheck: number;
  acceptanceRate: number;   // share of platform jobs not cancelled (0..1)
  unpaid: number;           // done but not paid
  byStatus: Record<JobStatus, number>;
  monthly: { key: string; month: number; revenue: number; profit: number; count: number }[];
  byService: { serviceId: string; revenue: number; count: number }[];
  byPayment: Record<PaymentMethod, number>;
}

const monthKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/** @param range jobs to include: 'all' or only those completed/created in the last N days */
export function computeMasterStats(jobs: Job[], now = new Date(), months = 6): MasterStats {
  const done = jobs.filter((j) => j.status === 'done');
  const revenue = done.reduce((a, j) => a + (j.price ?? 0), 0);
  const parts = done.reduce((a, j) => a + (j.partsCost || 0), 0);
  const byStatus = { new: 0, accepted: 0, in_progress: 0, done: 0, cancelled: 0 } as Record<JobStatus, number>;
  for (const j of jobs) byStatus[j.status]++;
  const platform = jobs.filter((j) => j.source === 'platform');
  const decided = platform.filter((j) => j.status !== 'new');

  // monthly series (by completion date, fallback creation date)
  const monthly: MasterStats['monthly'] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const list = done.filter((j) => monthKey(j.completedAt ?? j.createdAt) === key);
    const rev = list.reduce((a, j) => a + (j.price ?? 0), 0);
    monthly.push({ key, month: d.getMonth(), revenue: rev, profit: rev - list.reduce((a, j) => a + (j.partsCost || 0), 0), count: list.length });
  }

  const svc = new Map<string, { revenue: number; count: number }>();
  for (const j of done) {
    const share = (j.price ?? 0) / Math.max(1, j.serviceIds.length);
    for (const id of j.serviceIds.length ? j.serviceIds : ['__other']) {
      const cur = svc.get(id) ?? { revenue: 0, count: 0 };
      cur.revenue += share;
      cur.count += 1;
      svc.set(id, cur);
    }
  }

  const byPayment = { cash: 0, card: 0, transfer: 0 } as Record<PaymentMethod, number>;
  for (const j of done) if (j.paymentMethod) byPayment[j.paymentMethod] += j.price ?? 0;

  return {
    revenue,
    parts,
    profit: revenue - parts,
    done: done.length,
    active: byStatus.accepted + byStatus.in_progress,
    newCount: byStatus.new,
    cancelled: byStatus.cancelled,
    avgCheck: done.length ? Math.round(revenue / done.length) : 0,
    acceptanceRate: decided.length ? decided.filter((j) => j.status !== 'cancelled').length / decided.length : 0,
    unpaid: done.filter((j) => !j.paid).reduce((a, j) => a + (j.price ?? 0), 0),
    byStatus,
    monthly,
    byService: [...svc.entries()].map(([serviceId, v]) => ({ serviceId, ...v })).sort((a, b) => b.revenue - a.revenue),
    byPayment,
  };
}

/** CSV for accounting (Excel-friendly: semicolons + BOM). */
export function jobsToCsv(jobs: Job[], serviceName: (id: string) => string): string {
  const head = ['Дата', 'Клиент', 'Телефон', 'Услуги', 'Статус', 'Цена', 'Запчасти', 'Прибыль', 'Оплата', 'Оплачено', 'Источник'];
  const rows = jobs.map((j) => [
    new Date(j.completedAt ?? j.createdAt).toLocaleDateString('ru-RU'),
    j.clientName, j.clientPhone ?? '', j.serviceIds.map(serviceName).join(', ') || j.title,
    j.status, j.price ?? '', j.partsCost || 0, (j.price ?? 0) - (j.partsCost || 0),
    j.paymentMethod ?? '', j.paid ? 'да' : 'нет', j.source === 'platform' ? 'Ustam' : 'вручную',
  ]);
  const esc = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
  return '﻿' + [head, ...rows].map((r) => r.map(esc).join(';')).join('\n');
}
