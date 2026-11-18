/**
 * Client's requests: jobs created by this user (or this browser when not
 * signed in). Status updates from the master arrive live.
 */
import { Link, useSearchParams } from 'react-router-dom';
import { getRepo } from '../../data';
import { deviceId } from '../../data/repository';
import type { Key } from '../../i18n/dictionary';
import { useDatabase, useLive } from '../../hooks/useDatabase';
import { useAuth } from '../../state/AuthContext';
import { usePrefs } from '../../state/PrefsContext';
import { Icon } from '../components/Icon';
import { Skeleton } from '../components/primitives';
import { Stagger } from '../components/Motion';

export function RequestsPage() {
  const { t, tc, range, money, lang } = usePrefs();
  const [params] = useSearchParams();
  const newId = params.get('new');
  const { db } = useDatabase();
  const { user, ready } = useAuth();
  const { data: list } = useLive(async () => {
    const repo = await getRepo();
    const me = await repo.chatIdentity();
    // Local mode: also show requests made as a guest in this browser before signing in.
    const ids = [...new Set([me?.id, repo.mode === 'local' ? deviceId() : null].filter(Boolean) as string[])];
    const lists = await Promise.all(ids.map((id) => repo.jobsForClient(id)));
    return lists.flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, ['jobs', 'auth'], [user?.id]);
  const { data: convs } = useLive(async () => (await getRepo()).listConversations(), ['chat'], [user?.id]);

  return (
    <div className="container" style={{ maxWidth: 820 }}>
      <div className="page-head"><h1 className="h1">{t('o.title')}</h1></div>
      {newId && <div className="success"><Icon name="check" size={18} />{t('o.placed')}</div>}
      {(!ready || !list) && <Skeleton h={200} />}
      {list && !list.length && (
        <div className="empty panel">
          <p className="muted">{t('o.empty')}</p>
          <Link to="/" className="btn">{t('o.find')}</Link>
        </div>
      )}
      <Stagger className="stack">
        {(list ?? []).map((r) => {
          const cat = db?.categories.find((c) => c.id === r.categoryId);
          const master = db?.masters.find((m) => m.id === r.masterId);
          const conv = convs?.find((c) => c.jobId === r.id) ?? convs?.find((c) => c.masterId === r.masterId);
          return (
            <article key={r.id} className={r.id === newId ? 'order new' : 'order'}>
              <div>
                <div className="h2" style={{ fontSize: 18 }}>{cat ? tc(cat.id, cat.title) : r.title}</div>
                <div className="small muted" style={{ marginTop: 4 }}>
                  {r.scheduledAt ? new Date(r.scheduledAt).toLocaleString(lang === 'en' ? 'en-GB' : 'ru-RU', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                  {' · '}{r.visitType === 'home' ? t('visit.home') : t('visit.workshop')}
                  {r.district ? ` · ${tc(r.district)}` : ''}
                </div>
                <div className="small" style={{ marginTop: 6 }}>
                  {master ? <Link to={`/master/${master.id}`} className="link">{master.name}</Link> : r.masterName}
                  {master?.phoneDisplay && <> · <a className="link" href={`tel:${master.phone}`}>{master.phoneDisplay}</a></>}
                  {conv && <> · <Link className="link" to={`/messages/${conv.id}`}>{t('jobs.chat')}</Link></>}
                </div>
                <div className="small muted">{r.serviceIds.map((id) => { const s = db?.services.find((x) => x.id === id); return s ? tc(s.id, s.name) : id; }).join(', ')}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className={`tag status-${r.status}`}>{t(`status.${r.status}` as Key)}</span>
                <div className="num small" style={{ fontWeight: 600, marginTop: 10 }}>{r.price != null ? money(r.price) : range(r.estimateFrom, r.estimateTo)}</div>
              </div>
            </article>
          );
        })}
      </Stagger>
    </div>
  );
}
