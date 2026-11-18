/**
 * Booking dialogs: date & time, address, and service details
 * (what's included, warranty, unit, market range, sources).
 */
import { useEffect, useState } from 'react';
import type { Schedule } from '../../state/BookingContext';
import type { Service, VisitType } from '../../domain/types';
import { usePrefs } from '../../state/PrefsContext';
import { Modal, PriceRange } from './primitives';
import { Icon } from './Icon';

const HOURS = Array.from({ length: 14 }, (_, i) => 8 + i); // 08:00–21:00
const MINUTES = [0, 15, 30, 45];
export const LOCALE = { en: 'en-GB', ru: 'ru-RU', uz: 'uz-Latn-UZ' } as const;

/** First bookable slot: next quarter hour, at least one hour from now. */
function firstSlot(): Schedule {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  let minute = Math.ceil(d.getMinutes() / 15) * 15;
  let hour = d.getHours();
  if (minute === 60) { minute = 0; hour += 1; }
  if (hour < 8) return { dayOffset: 0, hour: 8, minute: 0 };
  if (hour > 21) return { dayOffset: 1, hour: 8, minute: 0 };
  return { dayOffset: 0, hour, minute };
}

export function DateTimeModal({ open, initial, visitType, onClose, onConfirm }: {
  open: boolean;
  initial: Schedule | null;
  visitType: VisitType;
  onClose: () => void;
  onConfirm: (s: Schedule) => void;
}) {
  const { t, lang } = usePrefs();
  const [s, setS] = useState<Schedule>(initial ?? firstSlot());
  useEffect(() => { if (open) setS(initial ?? firstSlot()); }, [open, initial]);
  const min = firstSlot();

  const dayLabel = (o: number) => {
    if (o === 0) return t('dt.today');
    if (o === 1) return t('dt.tomorrow');
    const d = new Date();
    d.setDate(d.getDate() + o);
    return d.toLocaleDateString(LOCALE[lang], { weekday: 'short', day: 'numeric', month: 'short' });
  };
  const hourDisabled = (h: number) => s.dayOffset === 0 && min.dayOffset === 0 && h < min.hour;
  const days = Array.from({ length: 7 }, (_, i) => i).filter((d) => !(d === 0 && min.dayOffset === 1));
  const hhmm = `${String(s.hour).padStart(2, '0')}:${String(s.minute).padStart(2, '0')}`;

  return (
    <Modal open={open} onClose={onClose} title={visitType === 'home' ? t('dt.titleHome') : t('dt.titleWorkshop')}
      footer={<button className="btn lg" onClick={() => onConfirm(s)}>{t('common.next')}</button>}>
      <div className="wheel">
        <div className="wheel-col">
          {days.map((d) => (
            <button key={d} className={s.dayOffset === d ? 'on' : ''}
              onClick={() => setS({ ...s, dayOffset: d, ...(d === 0 && s.hour < min.hour ? { hour: min.hour } : {}) })}>
              {dayLabel(d)}
            </button>
          ))}
        </div>
        <div className="wheel-col">
          {HOURS.map((h) => (
            <button key={h} disabled={hourDisabled(h)} className={s.hour === h ? 'on' : ''} onClick={() => setS({ ...s, hour: h })}>{String(h).padStart(2, '0')}</button>
          ))}
        </div>
        <div className="wheel-col">
          {MINUTES.map((m) => (
            <button key={m} className={s.minute === m ? 'on' : ''} onClick={() => setS({ ...s, minute: m })}>{String(m).padStart(2, '0')}</button>
          ))}
        </div>
      </div>
      <p className="row-flex small muted" style={{ marginTop: 16 }}>
        <Icon name="clock" size={16} />
        {visitType === 'home' ? t('dt.hintHome', { t: hhmm }) : t('dt.hintWorkshop', { t: hhmm })}
      </p>
    </Modal>
  );
}

export function AddressModal({ open, value, onClose, onSave }: { open: boolean; value: string; onClose: () => void; onSave: (a: string) => void }) {
  const { t } = usePrefs();
  const [text, setText] = useState(value);
  useEffect(() => { if (open) setText(value); }, [open, value]);
  return (
    <Modal open={open} onClose={onClose} title={t('cat.address')}
      footer={<button className="btn lg" disabled={!text.trim()} onClick={() => onSave(text.trim())}>{t('common.save')}</button>}>
      <input className="input" autoFocus value={text} placeholder={t('addr.placeholder')}
        onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && text.trim() && onSave(text.trim())} />
    </Modal>
  );
}

/** Service details exactly as in the source + add/remove. */
export function ServiceModal({ service, selected, mastersCount, onClose, onToggle }: {
  service: Service | null;
  selected: boolean;
  mastersCount: number;
  onClose: () => void;
  onToggle: () => void;
}) {
  const { t, tc, unit } = usePrefs();
  if (!service) return null;
  const s = service;
  return (
    <Modal open onClose={onClose} title={tc(s.id, s.name)}
      footer={<button className={selected ? 'btn ghost lg' : 'btn lg'} onClick={onToggle}>{selected ? t('common.remove') : t('common.add')}</button>}>
      <div className="row-flex small muted" style={{ flexWrap: 'wrap', gap: 10 }}>
        {unit(s.unit) && <span className="tag">{unit(s.unit)}</span>}
        {s.warranty && s.warranty !== '—' && <span className="tag good">{t('cat.warranty', { w: tc(s.warranty, s.warranty) })}</span>}
        <span>{t('svc.masters', { n: mastersCount })}</span>
      </div>
      <div style={{ margin: '24px 0' }}><PriceRange from={s.priceFrom} to={s.priceTo} /></div>
      <div className="label">{t('svc.description')}</div>
      <p style={{ color: 'var(--ink-2)' }}>{s.description}</p>
      <div className="label" style={{ marginTop: 18 }}>{t('svc.source')}</div>
      <p className="small muted">{s.source.note}</p>
      <div className="row-flex small" style={{ marginTop: 8, gap: 16, flexWrap: 'wrap' }}>
        {s.source.olx && <a className="link" href={s.source.olx} target="_blank" rel="noopener noreferrer">{t('svc.olx')} ↗</a>}
        {s.source.web && <a className="link" href={s.source.web} target="_blank" rel="noopener noreferrer">{t('svc.web')} ↗</a>}
      </div>
    </Modal>
  );
}
