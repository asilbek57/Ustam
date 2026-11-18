/**
 * Master profile editor: photo, name, headline, bio, type, experience,
 * arrival time, phone, Telegram, services with own prices (market range
 * from OLX shown for reference), districts, map point, workshop, publish.
 */
import { useEffect, useMemo, useState } from 'react';
import { getRepo } from '../../../data';
import { EMPTY_PROFILE, normalizeTelegram, profileProblems } from '../../../domain/masters';
import type { MasterProfileInput } from '../../../domain/types';
import type { Key } from '../../../i18n/dictionary';
import { useDatabase } from '../../../hooks/useDatabase';
import { useAuth } from '../../../state/AuthContext';
import { usePrefs } from '../../../state/PrefsContext';
import { Icon } from '../../components/Icon';
import { MapPicker, MapView } from '../../components/MapView';
import { Avatar, Skeleton, Toast } from '../../components/primitives';
import { Reveal } from '../../components/Motion';

const RESPONSE = ['30 минут', '1 час', '1–2 часа', 'день обращения'];

export function ProProfile() {
  const { t, tc, range } = usePrefs();
  const { user, refresh } = useAuth();
  const { db } = useDatabase();
  const [p, setP] = useState<MasterProfileInput | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    getRepo().then((r) => r.getMyMasterProfile()).then((mine) => {
      setP(mine?.input ?? { ...EMPTY_PROFILE, name: user?.name ?? '', phone: user?.phone ?? '', telegram: user?.telegram ?? null });
    });
  }, [user]);

  const problems = useMemo(() => (p ? profileProblems(p) : []), [p]);
  if (!p || !db) return <Skeleton h={500} />;

  const set = (patch: Partial<MasterProfileInput>) => setP({ ...p, ...patch });
  const toggleService = (id: string) => {
    const on = p.serviceIds.includes(id);
    set({ serviceIds: on ? p.serviceIds.filter((x) => x !== id) : [...p.serviceIds, id], prices: on ? p.prices.filter((x) => x.serviceId !== id) : p.prices });
  };
  const setPrice = (serviceId: string, key: 'priceFrom' | 'priceTo', v: string) => {
    const n = v === '' ? null : Math.max(0, Number(v));
    const cur = p.prices.find((x) => x.serviceId === serviceId) ?? { serviceId, priceFrom: 0, priceTo: null };
    const next = { ...cur, [key]: key === 'priceFrom' ? n ?? 0 : n };
    set({ prices: [...p.prices.filter((x) => x.serviceId !== serviceId), next] });
  };
  const toggleDistrict = (d: string) => set({ districts: p.districts.includes(d) ? p.districts.filter((x) => x !== d) : [...p.districts, d] });

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    set({ photo: await (await getRepo()).uploadPhoto(f) });
  }

  async function save(publish?: boolean) {
    setTried(true);
    const next = { ...p!, telegram: normalizeTelegram(p!.telegram), published: publish ?? p!.published };
    if (next.published && profileProblems(next).length) { setP(next); return; }
    setSaving(true);
    await (await getRepo()).saveMyMasterProfile(next);
    setP(next);
    await refresh();
    setSaving(false);
    setToast(t('pro.saved'));
    setTimeout(() => setToast(null), 1800);
  }

  return (
    <div className="split">
      <div className="stack-lg">
        {!p.published && <div className="notice" style={{ marginTop: 0 }}>{t('pro.welcome')}</div>}

        <Reveal as="section" className="panel form-stack">
          <div className="photo-drop">
            <Avatar name={p.name || '?'} photo={p.photo} size={88} />
            <label className="btn ghost sm" style={{ cursor: 'pointer' }}>
              <Icon name="plus" size={14} />{t('pro.photoBtn')}
              <input type="file" accept="image/*" hidden onChange={onPhoto} />
            </label>
          </div>
          <div className="grid-2">
            <label className="field"><span className="label">{t('auth.name')}</span>
              <input className="input" value={p.name} onChange={(e) => set({ name: e.target.value })} /></label>
            <label className="field"><span className="label">{t('pro.type')}</span>
              <div className="seg">
                {(['private', 'center'] as const).map((k) => (
                  <button key={k} type="button" className={p.type === k ? 'on' : ''} onClick={() => set({ type: k })}>
                    <strong>{k === 'private' ? t('m.private') : t('m.center')}</strong>
                  </button>
                ))}
              </div>
            </label>
          </div>
          <label className="field"><span className="label">{t('pro.headline')}</span>
            <input className="input" value={p.title} placeholder={t('pro.headlinePh')} onChange={(e) => set({ title: e.target.value })} /></label>
          <label className="field"><span className="label">{t('pro.bio')}</span>
            <textarea className="textarea" rows={4} value={p.bio} placeholder={t('pro.bioPh')} onChange={(e) => set({ bio: e.target.value })} /></label>
          <div className="grid-2">
            <label className="field"><span className="label">{t('pro.experience')}</span>
              <input className="input" type="number" min={0} max={60} value={p.experienceYears} onChange={(e) => set({ experienceYears: Number(e.target.value) })} /></label>
            <label className="field"><span className="label">{t('pro.response')}</span>
              <select className="select" value={p.responseTime} onChange={(e) => set({ responseTime: e.target.value })}>
                {RESPONSE.map((r) => <option key={r} value={r}>{r}</option>)}
              </select></label>
            <label className="field"><span className="label">{t('auth.phone')}</span>
              <input className="input" type="tel" value={p.phone} onChange={(e) => set({ phone: e.target.value })} /></label>
            <label className="field"><span className="label">{t('pro.telegram')}</span>
              <input className="input" placeholder="@username" value={p.telegram ?? ''} onChange={(e) => set({ telegram: e.target.value })} /></label>
          </div>
        </Reveal>

        <Reveal as="section" className="panel">
          <h2 className="h2">{t('pro.services')}</h2>
          <p className="small muted" style={{ margin: '6px 0 10px' }}>{t('pro.servicesSub')}</p>
          {db.categories.map((c) => (
            <details key={c.id} open={db.services.some((s) => s.categoryId === c.id && p.serviceIds.includes(s.id))} style={{ marginTop: 10 }}>
              <summary className="row-flex" style={{ cursor: 'pointer', padding: '10px 0', fontWeight: 600 }}>
                <Icon name={c.id} size={18} />{tc(c.id, c.title)}
                <span className="small muted" style={{ fontWeight: 400 }}>{db.services.filter((s) => s.categoryId === c.id && p.serviceIds.includes(s.id)).length || ''}</span>
              </summary>
              {db.services.filter((s) => s.categoryId === c.id).map((s) => {
                const on = p.serviceIds.includes(s.id);
                const pr = p.prices.find((x) => x.serviceId === s.id);
                return (
                  <div key={s.id} className="svc-check">
                    <input type="checkbox" className="checkbox" checked={on} onChange={() => toggleService(s.id)} aria-label={s.name} />
                    <span>{tc(s.id, s.name)}<span className="muted" style={{ display: 'block' }}>{t('m.priceMarket')}: {range(s.priceFrom, s.priceTo)}</span></span>
                    {on && (
                      <span className="prices" style={{ display: 'contents' }}>
                        <input className="input num" type="number" min={0} step={1000} placeholder={t('pro.priceFrom')} value={pr?.priceFrom ?? ''} onChange={(e) => setPrice(s.id, 'priceFrom', e.target.value)} />
                        <input className="input num" type="number" min={0} step={1000} placeholder={t('pro.priceTo')} value={pr?.priceTo ?? ''} onChange={(e) => setPrice(s.id, 'priceTo', e.target.value)} />
                      </span>
                    )}
                  </div>
                );
              })}
            </details>
          ))}
        </Reveal>

        <Reveal as="section" className="panel">
          <h2 className="h2">{t('pro.area')}</h2>
          <p className="small muted" style={{ margin: '6px 0 14px' }}>{t('pro.areaSub')}</p>
          <div className="chips">
            <button type="button" className={p.districts.length === db.districts.length ? 'chip on' : 'chip'}
              onClick={() => set({ districts: p.districts.length === db.districts.length ? [] : [...db.districts] })}>{t('pro.allDistricts')}</button>
            {db.districts.map((d) => (
              <button type="button" key={d} className={p.districts.includes(d) ? 'chip on' : 'chip'} onClick={() => toggleDistrict(d)}>{tc(d)}</button>
            ))}
          </div>
          <div className="label" style={{ marginTop: 20 }}>{t('pro.point')}</div>
          <div onClick={() => setMapOpen(true)} style={{ cursor: 'pointer' }}>
            <MapView you={p.point} height={220} />
          </div>
          <p className="small muted" style={{ marginTop: 8 }}>{p.point?.label ? t('map.near', { d: tc(p.point.label) }) : t('map.notSet')} · <button type="button" className="link" onClick={() => setMapOpen(true)}>{t('map.pick')}</button></p>
          {p.type === 'center' && (
            <label className="field" style={{ marginTop: 14 }}><span className="label">{t('pro.workshop')}</span>
              <input className="input" value={p.workshopAddress ?? ''} onChange={(e) => set({ workshopAddress: e.target.value || null })} /></label>
          )}
        </Reveal>
      </div>

      <aside className="sticky stack">
        <section className="panel stack">
          <span className={p.published ? 'tag good' : 'tag'} style={{ alignSelf: 'flex-start' }}>{p.published ? t('pro.live') : t('pro.draft')}</span>
          <label className="row-flex" style={{ cursor: 'pointer' }}>
            <input type="checkbox" className="checkbox" checked={p.published} onChange={(e) => set({ published: e.target.checked })} />
            {t('pro.publish')}
          </label>
          {tried && p.published && problems.length > 0 && (
            <ul className="error" style={{ margin: 0, paddingLeft: 18 }}>{problems.map((k) => <li key={k}>{t(k as Key)}</li>)}</ul>
          )}
          <button className="btn lg block" onClick={() => save()} disabled={saving}>{t('pro.save')}</button>
        </section>
      </aside>

      <MapPicker open={mapOpen} title={t('map.pickMaster')} value={p.point} onClose={() => setMapOpen(false)}
        onSave={(pt) => { set({ point: pt, districts: p.districts.length ? p.districts : pt.label ? [pt.label] : [] }); setMapOpen(false); }} />
      <Toast text={toast} />
    </div>
  );
}
