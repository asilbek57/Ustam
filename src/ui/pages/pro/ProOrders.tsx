/**
 * Master's orders: incoming requests from Ustam + orders added manually.
 * Status flow: new → accepted → in_progress → done (or cancelled).
 * The master records the final price, parts cost, payment method and
 * whether it is paid — this feeds the Finances tab.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getRepo } from '../../../data';
import type { Job, JobStatus, PaymentMethod } from '../../../domain/types';
import type { Key } from '../../../i18n/dictionary';
import { useDatabase, useLive } from '../../../hooks/useDatabase';
import { useAuth } from '../../../state/AuthContext';
import { usePrefs } from '../../../state/PrefsContext';
import { Icon } from '../../components/Icon';
import { Modal, Skeleton } from '../../components/primitives';

const FILTERS: (JobStatus | 'all')[] = ['all', 'new', 'accepted', 'in_progress', 'done', 'cancelled'];
const PAY: PaymentMethod[] = ['cash', 'card', 'transfer'];

export function ProOrders() {
  const { t, tc, money, range } = usePrefs();
  const { masterProfileId } = useAuth();
  const { db } = useDatabase();
  const nav = useNavigate();
  const [filter, setFilter] = useState<JobStatus | 'all'>('all');
  const [adding, setAdding] = useState(false);
  const { data: jobs } = useLive(
    async () => (masterProfileId ? (await getRepo()).jobsForMaster(masterProfileId) : []),
    ['jobs'], [masterProfileId],
  );
  const { data: convs } = useLive(async () => (await getRepo()).listConversations(), ['chat'], []);

  if (!masterProfileId) return <div className="panel empty"><p>{t('pro.err.noProfile')}</p><Link to="/pro" className="btn">{t('pro.tabProfile')}</Link></div>;
  if (!jobs || !db) return <Skeleton h={300} />;

  const svcName = (id: string) => tc(id, db.services.find((s) => s.id === id)?.name ?? id);
  const list = jobs.filter((j) => filter === 'all' || j.status === filter);
  const upd = async (id: string, patch: Partial<Job>) => (await getRepo()).updateJob(id, patch);
  const chatFor = (j: Job) => convs?.find((c) => c.jobId === j.id) ?? convs?.find((c) => c.clientId === j.clientId && c.masterId === j.masterId);

  return (
    <div className="stack-lg">
      <div className="row-flex" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div className="chips">
          {FILTERS.map((f) => {
            const n = f === 'all' ? jobs.length : jobs.filter((j) => j.status === f).length;
            return <button key={f} className={filter === f ? 'chip on' : 'chip'} onClick={() => setFilter(f)}>
              {f === 'all' ? t('jobs.all') : t(`status.${f}` as Key)} <span className="muted">{n}</span></button>;
          })}
        </div>
        <button className="btn" onClick={() => setAdding(true)}><Icon name="plus" size={16} />{t('jobs.add')}</button>
      </div>

      {list.length === 0 && <div className="panel empty"><p>{t('jobs.empty')}</p></div>}

      <div className="stagger in stack">
        {list.map((j, i) => {
          const conv = chatFor(j);
          return (
            <article key={j.id} className="job panel" style={{ ['--d' as string]: `${i * 40}ms` }}>
              <header className="row-flex" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div className="row-flex" style={{ gap: 8 }}>
                    <span className={`tag status-${j.status}`}>{t(`status.${j.status}` as Key)}</span>
                    <span className="small muted">{j.source === 'manual' ? t('jobs.manual') : t('jobs.platform')} · {new Date(j.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h3 className="h3" style={{ marginTop: 8 }}>{j.serviceIds.length ? j.serviceIds.map(svcName).join(', ') : j.title}</h3>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="small muted">{j.price != null ? t('jobs.price') : t('co.estimate')}</div>
                  <div className="h3 num">{j.price != null ? money(j.price) : j.estimateFrom ? range(j.estimateFrom, j.estimateTo) : '—'}</div>
                </div>
              </header>

              <div className="small" style={{ marginTop: 10, color: 'var(--ink-2)' }}>
                <strong>{j.clientName}</strong>
                {j.clientPhone && <> · <a href={`tel:${j.clientPhone}`}>{j.clientPhone}</a></>}
                {(j.district || j.address) && <> · {[j.district && tc(j.district), j.address].filter(Boolean).join(', ')}</>}
                {j.scheduledAt && <> · {new Date(j.scheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</>}
                {' · '}{j.visitType === 'home' ? t('visit.home') : t('visit.workshop')}
              </div>
              {j.description && <p className="small" style={{ marginTop: 8 }}>{j.description}</p>}

              {(j.status === 'in_progress' || j.status === 'done' || j.status === 'accepted') && (
                <div className="job-money">
                  <label className="field"><span className="label">{t('jobs.price')}</span>
                    <input className="input num" type="number" min={0} step={1000} defaultValue={j.price ?? ''}
                      onBlur={(e) => upd(j.id, { price: e.target.value === '' ? null : Number(e.target.value) })} /></label>
                  <label className="field"><span className="label">{t('jobs.parts')}</span>
                    <input className="input num" type="number" min={0} step={1000} defaultValue={j.partsCost || ''}
                      onBlur={(e) => upd(j.id, { partsCost: Number(e.target.value) || 0 })} /></label>
                  <label className="field"><span className="label">{t('jobs.payment')}</span>
                    <select className="select" value={j.paymentMethod ?? ''} onChange={(e) => upd(j.id, { paymentMethod: (e.target.value || null) as PaymentMethod | null })}>
                      <option value="">—</option>
                      {PAY.map((p) => <option key={p} value={p}>{t(`pay.${p}` as Key)}</option>)}
                    </select></label>
                  <label className="row-flex" style={{ alignSelf: 'end', paddingBottom: 12, cursor: 'pointer' }}>
                    <input type="checkbox" className="checkbox" checked={j.paid} onChange={(e) => upd(j.id, { paid: e.target.checked })} />{t('jobs.paid')}
                  </label>
                </div>
              )}

              <div className="job-actions">
                {j.status === 'new' && <>
                  <button className="btn sm" onClick={() => upd(j.id, { status: 'accepted' })}>{t('jobs.accept')}</button>
                  <button className="btn ghost sm" onClick={() => upd(j.id, { status: 'cancelled' })}>{t('jobs.decline')}</button>
                </>}
                {j.status === 'accepted' && <button className="btn sm" onClick={() => upd(j.id, { status: 'in_progress' })}>{t('jobs.start')}</button>}
                {j.status === 'in_progress' && <button className="btn sm" onClick={() => upd(j.id, { status: 'done', price: j.price ?? j.estimateFrom ?? 0 })}>{t('jobs.finish')}</button>}
                {conv && <button className="btn ghost sm" onClick={() => nav(`/messages/${conv.id}`)}><Icon name="chat" size={14} />{t('jobs.chat')}</button>}
                {j.source === 'manual' && <button className="btn ghost sm" onClick={async () => (await getRepo()).deleteJob(j.id)}>{t('jobs.delete')}</button>}
              </div>
            </article>
          );
        })}
      </div>

      <ManualJob open={adding} onClose={() => setAdding(false)} masterId={masterProfileId} />
    </div>
  );
}

/** Form to record an order received outside the platform. */
function ManualJob({ open, onClose, masterId }: { open: boolean; onClose: () => void; masterId: string }) {
  const { t, tc } = usePrefs();
  const { user } = useAuth();
  const { db } = useDatabase();
  const [f, setF] = useState({ clientName: '', clientPhone: '', serviceId: '', title: '', price: '', parts: '', pay: 'cash' as PaymentMethod, done: true, date: new Date().toISOString().slice(0, 10) });
  if (!db) return null;

  async function submit() {
    const svc = db!.services.find((s) => s.id === f.serviceId);
    const when = new Date(f.date + 'T12:00:00').toISOString();
    const job = await (await getRepo()).createJob({
      masterId, masterName: user?.name ?? '', clientId: null, clientName: f.clientName || '—', clientPhone: f.clientPhone || null,
      categoryId: svc?.categoryId ?? null, serviceIds: svc ? [svc.id] : [], title: f.title || svc?.name || '—', description: '',
      district: null, address: '', point: null, scheduledAt: when, visitType: 'home', estimateFrom: 0, estimateTo: null,
      source: 'manual', status: f.done ? 'done' : 'accepted',
      price: f.price ? Number(f.price) : null, partsCost: Number(f.parts) || 0, paymentMethod: f.pay, paid: f.done,
    });
    if (f.done) await (await getRepo()).updateJob(job.id, { completedAt: when });
    setF({ ...f, clientName: '', clientPhone: '', title: '', price: '', parts: '' });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={t('jobs.add')}
      footer={<button className="btn block" onClick={submit}>{t('pro.save')}</button>}>
      <p className="small muted" style={{ marginBottom: 14 }}>{t('jobs.addSub')}</p>
      <div className="form-stack">
        <div className="grid-2">
          <label className="field"><span className="label">{t('jobs.client')}</span>
            <input className="input" value={f.clientName} onChange={(e) => setF({ ...f, clientName: e.target.value })} /></label>
          <label className="field"><span className="label">{t('auth.phone')}</span>
            <input className="input" type="tel" value={f.clientPhone} onChange={(e) => setF({ ...f, clientPhone: e.target.value })} /></label>
        </div>
        <label className="field"><span className="label">{t('co.service')}</span>
          <select className="select" value={f.serviceId} onChange={(e) => setF({ ...f, serviceId: e.target.value })}>
            <option value="">{t('an.other')}</option>
            {db.categories.map((c) => (
              <optgroup key={c.id} label={tc(c.id, c.title)}>
                {db.services.filter((s) => s.categoryId === c.id).map((s) => <option key={s.id} value={s.id}>{tc(s.id, s.name)}</option>)}
              </optgroup>
            ))}
          </select></label>
        {!f.serviceId && <label className="field"><span className="label">{t('jobs.what')}</span>
          <input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>}
        <div className="grid-2">
          <label className="field"><span className="label">{t('jobs.price')}</span>
            <input className="input num" type="number" min={0} step={1000} value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></label>
          <label className="field"><span className="label">{t('jobs.parts')}</span>
            <input className="input num" type="number" min={0} step={1000} value={f.parts} onChange={(e) => setF({ ...f, parts: e.target.value })} /></label>
          <label className="field"><span className="label">{t('jobs.payment')}</span>
            <select className="select" value={f.pay} onChange={(e) => setF({ ...f, pay: e.target.value as PaymentMethod })}>
              {PAY.map((p) => <option key={p} value={p}>{t(`pay.${p}` as Key)}</option>)}
            </select></label>
          <label className="field"><span className="label">{t('co.when')}</span>
            <input className="input" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
        </div>
        <label className="row-flex" style={{ cursor: 'pointer' }}>
          <input type="checkbox" className="checkbox" checked={f.done} onChange={(e) => setF({ ...f, done: e.target.checked })} />{t('status.done')} · {t('jobs.paid')}
        </label>
      </div>
    </Modal>
  );
}
