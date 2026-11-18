/** Full catalog: all 53 services from servicesDatabase with their OLX price ranges. */
import { Link } from 'react-router-dom';
import { useDatabase } from '../../hooks/useDatabase';
import { usePrefs } from '../../state/PrefsContext';
import { CategoryTiles } from '../components/Cards';
import { Skeleton } from '../components/primitives';

export function ServicesPage() {
  const { t, tc, range, unit } = usePrefs();
  const { db } = useDatabase();

  return (
    <div className="container">
      <div className="page-head">
        <div>
          <h1 className="h1">{t('nav.services')}</h1>
          <p className="lead">{t('home.servicesSub')}</p>
        </div>
      </div>
      {!db ? <Skeleton h={392} /> : (
        <>
          <CategoryTiles categories={db.categories} services={db.services} />
          <div className="section grid-2" style={{ gap: 48 }}>
            {db.categories.map((c) => (
              <div key={c.id}>
                <div className="section-head" style={{ marginBottom: 6 }}>
                  <h2 className="h2">{tc(c.id, c.title)}</h2>
                  <Link to={`/c/${c.id}`} className="link small">{t('home.find')}</Link>
                </div>
                {db.services.filter((s) => s.categoryId === c.id).map((s) => (
                  <Link key={s.id} to={`/c/${c.id}?svc=${s.id}`} className="svc" style={{ padding: '12px 0' }}>
                    <span className="svc-main">{tc(s.id, s.name)}<span className="svc-meta" style={{ display: 'block' }}>{unit(s.unit)}</span></span>
                    <span className="svc-price small">{range(s.priceFrom, s.priceTo)}</span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
