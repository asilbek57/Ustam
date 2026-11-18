/**
 * Cards built on real data: category tiles, master card, AI recommendation,
 * contact buttons.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChatDrawer } from './ChatThread';
import { useAuth } from '../../state/AuthContext';
import type { RankedMaster } from '../../domain/recommendation';
import { priceOf } from '../../domain/pricing';
import type { Category, Master, Service } from '../../domain/types';
import { whyText } from '../../services/aiAdvisor';
import { usePrefs } from '../../state/PrefsContext';
import { Icon } from './Icon';
import { Avatar } from './primitives';

/** Category grid (hairline tiles, serif names, line icons). */
export function CategoryTiles({ categories, services }: { categories: Category[]; services: Service[] }) {
  const { tc, t, money } = usePrefs();
  return (
    <div className="cats">
      {categories.map((c) => {
        const list = services.filter((s) => s.categoryId === c.id);
        const minPaid = Math.min(...list.map((s) => s.priceFrom).filter((p) => p > 0));
        return (
          <Link key={c.id} to={`/c/${c.id}`} className="cat">
            <Icon name={c.id} size={44} stroke={1.25} className="cat-icon" />
            <div>
              <div className="cat-name">{tc(c.id, c.title)}</div>
              <div className="cat-meta" style={{ marginTop: 8 }}>
                <span>{t('home.nServices', { n: list.length })} · {t('price.from', { a: money(minPaid) })}</span>
                <span className="go"><Icon name="arrow" size={18} /></span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

/**
 * Contact buttons for a master: "Message" (opens the chat right on the page)
 * and the phone. No links out to OLX — everything stays on Ustam.
 */
export function ContactButtons({ m, size = 'sm' }: { m: Master; size?: 'sm' | 'lg' }) {
  const { t } = usePrefs();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const cls = size === 'lg' ? 'btn lg' : 'btn sm';
  const own = !!user && user.id === m.userId;

  return (
    <div className="row-flex" style={{ flexWrap: 'wrap', gap: 8 }}>
      {!own && (
        <button className={cls} onClick={() => setOpen(true)}><Icon name="chat" size={16} />{t('msg.write')}</button>
      )}
      {m.phone && (
        <a className={`${cls} ghost`} href={`tel:${m.phone}`}><Icon name="phone" size={16} />{m.phoneDisplay}</a>
      )}
      {m.telegram && (
        <a className={`${cls} ghost`} href={`https://t.me/${m.telegram.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer"><Icon name="send" size={14} />Telegram</a>
      )}
      <ChatDrawer master={m} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

/** Experience label: "5+" from OLX stays as is, a registered master's "7" → "7 лет". */
export function useExp() {
  const { t } = usePrefs();
  return (label: string | null | undefined) => (!label ? null : /^\d+$/.test(label) ? t('m.yearsShort', { e: label, n: Number(label) }) : label);
}

/** Districts summary: "All districts of Tashkent" / list. */
export function DistrictsText({ districts }: { districts: string[] }) {
  const { t, tc } = usePrefs();
  if (districts.length >= 13) return <>{t('district.all')}</>;
  return <>{districts.map((d) => tc(d)).join(', ')}</>;
}

/** One ranked master: facts from the listing, stated prices vs market, AI score. */
export function MasterCard({ r, services, onSelect, selectLabel }: {
  r: RankedMaster;
  services: Service[];
  onSelect?: () => void;
  selectLabel?: string;
}) {
  const { t, tc, money, range } = usePrefs();
  const exp = useExp();
  const m = r.master;
  const best = r.badges.includes('aiPick');
  const shown = (r.covered.length ? r.covered : m.serviceIds).slice(0, 4);

  return (
    <article className={best ? 'master best' : 'master'}>
      <div className="master-top">
        <Avatar name={m.name} photo={m.photo} />
        <div style={{ minWidth: 0 }}>
          <Link to={`/master/${m.id}`} className="master-name">
            {m.name}
            {m.verified && <span className="verified" title={t('m.verified')}><Icon name="shield" size={15} /></span>}
          </Link>
          <div className="master-meta">
            <span className={m.registered ? 'tag gold' : 'tag'} style={{ padding: '2px 8px' }}>{m.registered ? t('m.onUstam') : t('m.fromOlx')}</span>
            <span>{m.type === 'center' ? t('m.center') : t('m.private')}</span>
            {m.responseTime && <span className="row-flex" style={{ gap: 4 }}><Icon name="clock" size={13} />{m.responseTime}</span>}
            {m.experienceLabel && <span>{t('m.experience').toLowerCase()} {exp(m.experienceLabel)}</span>}
          </div>
          <div className="master-meta"><Icon name="pin" size={13} /><DistrictsText districts={m.districts} /></div>
        </div>
        <div className="score" title={t('m.aiScore')}>
          <b>{Math.round(r.score * 100)}</b>
          <small>{t('m.aiScore')}</small>
        </div>
      </div>

      {r.badges.length > 0 && (
        <div className="chips">
          {r.badges.map((b) => (
            <span key={b} className={b === 'aiPick' ? 'tag gold' : b === 'verified' || b === 'bestPrice' ? 'tag good' : 'tag'}>
              {b === 'aiPick' && <Icon name="spark" size={12} />}{t(`badge.${b}`)}
            </span>
          ))}
        </div>
      )}

      <div className="svc-mini">
        {shown.map((id) => {
          const s = services.find((x) => x.id === id);
          if (!s) return null;
          const p = priceOf(m.prices, id);
          return (
            <div key={id} className="svc-mini-row">
              <span>{tc(s.id, s.name)}</span>
              <span className="svc-mini-price">
                {p ? <b className="num">{range(p.priceFrom, p.priceTo)}</b> : <span className="muted num">{range(s.priceFrom, s.priceTo)}</span>}
                <small>{p ? t('m.priceStated') : t('m.priceMarket')}</small>
              </span>
            </div>
          );
        })}
      </div>

      <div className="master-bottom">
        {r.knownTotal != null ? <div className="price-big">{money(r.knownTotal)}</div> : <span />}
        <div className="row-flex" style={{ gap: 8 }}>
          {m.phone && <a className="btn ghost sm" href={`tel:${m.phone}`} aria-label={t('m.call')}><Icon name="phone" size={15} /></a>}
          {onSelect && <button className={best ? 'btn sm' : 'btn ghost sm'} onClick={onSelect}>{selectLabel}</button>}
        </div>
      </div>
    </article>
  );
}

/** "AI recommends" card for a task: best real master + reasons. */
export function RecommendationCard({ r, selected, onChoose }: { r: RankedMaster; selected: number; onChoose?: () => void }) {
  const { t, money } = usePrefs();
  const m = r.master;
  return (
    <div className="ai-card">
      <div className="eyebrow"><Icon name="spark" size={13} />{t('ai.recommends')}</div>
      <div className="ai-card-title">{m.name}</div>
      <p className="small" style={{ color: 'var(--ink-2)' }}>{whyText(t, money, r, selected)}</p>
      <div className="row-flex" style={{ marginTop: 14, flexWrap: 'wrap', gap: 8 }}>
        {onChoose && <button className="btn sm" onClick={onChoose}>{t('m.choose')} <Icon name="arrow" size={14} /></button>}
        <Link to={`/master/${m.id}`} className="btn ghost sm">{t('m.profile')}</Link>
        {m.phone && <a className="btn ghost sm" href={`tel:${m.phone}`}><Icon name="phone" size={14} />{m.phoneDisplay}</a>}
      </div>
    </div>
  );
}
