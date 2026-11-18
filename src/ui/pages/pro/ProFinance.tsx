/**
 * Master's finances: KPIs, monthly revenue/profit bars, revenue by service,
 * by payment method, CSV export for bookkeeping. All from the master's own jobs.
 */
import { getRepo } from '../../../data';
import { computeMasterStats, jobsToCsv } from '../../../domain/analytics';
import type { Key } from '../../../i18n/dictionary';
import { useDatabase, useLive } from '../../../hooks/useDatabase';
import { useAuth } from '../../../state/AuthContext';
import { usePrefs } from '../../../state/PrefsContext';
import { CountUp, Reveal, Stagger } from '../../components/Motion';
import { Icon } from '../../components/Icon';
import { Skeleton } from '../../components/primitives';

export function ProFinance() {
  const { t, tc, money, lang } = usePrefs();
  const { masterProfileId } = useAuth();
  const { db } = useDatabase();
  const { data: jobs } = useLive(
    async () => (masterProfileId ? (await getRepo()).jobsForMaster(masterProfileId) : []),
    ['jobs'], [masterProfileId],
  );
  if (!jobs || !db) return <Skeleton h={400} />;

  const s = computeMasterStats(jobs);
  const svcName = (id: string) => (id === '__other' ? t('an.other') : tc(id, db.services.find((x) => x.id === id)?.name ?? id));
  const fmt = (n: number) => money(Math.round(n));
  const monthName = (m: number) => new Date(2026, m, 1).toLocaleDateString(lang === 'en' ? 'en-GB' : lang === 'uz' ? 'uz-UZ' : 'ru-RU', { month: 'short' });
  const maxM = Math.max(1, ...s.monthly.map((m) => m.revenue));
  const maxS = Math.max(1, ...s.byService.map((x) => x.revenue));
  const payTotal = Math.max(1, s.byPayment.cash + s.byPayment.card + s.byPayment.transfer);

  function exportCsv() {
    const blob = new Blob([jobsToCsv(jobs!, svcName)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ustam-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  const kpis: [Key, number, (n: number) => string][] = [
    ['an.revenue', s.revenue, fmt],
    ['an.profit', s.profit, fmt],
    ['an.parts', s.parts, fmt],
    ['an.avg', s.avgCheck, fmt],
    ['an.done', s.done, (n) => String(Math.round(n))],
    ['an.active', s.active, (n) => String(Math.round(n))],
    ['an.unpaid', s.unpaid, fmt],
    ['an.acceptance', Math.round(s.acceptanceRate * 100), (n) => `${Math.round(n)}%`],
  ];

  return (
    <div className="stack-lg">
      <div className="row-flex" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <p className="muted" style={{ margin: 0 }}>{t('an.sub')}</p>
        <button className="btn ghost sm" onClick={exportCsv} disabled={!jobs.length}><Icon name="external" size={14} />{t('an.export')}</button>
      </div>

      <Stagger className="kpi-grid">
        {kpis.map(([k, v, f], i) => (
          <div key={k} className={i === 0 ? 'kpi-card accent' : 'kpi-card'}>
            <div className="small muted">{t(k)}</div>
            <div className="serif-num"><CountUp value={v} format={f} /></div>
          </div>
        ))}
      </Stagger>

      {s.done === 0 && <div className="panel empty"><p>{t('an.empty')}</p></div>}

      <Reveal as="section" className="panel">
        <h2 className="h3">{t('an.monthly')}</h2>
        <div className="bars" role="img" aria-label={t('an.monthly')}>
          {s.monthly.map((m) => (
            <div key={m.key} className="bar-col" title={`${fmt(m.revenue)} / ${fmt(m.profit)}`}>
              <div className="bar-val small num">{m.revenue ? fmt(m.revenue).replace(/\s?(сум|so'm|soʻm|UZS)$/i, '') : ''}</div>
              <div className="bar-track">
                <div className="bar rev" style={{ height: `${(m.revenue / maxM) * 100}%` }} />
                <div className="bar prof" style={{ height: `${(Math.max(0, m.profit) / maxM) * 100}%` }} />
              </div>
              <div className="small muted">{monthName(m.month)}</div>
            </div>
          ))}
        </div>
        <div className="row-flex small muted" style={{ gap: 16, marginTop: 10 }}>
          <span className="row-flex" style={{ gap: 6 }}><i className="legend rev" />{t('an.revenue')}</span>
          <span className="row-flex" style={{ gap: 6 }}><i className="legend prof" />{t('an.profit')}</span>
        </div>
      </Reveal>

      <div className="grid-2">
        <Reveal as="section" className="panel">
          <h2 className="h3">{t('an.byService')}</h2>
          <div className="stack" style={{ marginTop: 14 }}>
            {s.byService.slice(0, 8).map((x) => (
              <div key={x.serviceId}>
                <div className="row-flex small" style={{ justifyContent: 'space-between' }}><span>{svcName(x.serviceId)} · {x.count}</span><span className="num">{fmt(x.revenue)}</span></div>
                <div className="mbar"><div style={{ width: `${(x.revenue / maxS) * 100}%` }} /></div>
              </div>
            ))}
            {!s.byService.length && <p className="small muted">—</p>}
          </div>
        </Reveal>
        <Reveal as="section" className="panel">
          <h2 className="h3">{t('an.byPayment')}</h2>
          <div className="stack" style={{ marginTop: 14 }}>
            {(['cash', 'card', 'transfer'] as const).map((p) => (
              <div key={p}>
                <div className="row-flex small" style={{ justifyContent: 'space-between' }}><span>{t(`pay.${p}` as Key)}</span><span className="num">{fmt(s.byPayment[p])}</span></div>
                <div className="mbar"><div style={{ width: `${(s.byPayment[p] / payTotal) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </div>
  );
}
