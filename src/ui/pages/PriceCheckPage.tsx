/**
 * Fair-price check: service + quoted price → below / fair / above the real
 * OLX.uz price range from servicesDatabase, what's included, warranty,
 * sources, and the real masters who do this service.
 */
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDatabase } from '../../hooks/useDatabase';
import { usePrefs } from '../../state/PrefsContext';
import { priceVerdict } from '../../domain/pricing';
import { rankMasters } from '../../domain/recommendation';
import { priceAdvice } from '../../services/aiAdvisor';
import { formatNumber } from '../../../shared/stats.js';
import { ServicePicker } from '../components/ServicePicker';
import { MasterCard } from '../components/Cards';
import { PriceRange, Skeleton } from '../components/primitives';
import { Icon } from '../components/Icon';

export function PriceCheckPage() {
  const { t, tc, money, range, unit, district } = usePrefs();
  const { db } = useDatabase();
  const [params, setParams] = useSearchParams();
  const serviceId = params.get('service') ?? '';
  const quote = Number((params.get('price') ?? '').replace(/\D/g, '')) || null;
  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) v ? next.set(k, v) : next.delete(k);
    setParams(next, { replace: true });
  };

  const service = db?.services.find((s) => s.id === serviceId) ?? null;
  const v = service && quote ? priceVerdict(quote, service) : null;
  const masters = useMemo(() => (db && service ? rankMasters(db.masters, db.services, {
    serviceIds: [service.id], district: district || null, visitType: 'any', strategy: 'ai_best', type: 'any', onlyVerified: false,
  }) : []), [db, service, district]);
  const tone = v?.label === 'below' ? 'good' : v?.label === 'above' ? 'bad' : 'warn';

  return (
    <div className="container">
      <div className="page-head">
        <div>
          <div className="eyebrow">{t('nav.check')}</div>
          <h1 className="h1" style={{ marginTop: 10 }}>{t('pc.title')}</h1>
          <p className="lead">{t('pc.sub')}</p>
        </div>
      </div>

      <section className="panel">
        <div className="form-grid two">
          <div>
            <label className="label">{t('pc.service')}</label>
            {db ? <ServicePicker services={db.services} categories={db.categories} value={service} onChange={(s) => update({ service: s.id })} /> : <Skeleton h={50} />}
          </div>
          <div>
            <label className="label">{t('pc.quote')} <span style={{ opacity: .7 }}>· {t('pc.quoteHint')}</span></label>
            <input className="input num" inputMode="numeric" placeholder="350 000"
              value={quote ? formatNumber(quote) : ''} onChange={(e) => update({ price: e.target.value.replace(/\D/g, '') })} />
          </div>
        </div>
      </section>

      {!service && db && <div className="panel empty" style={{ marginTop: 24 }}><p className="muted">{t('pc.empty')}</p></div>}

      {service && db && (
        <div className="split" style={{ marginTop: 24 }}>
          <div className="stack-lg">
            <section className="panel">
              {v ? (
                <div className="verdict" style={{ flexWrap: 'wrap' }}>
                  <span className={`verdict-word ${tone}`}>{t(`pc.verdict.${v.label}`)}</span>
                  <span className={`tag ${tone}`}>
                    {v.label === 'below' ? t('pc.diffBelow', { n: -v.diff }) : v.label === 'above' ? t('pc.diffAbove', { n: v.diff }) : t('pc.inRange')}
                  </span>
                </div>
              ) : (
                <div className="verdict"><span className="verdict-word" style={{ fontSize: 'clamp(30px,4vw,44px)' }}>{range(service.priceFrom, service.priceTo)}</span></div>
              )}
              <p className="muted small" style={{ marginTop: 10 }}>{[tc(service.id, service.name), unit(service.unit)].filter(Boolean).join(' · ')}</p>
              <div className="eyebrow" style={{ margin: '26px 0 10px' }}>{t('pc.market')}</div>
              <PriceRange from={service.priceFrom} to={service.priceTo} mark={quote ?? undefined} />
              {service.priceTo == null && service.priceFrom > 0 && <p className="small muted" style={{ marginTop: 12 }}>{t('pc.openRange', { p: money(service.priceFrom) })}</p>}

              <hr className="divider" />
              <div className="label">{t('svc.description')}</div>
              <p style={{ color: 'var(--ink-2)' }}>{service.description}</p>
              <div className="row-flex small" style={{ marginTop: 14, flexWrap: 'wrap', gap: 8 }}>
                {service.warranty && service.warranty !== '—' && <span className="tag good">{t('cat.warranty', { w: tc(service.warranty, service.warranty) })}</span>}
              </div>
              <div className="label" style={{ marginTop: 18 }}>{t('svc.source')}</div>
              <p className="small muted">{service.source.note}</p>
              <div className="row-flex small" style={{ marginTop: 8, gap: 16, flexWrap: 'wrap' }}>
                {service.source.olx && <a className="link" href={service.source.olx} target="_blank" rel="noopener noreferrer">{t('svc.olx')} ↗</a>}
                {service.source.web && <a className="link" href={service.source.web} target="_blank" rel="noopener noreferrer">{t('svc.web')} ↗</a>}
              </div>
            </section>

            <section>
              <div className="section-head"><h2 className="h2">{t('pc.masters')}</h2><span className="small muted">{t('m.count', { n: masters.length })}</span></div>
              {masters.length === 0 ? <div className="panel empty"><p className="muted">{t('m.none')}</p></div> : (
                <div className="masters-grid">{masters.map((r) => <MasterCard key={r.master.id} r={r} services={db.services} />)}</div>
              )}
            </section>
          </div>

          <aside className="sticky stack">
            <section className="ai-card">
              <div className="eyebrow"><Icon name="spark" size={13} />{t('pc.advice')}</div>
              <p className="advisor-text" style={{ marginTop: 12, fontSize: 19 }}>{priceAdvice(t, v?.label ?? null, tc(service.warranty, service.warranty))}</p>
            </section>
            <Link to={`/c/${service.categoryId}?svc=${service.id}`} className="btn lg block">{t('pc.book')} <Icon name="arrow" size={16} /></Link>
          </aside>
        </div>
      )}
    </div>
  );
}
