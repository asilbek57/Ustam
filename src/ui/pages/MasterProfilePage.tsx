/** Master profile — only facts from the source: contacts, districts, services, stated prices. */
import { Link, useParams } from 'react-router-dom';
import { useDatabase } from '../../hooks/useDatabase';
import { usePrefs } from '../../state/PrefsContext';
import { priceOf } from '../../domain/pricing';
import { Icon } from '../components/Icon';
import { ContactButtons, DistrictsText, useExp } from '../components/Cards';
import { Avatar, PriceRange, Skeleton } from '../components/primitives';
import { MapView } from '../components/MapView';
import { Reveal } from '../components/Motion';
import { masterPoint } from '../../domain/geo';
import { useBooking } from '../../state/BookingContext';

export function MasterProfilePage() {
  const { id = '' } = useParams();
  const { t, tc, range } = usePrefs();
  const { db, loading } = useDatabase();
  const exp = useExp();
  const { state } = useBooking();

  if (loading) return <div className="container stack"><Skeleton h={220} /><Skeleton h={400} /></div>;
  const m = db?.masters.find((x) => x.id === id);
  if (!db || !m) return <div className="container"><h1 className="h1">{t('common.notFound')}</h1></div>;
  const pt = masterPoint(m);

  return (
    <div className="container">
      <div className="split">
        <div className="stack-lg">
          <section className="panel">
            <div className="profile-head">
              <Avatar name={m.name} size={84} photo={m.photo} />
              <div style={{ minWidth: 0 }}>
                <h1 className="h1" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {m.name}{m.verified && <span className="verified" title={t('m.verified')}><Icon name="shield" size={24} /></span>}
                </h1>
                <p className="muted" style={{ marginTop: 6 }}>{m.title !== m.name ? m.title : ''}</p>
                <div className="chips" style={{ marginTop: 10 }}>
                  <span className={m.registered ? 'tag gold' : 'tag'}>{m.registered ? t('m.onUstam') : t('m.fromOlx')}</span>
                  <span className="tag">{m.type === 'center' ? t('m.center') : t('m.private')}</span>
                  {m.verified && <span className="tag good"><Icon name="shield" size={12} />{t('m.verified')}</span>}
                  {m.categoryIds.map((c) => <span key={c} className="tag outline">{tc(c, db.categories.find((x) => x.id === c)?.title)}</span>)}
                </div>
              </div>
            </div>
            <div className="kv">
              <div><b>{exp(m.experienceLabel) ?? '—'}</b><small>{t('m.experience')}</small></div>
              <div><b style={{ fontSize: 22 }}>{m.responseTime ?? '—'}</b><small>{t('m.response')}</small></div>
              <div><b>{m.serviceIds.length}</b><small>{t('nav.services')}</small></div>
            </div>
          </section>

          {pt && (
            <Reveal as="section" className="panel">
              <h2 className="h2" style={{ marginBottom: 12 }}>{t('map.title')}</h2>
              <MapView height={300} you={state.point}
                points={[{ id: m.id, lat: pt.lat, lng: pt.lng, label: m.name, kind: m.registered ? 'ustam' : 'olx' }]} selectedId={m.id} />
              <p className="small muted" style={{ marginTop: 8 }}>
                {m.workshopAddress ? `${t('pro.workshop')}: ${m.workshopAddress}` : pt.label ? t('map.near', { d: tc(pt.label) }) : ''}
                {!m.point && ` · ${t('map.approx')}`}
              </p>
            </Reveal>
          )}

          <section className="panel">
            <h2 className="h2" style={{ marginBottom: 6 }}>{t('m.services')}</h2>
            {m.serviceIds.map((sid) => {
              const s = db.services.find((x) => x.id === sid);
              if (!s) return null;
              const p = priceOf(m.prices, sid);
              return (
                <div key={sid} className="offer">
                  <div className="offer-top">
                    <Link to={`/check?service=${sid}`} className="link">{tc(s.id, s.name)}</Link>
                    <span className="num" style={{ fontWeight: 600, textAlign: 'right' }}>
                      {p ? range(p.priceFrom, p.priceTo) : <span className="muted" style={{ fontWeight: 400 }}>{range(s.priceFrom, s.priceTo)}</span>}
                      <small className="muted" style={{ display: 'block', fontWeight: 400, fontSize: 11 }}>
                        {p ? `${t('m.priceStated')} · ${p.source === 'verified' ? t('m.srcVerified') : p.source === 'own' ? t('m.onUstam') : t('m.srcListing')}` : t('m.priceMarket')}
                      </small>
                    </span>
                  </div>
                  <PriceRange from={s.priceFrom} to={s.priceTo} mark={p?.priceFrom} />
                </div>
              );
            })}
          </section>
        </div>

        <aside className="sticky stack">
          <section className="panel stack">
            <ContactButtons m={m} size="lg" />
            {!m.phone && <p className="small muted">{t('co.noPhone')}</p>}
            {m.verifiedAt && <p className="small good row-flex" style={{ gap: 6 }}><Icon name="shield" size={14} />{t('m.verifiedAt', { d: m.verifiedAt })}</p>}
            <hr className="divider" style={{ margin: '4px 0' }} />
            <div className="small"><span className="muted">{t('m.goesTo')}: </span><DistrictsText districts={m.districts} /></div>
            {m.location && <div className="small"><span className="muted">{t('m.basedIn', { d: '' })}</span>{tc(m.location)}</div>}
            {m.categoryIds.map((c) => (
              <Link key={c} to={`/c/${c}`} className="btn ghost block">{tc(c, db.categories.find((x) => x.id === c)?.title)} <Icon name="arrow" size={16} /></Link>
            ))}
          </section>
          <section className="panel">
            <div className="label">{t('m.about')}</div>
            <p className="quote" style={{ whiteSpace: 'pre-wrap' }}>{m.bio || m.note}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
