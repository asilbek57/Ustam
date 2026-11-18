/** Sources: where every price and every master comes from (servicesDatabase). */
import { Link } from 'react-router-dom';
import { useDatabase } from '../../hooks/useDatabase';
import { usePrefs } from '../../state/PrefsContext';
import { Skeleton } from '../components/primitives';

export function SourcesPage() {
  const { t, tc, range } = usePrefs();
  const { db } = useDatabase();

  return (
    <div className="container" style={{ maxWidth: 980 }}>
      <div className="page-head">
        <div>
          <h1 className="h1">{t('src.title')}</h1>
          <p className="lead">{t('src.sub')}</p>
          {db && <p className="small muted" style={{ marginTop: 10 }}>{db.meta.city} · {t('data.updated', { d: db.meta.updatedAt })}</p>}
        </div>
      </div>
      {!db ? <Skeleton h={400} /> : (
        <>
          <p className="quote">{db.meta.disclaimer}</p>

          <h2 className="h2 section" style={{ marginBottom: 8 }}>{t('src.services')}</h2>
          {db.categories.map((c) => (
            <div key={c.id} style={{ marginTop: 24 }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>{tc(c.id, c.title)}</div>
              {db.services.filter((s) => s.categoryId === c.id).map((s) => (
                <div key={s.id} className="src-row">
                  <div>
                    <Link to={`/check?service=${s.id}`} className="link">{tc(s.id, s.name)}</Link>
                    <div className="small muted" style={{ marginTop: 4 }}>{s.source.note}</div>
                    <div className="row-flex small" style={{ gap: 14, marginTop: 4 }}>
                      {s.source.olx && <a className="link" href={s.source.olx} target="_blank" rel="noopener noreferrer">OLX.uz ↗</a>}
                      {s.source.web && <a className="link" href={s.source.web} target="_blank" rel="noopener noreferrer">{new URL(s.source.web).hostname} ↗</a>}
                    </div>
                  </div>
                  <span className="num small" style={{ whiteSpace: 'nowrap' }}>{range(s.priceFrom, s.priceTo)}</span>
                </div>
              ))}
            </div>
          ))}

          <h2 className="h2 section" style={{ marginBottom: 8 }}>{t('src.masters')}</h2>
          {db.masters.map((m) => (
            <div key={m.id} className="src-row">
              <div>
                <Link to={`/master/${m.id}`} className="link">{m.name}</Link>
                <div className="small muted" style={{ marginTop: 4 }}>{m.note}</div>
              </div>
              {m.url && <a className="link small" href={m.url} target="_blank" rel="noopener noreferrer">{m.url.includes('olx.uz') ? 'OLX.uz' : new URL(m.url).hostname} ↗</a>}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
