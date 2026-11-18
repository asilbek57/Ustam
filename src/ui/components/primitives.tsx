/**
 * Small reusable UI primitives: Modal, Avatar, PriceRange,
 * Skeleton, VisitToggle, Stepper.
 */
import { useEffect, type ReactNode } from 'react';
import { usePrefs } from '../../state/PrefsContext';
import type { VisitType } from '../../domain/types';
import { OPEN_RANGE_FACTOR } from '../../domain/pricing';
import { Icon } from './Icon';

/** Centered modal on desktop, bottom sheet on phones. Esc closes. */
export function Modal({ open, onClose, title, children, footer }: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // lock page scroll under the modal
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn modal-x" onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>
        {title && <h2 className="modal-title">{title}</h2>}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/** Photo avatar (registered masters) or monogram. */
export function Avatar({ name, size = 44, photo }: { name: string; size?: number; photo?: string | null }) {
  if (photo) return <img className="photo-avatar" src={photo} alt={name} width={size} height={size} style={{ width: size, height: size }} />;
  // first letters of real words only (skip dashes, quotes, brackets)
  const initials = name.split(/\s+/).filter((w) => /^\p{L}/u.test(w)).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.34 }}>{initials}</span>;
}

/** Small floating confirmation message. */
export function Toast({ text }: { text: string | null }) {
  return text ? <div className="toast" role="status">{text}</div> : null;
}

/**
 * Market range bar from the source: priceFrom ─── priceTo,
 * with an optional marker for a specific price (a quote or a master's price).
 * For "от X" (no upper bound) the bar extends to 2×X, drawn as open-ended.
 */
export function PriceRange({ from, to, mark }: { from: number; to: number | null; mark?: number }) {
  const { t, money } = usePrefs();
  const hi = to ?? from * OPEN_RANGE_FACTOR;
  const lo = Math.min(from, mark ?? from) * 0.85;
  const top = Math.max(hi, mark ?? hi) * 1.08;
  const span = Math.max(1, top - lo);
  const pos = (v: number) => `${Math.min(100, Math.max(0, ((v - lo) / span) * 100))}%`;
  return (
    <div className="range">
      <div className="range-track">
        <span className={to == null ? 'range-fair open' : 'range-fair'} style={{ left: pos(from), width: `calc(${pos(hi)} - ${pos(from)})` }} />
        {mark !== undefined && <span className="range-mark" style={{ left: pos(mark) }} />}
      </div>
      <div className="range-labels">
        <span><small>{t('stat.min')}</small><b>{from === 0 ? t('price.free').split(' (')[0] : money(from)}</b></span>
        <span className="r"><small>{t('stat.max')}</small><b>{to == null ? '—' : money(to)}</b></span>
      </div>
    </div>
  );
}

export function Skeleton({ h = 120, style }: { h?: number; style?: React.CSSProperties }) {
  return <div className="skel" style={{ height: h, ...style }} />;
}

/** Visit type: home visit vs bringing the item to the workshop. */
export function VisitToggle({ value, onChange }: { value: VisitType; onChange: (v: VisitType) => void }) {
  const { t } = usePrefs();
  return (
    <div className="seg" role="tablist">
      <button role="tab" aria-selected={value === 'home'} className={value === 'home' ? 'on' : ''} onClick={() => onChange('home')}>
        <strong><Icon name="home" size={16} />{t('visit.home')}</strong>
        <small>{t('visit.homeSub')}</small>
      </button>
      <button role="tab" aria-selected={value === 'workshop'} className={value === 'workshop' ? 'on' : ''} onClick={() => onChange('workshop')}>
        <strong><Icon name="workshop" size={16} />{t('visit.workshop')}</strong>
        <small>{t('visit.workshopSub')}</small>
      </button>
    </div>
  );
}

/** Booking progress: Problem → When & where → Master → Contact. */
export function Stepper({ current }: { current: 1 | 2 | 3 | 4 }) {
  const { t } = usePrefs();
  const steps = [t('step.task'), t('step.when'), t('step.master'), t('step.contact')];
  return (
    <div className="stepper" aria-label="progress">
      {steps.map((s, i) => (
        <span key={s} className={i + 1 === current ? 'on' : i + 1 < current ? 'done' : ''}>
          <i>{i + 1 < current ? <Icon name="check" size={12} stroke={2.2} /> : i + 1}</i>
          {s}
        </span>
      ))}
    </div>
  );
}
