/**
 * Service search with autocomplete (keyboard friendly). Understands free
 * text too: "кондиционер не холодит" finds the freon refill service.
 */
import { useMemo, useState } from 'react';
import { matchServices } from '../../../shared/matcher.js';
import type { Category, Service } from '../../domain/types';
import { usePrefs } from '../../state/PrefsContext';
import { Icon } from './Icon';

export function ServicePicker({ services, categories, value, onChange }: {
  services: Service[];
  categories: Category[];
  value: Service | null;
  onChange: (s: Service) => void;
}) {
  const { t, tc } = usePrefs();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const label = (s: Service) => tc(s.id, s.name);
  const catName = (id: string) => { const c = categories.find((x) => x.id === id); return c ? tc(c.id, c.title) : ''; };

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return services.slice(0, 12);
    const byText = services.filter((s) => `${label(s)} ${s.name} ${catName(s.categoryId)}`.toLowerCase().includes(query));
    const byAi = matchServices(q, services).map((id) => services.find((s) => s.id === id)!).filter(Boolean);
    return [...new Map([...byAi, ...byText].map((s) => [s.id, s])).values()].slice(0, 12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, services, tc]);

  const pick = (s: Service) => { onChange(s); setQ(''); setOpen(false); };

  return (
    <div className="combo">
      <div style={{ position: 'relative' }}>
        <input
          className="input"
          style={{ paddingLeft: 44 }}
          value={open ? q : value ? label(value) : q}
          placeholder={t('pc.search')}
          onFocus={() => { setOpen(true); setHi(0); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0); }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, list.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
            if (e.key === 'Enter' && list[hi]) { e.preventDefault(); pick(list[hi]); (e.target as HTMLInputElement).blur(); }
          }}
          role="combobox"
          aria-expanded={open}
        />
        <span style={{ position: 'absolute', left: 16, top: 15, color: 'var(--muted)' }}><Icon name="search" size={18} /></span>
      </div>
      {open && list.length > 0 && (
        <div className="combo-list" role="listbox">
          {list.map((s, i) => (
            <button key={s.id} className={i === hi ? 'combo-item on' : 'combo-item'} onMouseDown={() => pick(s)} onMouseEnter={() => setHi(i)}>
              <span>{label(s)}</span>
              <span className="muted small">{catName(s.categoryId)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
