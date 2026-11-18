/**
 * Real masters base + AI advisor. Two modes:
 *   /c/:slug/masters  request flow: ranks masters for the selected services
 *   /masters          the whole base, by category and district
 */
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDatabase } from '../../hooks/useDatabase';
import { useBooking } from '../../state/BookingContext';
import { usePrefs } from '../../state/PrefsContext';
import { rankMasters } from '../../domain/recommendation';
import { explainRanking } from '../../services/aiAdvisor';
import type { VisitType } from '../../domain/types';
import { AdvisorPanel, type AdvisorFilters } from '../components/AdvisorPanel';
import { MasterCard } from '../components/Cards';
import { DistrictPicker } from '../components/Layout';
import { Skeleton, Stepper, VisitToggle } from '../components/primitives';
import { Icon } from '../components/Icon';
import { MapView, type MapPoint } from '../components/MapView';
import { Stagger } from '../components/Motion';
import { masterPoint } from '../../domain/geo';

export function MastersPage() {
  const { slug } = useParams();
  const booking = !!slug;
  const navigate = useNavigate();
  const { t, tc, money, district } = usePrefs();
  const { state, dispatch } = useBooking();
  const { db, loading } = useDatabase();

  const [filters, setFilters] = useState<AdvisorFilters>({ strategy: 'ai_best', type: 'any', onlyVerified: false });
  const [category, setCategory] = useState('all');
  const [visit, setVisit] = useState<VisitType | 'any'>('any');
  const [view, setView] = useState<'list' | 'map'>('list');
  const [sel, setSel] = useState<string | null>(null);

  const serviceIds = useMemo(() => (booking ? Object.keys(state.cart) : []), [booking, state.cart]);
  const categoryId = booking ? slug! : category === 'all' ? null : category;

  const ranked = useMemo(
    () => (db ? rankMasters(db.masters, db.services, {
      serviceIds, categoryId, district: district || null, visitType: booking ? state.visitType : visit, ...filters,
    }) : []),
    [db, serviceIds, categoryId, district, booking, state.visitType, visit, filters],
  );
  const explanation = db ? explainRanking(t, money, ranked, district, tc(district), serviceIds.length) : t('common.loading');
  const cat = db?.categories.find((c) => c.id === slug);
  // Map pins: own point of registered masters, else the district centre from the listing.
  const points: MapPoint[] = useMemo(() => ranked.flatMap((r) => {
    const p = masterPoint(r.master);
    return p ? [{ id: r.master.id, lat: p.lat, lng: p.lng, label: r.master.name, kind: r.master.registered ? 'ustam' : 'olx' } as MapPoint] : [];
  }), [ranked]);
  const selRanked = ranked.find((r) => r.master.id === sel) ?? null;

  function choose(id: string) {
    if (!booking) return navigate(`/master/${id}`);
    dispatch({ type: 'chooseMaster', masterId: id });
    navigate('/contact');
  }

  return (
    <div className="container">
      {booking && <Stepper current={3} />}
      <div className="page-head">
        <div>
          {booking && (
            <button className="arrow-link small muted" onClick={() => navigate(`/c/${slug}`)} style={{ marginBottom: 12 }}>
              <Icon name="back" size={14} /> {t('common.back')}
            </button>
          )}
          <h1 className="h1">{booking && cat ? t('m.for', { c: tc(cat.id, cat.title) }) : t('m.base')}</h1>
          <p className="lead">{booking ? (serviceIds.length ? t('m.items', { n: serviceIds.length }) : t('m.noItems')) : t('m.baseSub')}</p>
        </div>
      </div>

      <div className="split left">
        <aside className="sticky stack">
          <section className="panel tight">
            <div className="label">{t('district.label')}</div>
            <DistrictPicker />
            {booking ? (
              <>
                <div className="label" style={{ marginTop: 16 }}>{t('cat.visit')}</div>
                <VisitToggle value={state.visitType} onChange={(v) => dispatch({ type: 'setVisitType', visitType: v })} />
              </>
            ) : (
              <>
                <div className="label" style={{ marginTop: 16 }}>{t('nav.services')}</div>
                <div className="chips">
                  <button className={category === 'all' ? 'chip on' : 'chip'} onClick={() => setCategory('all')}>{t('common.all')}</button>
                  {db?.categories.map((c) => (
                    <button key={c.id} className={category === c.id ? 'chip on' : 'chip'} onClick={() => setCategory(c.id)}>
                      <Icon name={c.id} size={14} />{tc(c.id, c.title)}
                    </button>
                  ))}
                </div>
                <div className="label" style={{ marginTop: 16 }}>{t('cat.visit')}</div>
                <div className="chips">
                  {(['any', 'home', 'workshop'] as const).map((v) => (
                    <button key={v} className={visit === v ? 'chip on' : 'chip'} onClick={() => setVisit(v)}>
                      {v === 'any' ? t('common.any') : v === 'home' ? t('visit.home') : t('visit.workshop')}
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>
          <AdvisorPanel filters={filters} onChange={setFilters} explanation={explanation} />
        </aside>

        <div>
          <div className="section-head">
            <span className="h2">{t('m.count', { n: ranked.length })}</span>
            <div className="seg mini" role="tablist">
              <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}><Icon name="list" size={13} /> {t('map.list')}</button>
              <button className={view === 'map' ? 'on' : ''} onClick={() => setView('map')}><Icon name="pin" size={13} /> {t('map.title')}</button>
            </div>
          </div>
          {loading ? (
            <div className="masters-grid"><Skeleton h={260} /><Skeleton h={260} /></div>
          ) : ranked.length === 0 ? (
            <div className="empty panel"><p className="muted">{t('m.none')}</p></div>
          ) : view === 'map' ? (
            <div className="stack">
              <MapView points={points} you={state.point} selectedId={sel} onSelect={setSel} height={460} />
              <p className="small muted">{t('map.onMap', { n: points.length, total: ranked.length })}</p>
              {selRanked && (
                <div className="masters-grid" key={selRanked.master.id}>
                  <MasterCard r={selRanked} services={db!.services} onSelect={() => choose(selRanked.master.id)}
                    selectLabel={booking ? t('m.choose') : t('m.profile')} />
                </div>
              )}
            </div>
          ) : (
            <Stagger className="masters-grid">
              {ranked.map((r) => (
                <MasterCard key={r.master.id} r={r} services={db!.services} onSelect={() => choose(r.master.id)}
                  selectLabel={booking ? t('m.choose') : t('m.profile')} />
              ))}
            </Stagger>
          )}
        </div>
      </div>
    </div>
  );
}
