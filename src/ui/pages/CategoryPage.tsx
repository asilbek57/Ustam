/**
 * Request, steps 1–2: describe the problem (AI recognises it), pick
 * services with real OLX price ranges, choose district / address / date /
 * visit type. AI recommends the best real master for the selection.
 * Desktop: content left, sticky request summary right.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useDatabase } from '../../hooks/useDatabase';
import { useBooking, formatSchedule } from '../../state/BookingContext';
import { usePrefs } from '../../state/PrefsContext';
import { basketRange } from '../../domain/pricing';
import { bestOption } from '../../domain/recommendation';
import { matchTask } from '../../services/aiAdvisor';
import type { ID, Service } from '../../domain/types';
import { MapPicker } from '../components/MapView';
import { Icon } from '../components/Icon';
import { Skeleton, Stepper, VisitToggle } from '../components/primitives';
import { AddressModal, DateTimeModal, LOCALE, ServiceModal } from '../components/BookingModals';
import { RecommendationCard } from '../components/Cards';

type Open = 'address' | 'datetime' | 'map' | null;

export function CategoryPage() {
  const { slug = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { t, tc, range, unit, lang, district, setDistrict } = usePrefs();
  const { db, loading } = useDatabase();
  const { state, dispatch } = useBooking();

  const [open, setOpen] = useState<Open>(null);
  const [picked, setPicked] = useState<Service | null>(null);
  const [aiIds, setAiIds] = useState<ID[]>([]);
  const [aiTried, setAiTried] = useState(false);
  const [goNext, setGoNext] = useState(false);

  const category = db?.categories.find((c) => c.id === slug) ?? null;
  const services = useMemo(() => db?.services.filter((s) => s.categoryId === slug) ?? [], [db, slug]);

  // Fresh request per category, then apply ?svc=…&q=… from home search / chat.
  useEffect(() => { dispatch({ type: 'enterCategory', slug }); }, [slug, dispatch]);
  useEffect(() => {
    if (!services.length) return;
    const svc = (params.get('svc') ?? '').split(',').filter((id) => services.some((s) => s.id === id));
    const q = params.get('q');
    if (svc.length) { dispatch({ type: 'addMany', serviceIds: svc }); setAiIds(svc); }
    if (q) { dispatch({ type: 'setDescription', description: q }); setAiTried(true); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services, params]);

  const selected = services.filter((s) => state.cart[s.id]);
  const selectedIds = selected.map((s) => s.id);
  const estimate = basketRange(selected);
  const recommendation = useMemo(
    () => (db ? bestOption(db.masters, db.services, selectedIds, district || null) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db, selectedIds.join(','), district],
  );
  const needsAddress = state.visitType === 'home' && !state.address.trim();
  const step = !selected.length ? 1 : !state.schedule || needsAddress ? 2 : 3;
  const toggle = (id: ID) => dispatch({ type: 'setQty', serviceId: id, qty: state.cart[id] ? 0 : 1 });

  function recognise() {
    const ids = matchTask(state.description, services);
    setAiIds(ids);
    setAiTried(true);
    if (ids.length) dispatch({ type: 'addMany', serviceIds: ids });
  }

  /** Main action: collect what's missing, then go to masters. */
  function next() {
    if (needsAddress) { setGoNext(true); return setOpen('address'); }
    if (!state.schedule) { setGoNext(true); return setOpen('datetime'); }
    navigate(`/c/${slug}/masters`);
  }
  // After a required dialog closes with a value, continue automatically.
  useEffect(() => {
    if (goNext && open === null) { setGoNext(false); next(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goNext, open, state.schedule, state.address]);

  if (loading) return <div className="container stack"><Skeleton h={80} /><Skeleton h={420} /></div>;
  if (!db || !category) return <div className="container"><h1 className="h1">{t('common.notFound')}</h1></div>;

  const scheduleText = state.schedule ? formatSchedule(state.schedule, t('dt.today'), t('dt.tomorrow'), LOCALE[lang]) : t('order.noDate');
  const cta = (
    <button className="btn lg block" onClick={next} disabled={!selected.length}>
      {!state.schedule || needsAddress ? t('cat.selectDate') : t('cat.findBest')} <Icon name="arrow" size={18} />
    </button>
  );

  return (
    <div className="container">
      <Stepper current={step as 1 | 2 | 3} />
      <div className="cat-hero">
        <Icon name={category.id} size={52} stroke={1.25} className="cat-icon" />
        <div>
          <h1 className="h1">{tc(category.id, category.title)}</h1>
          <p className="muted">{t('cat.meta', { n: services.length })} · {t('data.updated', { d: db.meta.updatedAt })}</p>
        </div>
      </div>

      <div className="split" style={{ marginTop: 28 }}>
        <div className="stack-lg">
          {/* ---- problem ---- */}
          <section className="panel">
            <h2 className="h2" style={{ marginBottom: 14 }}>{t('cat.what')}</h2>
            <textarea className="textarea" rows={3} placeholder={t('cat.describe')} value={state.description}
              onChange={(e) => dispatch({ type: 'setDescription', description: e.target.value })} />
            <div className="row-flex" style={{ marginTop: 12, flexWrap: 'wrap' }}>
              <button className="btn ghost sm" onClick={recognise} disabled={!state.description.trim()}>
                <Icon name="spark" size={15} />{t('cat.recognise')}
              </button>
              {aiTried && aiIds.length > 0 && <span className="small muted">{t('cat.recognised')}:</span>}
              {aiTried && aiIds.map((id) => {
                const s = services.find((x) => x.id === id)!;
                return (
                  <button key={id} className={state.cart[id] ? 'chip on' : 'chip gold'} onClick={() => toggle(id)}>
                    <Icon name={state.cart[id] ? 'check' : 'plus'} size={13} />{tc(s.id, s.name)}
                  </button>
                );
              })}
              {aiTried && !aiIds.length && <span className="small muted">{t('cat.notRecognised')}</span>}
            </div>
            {recommendation && (
              <div style={{ marginTop: 20 }}>
                <RecommendationCard r={recommendation} selected={selectedIds.length}
                  onChoose={state.schedule && !needsAddress ? () => { dispatch({ type: 'chooseMaster', masterId: recommendation.master.id }); navigate('/contact'); } : undefined} />
              </div>
            )}
          </section>

          {/* ---- services from the database ---- */}
          <section className="panel">
            <h2 className="h2" style={{ marginBottom: 4 }}>{t('cat.services')}</h2>
            {services.map((s) => {
              const on = !!state.cart[s.id];
              return (
                <div key={s.id} className={['svc', on ? 'in' : '', aiIds.includes(s.id) ? 'ai' : ''].join(' ')}>
                  <button className="svc-main" style={{ textAlign: 'left' }} onClick={() => setPicked(s)}>
                    <span className="svc-name">{tc(s.id, s.name)}</span>
                    <span className="svc-meta">
                      {[unit(s.unit), s.warranty && s.warranty !== '—' ? t('cat.warranty', { w: tc(s.warranty, s.warranty) }) : ''].filter(Boolean).join(' · ')}
                    </span>
                  </button>
                  <span className="svc-price">{range(s.priceFrom, s.priceTo)}</span>
                  <button className="svc-add" onClick={() => toggle(s.id)} aria-label={on ? t('common.remove') : t('common.add')}>
                    <Icon name={on ? 'check' : 'plus'} size={15} />
                  </button>
                </div>
              );
            })}
          </section>
        </div>

        {/* ---- request summary ---- */}
        <aside className="sticky stack">
          <section className="panel">
            <h2 className="h2" style={{ marginBottom: 6 }}>{t('order.title')}</h2>
            <label className="setting" style={{ position: 'relative' }}>
              <span className="setting-ic"><Icon name="pin" size={18} /></span>
              <span className="setting-body"><small>{t('district.label')}</small><span>{district ? tc(district) : t('district.any')}</span></span>
              <Icon name="chevron" size={16} className="muted" />
              <select value={district} onChange={(e) => setDistrict(e.target.value)} aria-label={t('district.label')}
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}>
                <option value="">{t('district.any')}</option>
                {db.districts.map((d) => <option key={d} value={d}>{tc(d)}</option>)}
              </select>
            </label>
            <button className="setting" onClick={() => setOpen('map')}>
              <span className="setting-ic"><Icon name="pin" size={18} /></span>
              <span className="setting-body"><small>{t('map.title')}</small><span>{state.point ? t('map.near', { d: tc(state.point.label ?? '') }) : t('map.pick')}</span></span>
              <Icon name="chevron" size={16} className="muted" />
            </button>
            <button className={needsAddress ? 'setting todo' : 'setting'} onClick={() => setOpen('address')}>
              <span className="setting-ic"><Icon name="home" size={18} /></span>
              <span className="setting-body"><small>{t('cat.address')}</small><span>{state.address || '—'}</span></span>
              <Icon name="chevron" size={16} className="muted" />
            </button>
            <button className={state.schedule ? 'setting' : 'setting todo'} onClick={() => setOpen('datetime')}>
              <span className="setting-ic"><Icon name="calendar" size={18} /></span>
              <span className="setting-body"><small>{t('cat.dateTime')}</small><span>{scheduleText}</span></span>
              <Icon name="chevron" size={16} className="muted" />
            </button>
            <div className="label" style={{ marginTop: 16 }}>{t('cat.visit')}</div>
            <VisitToggle value={state.visitType} onChange={(v) => dispatch({ type: 'setVisitType', visitType: v })} />

            <div style={{ marginTop: 18 }}>
              {!selected.length && <p className="small muted">{t('order.empty')}</p>}
              {selected.map((s) => (
                <div key={s.id} className="cart-item">
                  <span>{tc(s.id, s.name)}</span>
                  <button onClick={() => toggle(s.id)} aria-label={t('common.remove')}><Icon name="x" size={14} /></button>
                </div>
              ))}
              {selected.length > 0 && <p className="small" style={{ marginTop: 10 }}>{t('order.estimate', { p: range(estimate.from, estimate.to) })}</p>}
            </div>
            <div className="desktop-only" style={{ marginTop: 20 }}>{cta}</div>
            <p className="small muted" style={{ marginTop: 14, textAlign: 'center' }}>{t('pay.after')}</p>
          </section>
        </aside>
      </div>

      <div className="mobile-action mobile-only">{cta}</div>

      <ServiceModal
        service={picked}
        selected={picked ? !!state.cart[picked.id] : false}
        mastersCount={picked ? db.masters.filter((m) => m.serviceIds.includes(picked.id)).length : 0}
        onClose={() => setPicked(null)}
        onToggle={() => { if (picked) toggle(picked.id); setPicked(null); }}
      />
      <DateTimeModal open={open === 'datetime'} initial={state.schedule} visitType={state.visitType}
        onClose={() => { setOpen(null); setGoNext(false); }}
        onConfirm={(schedule) => { dispatch({ type: 'setSchedule', schedule }); setOpen(null); }} />
      <MapPicker open={open === 'map'} title={t('map.pickTitle')} value={state.point}
        onClose={() => setOpen(null)}
        onSave={(point) => { dispatch({ type: 'setPoint', point }); if (point.label) setDistrict(point.label); setOpen(null); }} />
      <AddressModal open={open === 'address'} value={state.address}
        onClose={() => { setOpen(null); setGoNext(false); }}
        onSave={(address) => { dispatch({ type: 'setAddress', address }); setOpen(null); }} />
    </div>
  );
}
