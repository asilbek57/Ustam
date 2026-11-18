/**
 * Request step 4: contact the chosen REAL master (chat on Ustam or phone
 * listing), see the expected price from the market range, save the request.
 */
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { getRepo } from '../../data';
import { useAuth } from '../../state/AuthContext';
import type { Key } from '../../i18n/dictionary';
import { MapView } from '../components/MapView';
import { masterPoint } from '../../domain/geo';
import { useDatabase } from '../../hooks/useDatabase';
import { useBooking, formatSchedule, scheduleToDate } from '../../state/BookingContext';
import { usePrefs } from '../../state/PrefsContext';
import { basketRange, priceOf } from '../../domain/pricing';
import { Icon } from '../components/Icon';
import { Avatar, Stepper } from '../components/primitives';
import { ContactButtons } from '../components/Cards';
import { LOCALE } from '../components/BookingModals';

export function ContactPage() {
  const { state, dispatch } = useBooking();
  const navigate = useNavigate();
  const { t, tc, range, lang, district } = usePrefs();
  const { db } = useDatabase();
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { user } = useAuth();

  if (!state.categorySlug || !state.masterId) return <Navigate to="/" replace />;
  if (!db) return <div className="container"><div className="skel" style={{ height: 400 }} /></div>;
  const m = db.masters.find((x) => x.id === state.masterId);
  if (!m) return <Navigate to="/" replace />;

  const selected = db.services.filter((s) => state.cart[s.id]);
  const est = basketRange(selected);
  const own = selected.map((s) => ({ s, p: priceOf(m.prices, s.id) })).filter((x) => x.p);
  const when = state.schedule ? formatSchedule(state.schedule, t('dt.today'), t('dt.tomorrow'), LOCALE[lang]) : '—';

  /**
   * Registered master → the request goes to them (job + chat opens).
   * OLX master → same chat (local inbox until they join Ustam) + phone.
   */
  async function save() {
    setSaving(true);
    try {
      const repo = await getRepo();
      const me = (await repo.chatIdentity(true))!;   // signed-in client, or a guest
      const job = await repo.createJob({
        masterId: m!.id, masterName: m!.name,
        clientId: me.id, clientName: user?.name ?? me.name, clientPhone: user?.phone ?? null,
        categoryId: state.categorySlug!, serviceIds: selected.map((s) => s.id),
        title: selected.map((s) => s.name).join(', '), description: state.description,
        district: district || state.point?.label || null, address: state.address, point: state.point,
        scheduledAt: state.schedule ? scheduleToDate(state.schedule).toISOString() : null,
        visitType: state.visitType, estimateFrom: est.from, estimateTo: est.to, source: 'platform',
      });
      dispatch({ type: 'resetOrder' });
      {
        // Every request opens a chat with the master and posts the order details.
        const firstMessage = t('co.firstMsg', { s: selected.map((s) => tc(s.id, s.name)).join(', ') })
          + (state.description ? `\n${state.description}` : '')
          + (state.schedule ? `\n${t('co.when')}: ${when}` : '')
          + (state.address ? `\n${t('cat.address')}: ${state.address}` : '');
        const conv = await repo.openConversation({ masterId: m!.id, jobId: job.id, firstMessage });
        navigate(`/messages/${conv.id}`);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  return (
    <div className="container">
      <Stepper current={4} />
      <div className="page-head">
        <div>
          <button className="arrow-link small muted" onClick={() => navigate(-1)} style={{ marginBottom: 12 }}><Icon name="back" size={14} /> {t('common.back')}</button>
          <h1 className="h1">{t('co.title')}</h1>
          <p className="lead">{t('co.sub')}</p>
        </div>
      </div>
      <div className="split">
        <section className="panel">
          <div className="row-flex">
            <Avatar name={m.name} size={56} photo={m.photo} />
            <div>
              <div className="master-name">{m.name}{m.verified && <span className="verified"><Icon name="shield" size={15} /></span>}</div>
              <div className="small muted">{m.type === 'center' ? t('m.center') : t('m.private')} · {m.responseTime}</div>
            </div>
          </div>
          <div style={{ marginTop: 18 }}><ContactButtons m={m} size="lg" /></div>
          {!m.phone && <p className="small muted" style={{ marginTop: 10 }}>{t('co.noPhone')}</p>}
          {(state.point || masterPoint(m)) && (
            <div style={{ marginTop: 18 }}>
              <MapView height={200}
                you={state.point}
                points={masterPoint(m) ? [{ id: m.id, ...masterPoint(m)!, label: m.name, kind: m.registered ? 'ustam' : 'olx' }] : []} />
            </div>
          )}
          <hr className="divider" />
          <div className="summary-line"><span className="muted">{t('co.service')}</span><span style={{ textAlign: 'right' }}>{selected.map((s) => tc(s.id, s.name)).join(', ')}</span></div>
          <div className="summary-line"><span className="muted">{t('co.visit')}</span><span>{state.visitType === 'home' ? t('visit.home') : t('visit.workshop')}</span></div>
          {district && <div className="summary-line"><span className="muted">{t('district.label')}</span><span>{tc(district)}</span></div>}
          {state.address && <div className="summary-line"><span className="muted">{t('cat.address')}</span><span style={{ textAlign: 'right' }}>{state.address}</span></div>}
          <div className="summary-line"><span className="muted">{t('co.when')}</span><span>{when}</span></div>
          {state.description && <div className="summary-line"><span className="muted">{t('co.task')}</span><span style={{ textAlign: 'right' }}>{state.description}</span></div>}
        </section>

        <aside className="sticky">
          <section className="panel">
            <h2 className="h2" style={{ marginBottom: 10 }}>{t('co.estimate')}</h2>
            {selected.map((s) => (
              <div key={s.id} className="summary-line"><span>{tc(s.id, s.name)}</span><span className="num">{range(s.priceFrom, s.priceTo)}</span></div>
            ))}
            {selected.length > 1 && <div className="summary-total"><span>Σ</span><strong className="num" style={{ fontSize: 18 }}>{range(est.from, est.to)}</strong></div>}
            <p className="small muted" style={{ marginTop: 8 }}>{t('co.estimateNote')}</p>
            {own.length > 0 && (
              <>
                <div className="label" style={{ marginTop: 18 }}>{t('co.masterPrice')}</div>
                {own.map(({ s, p }) => (
                  <div key={s.id} className="summary-line"><span>{tc(s.id, s.name)}</span><b className="num">{range(p!.priceFrom, p!.priceTo)}</b></div>
                ))}
              </>
            )}
            <button className="btn lg block" style={{ marginTop: 20 }} onClick={save} disabled={saving}>
              {saving ? t('co.sending') : t('co.send')}
            </button>
            <p className="small muted" style={{ marginTop: 10 }}>{t('co.sentNote')}</p>
            {err && <p className="error small" style={{ marginTop: 10 }}>{err.includes('.') ? t(err as Key) : err}</p>}
            <p className="small muted" style={{ marginTop: 12, textAlign: 'center' }}>{t('pay.after')}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
