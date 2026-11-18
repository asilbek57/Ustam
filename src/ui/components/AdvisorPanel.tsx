/**
 * AI advisor: explanation + sorting and filters for real masters
 * (AI best match / lowest stated price / fastest / most experienced,
 * master type, verified phone only).
 */
import { STRATEGIES, type MasterTypeFilter, type Strategy } from '../../domain/recommendation';
import { usePrefs } from '../../state/PrefsContext';
import { Icon } from './Icon';

export interface AdvisorFilters {
  strategy: Strategy;
  type: MasterTypeFilter;
  onlyVerified: boolean;
}

export function AdvisorPanel({ filters, onChange, explanation }: {
  filters: AdvisorFilters;
  onChange: (f: AdvisorFilters) => void;
  explanation: string;
}) {
  const { t } = usePrefs();
  const set = (p: Partial<AdvisorFilters>) => onChange({ ...filters, ...p });

  return (
    <section className="panel">
      <div className="eyebrow gold-text row-flex" style={{ gap: 6 }}><Icon name="spark" size={14} />{t('adv.title')}</div>
      <p className="advisor-text" style={{ marginTop: 12 }}>{explanation}</p>

      <div className="filter-label">{t('adv.sort')}</div>
      <div className="chips">
        {STRATEGIES.map((s) => (
          <button key={s} className={filters.strategy === s ? 'chip on' : 'chip'} onClick={() => set({ strategy: s })}>
            {s === 'ai_best' && <Icon name="spark" size={13} />}{t(`strat.${s}`)}
          </button>
        ))}
      </div>

      <div className="filter-label">{t('adv.type')}</div>
      <div className="chips">
        {(['any', 'private', 'center'] as const).map((k) => (
          <button key={k} className={filters.type === k ? 'chip on' : 'chip'} onClick={() => set({ type: k })}>
            {k === 'any' ? t('common.any') : k === 'private' ? t('m.private') : t('m.center')}
          </button>
        ))}
      </div>
      <div className="chips" style={{ marginTop: 8 }}>
        <button className={filters.onlyVerified ? 'chip on' : 'chip'} onClick={() => set({ onlyVerified: !filters.onlyVerified })}>
          <Icon name="shield" size={13} />{t('adv.verified')}
        </button>
      </div>
      <p className="small muted" style={{ marginTop: 16 }}>{t('m.noRating')}</p>
    </section>
  );
}
