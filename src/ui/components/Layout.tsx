/**
 * Site chrome: header (logo · nav · district · language · theme),
 * phone tab bar, and footer with the data source.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { BRAND } from '../../config/brand';
import { dataMode } from '../../data';
import { useDatabase } from '../../hooks/useDatabase';
import { LANGS } from '../../i18n/dictionary';
import { usePrefs } from '../../state/PrefsContext';
import { useAuth } from '../../state/AuthContext';
import { Icon } from './Icon';

/** Wordmark: "True" + gold "Sty" */
export function Logo() {
  const [a, b] = BRAND.wordmark;
  return <span className="logo">{a}<i>{b}</i></span>;
}

/** Tashkent district picker (native <select> for accessibility). */
export function DistrictPicker({ compact }: { compact?: boolean }) {
  const { district, setDistrict, tc, t } = usePrefs();
  const { db } = useDatabase();
  return (
    <label className="pill-select" title={t('district.label')}>
      <Icon name="pin" size={15} />
      {!compact && <span className="pill-text">{district ? tc(district) : t('district.any')}</span>}
      <select value={district} onChange={(e) => setDistrict(e.target.value)} aria-label={t('district.label')}>
        <option value="">{t('district.any')}</option>
        {db?.districts.map((d) => <option key={d} value={d}>{tc(d)}</option>)}
      </select>
    </label>
  );
}

export function LangSwitch() {
  const { lang, setLang } = usePrefs();
  return (
    <div className="seg mini" role="group" aria-label="Language">
      {LANGS.map((l) => (
        <button key={l} className={lang === l ? 'on' : ''} onClick={() => setLang(l)}>{l.toUpperCase()}</button>
      ))}
    </div>
  );
}

/** Signed-in user: chip with menu (cabinet, requests, messages, sign out). */
function UserMenu() {
  const { user, unread, signOut } = useAuth();
  const { t } = usePrefs();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  if (!user) return <Link to="/auth" className="btn sm">{t('nav.signIn')}</Link>;
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="user-chip" onClick={() => setOpen(!open)} aria-haspopup="menu">
        <span className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{user.name.slice(0, 1).toUpperCase()}</span>
        <span className="small hide-sm" style={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</span>
        {unread > 0 && <span className="dot-badge">{unread}</span>}
      </button>
      {open && (
        <div className="user-menu" role="menu" onClick={() => setOpen(false)}>
          {user.role === 'master' && <Link to="/pro"><Icon name="user" size={16} />{t('nav.pro')}</Link>}
          <Link to="/messages"><Icon name="chat" size={16} />{t('nav.messages')}{unread > 0 && <span className="tag gold" style={{ marginLeft: 'auto' }}>{unread}</span>}</Link>
          {user.role === 'client' && <Link to="/requests"><Icon name="list" size={16} />{t('nav.requests')}</Link>}
          <button onClick={async () => { await signOut(); navigate('/'); }}><Icon name="back" size={16} />{t('nav.signOut')}</button>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const { t, theme, setTheme } = usePrefs();
  const cls = ({ isActive }: { isActive: boolean }) => (isActive ? 'active' : '');
  return (
    <header className="header">
      <div className="container header-in">
        <Link to="/" aria-label={BRAND.name}><Logo /></Link>
        <nav className="nav">
          <NavLink to="/services" className={cls}>{t('nav.services')}</NavLink>
          <NavLink to="/masters" className={cls}>{t('nav.masters')}</NavLink>
          <NavLink to="/check" className={cls}>{t('nav.check')}</NavLink>
          <NavLink to="/pro" className={cls}>{t('nav.forMasters')}</NavLink>
        </nav>
        <div className="header-tools">
          <DistrictPicker />
          <span className="hide-sm"><LangSwitch /></span>
          <button className="icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={t('theme.toggle')} title={t('theme.toggle')}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
          </button>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

/** Phone-only bottom navigation. */
export function TabBar() {
  const { t } = usePrefs();
  const { user, unread } = useAuth();
  const cls = ({ isActive }: { isActive: boolean }) => (isActive ? 'active' : '');
  const me = !user ? '/auth' : user.role === 'master' ? '/pro' : '/requests';
  return (
    <nav className="tabbar">
      <NavLink to="/" end className={cls}><Icon name="home" />{t('nav.home')}</NavLink>
      <NavLink to="/masters" className={cls}><Icon name="search" />{t('nav.masters')}</NavLink>
      <NavLink to="/messages" className={cls} style={{ position: 'relative' }}>
        <Icon name="chat" />{t('nav.messages')}{unread > 0 && <span className="dot-badge" style={{ right: 18 }}>{unread}</span>}
      </NavLink>
      <NavLink to={me} className={cls}><Icon name="user" />{user ? (user.role === 'master' ? t('pro.title').split(' ')[0] : t('nav.requests')) : t('nav.signIn')}</NavLink>
    </nav>
  );
}

export function Footer() {
  const { t } = usePrefs();
  const { db } = useDatabase();
  return (
    <footer className="footer">
      <div className="container footer-in">
        <div className="stack" style={{ gap: 8 }}>
          <Logo />
          <span className="muted small">{t('brand.tagline')}</span>
        </div>
        <div className="row-flex small muted" style={{ flexWrap: 'wrap', gap: 20 }}>
          <Link to="/services" className="link">{t('nav.services')}</Link>
          <Link to="/masters" className="link">{t('nav.masters')}</Link>
          <Link to="/check" className="link">{t('nav.check')}</Link>
          <Link to="/sources" className="link">{t('nav.sources')}</Link>
          <span className="mobile-only"><LangSwitch /></span>
        </div>
        <div className="small muted row-flex">
          <span className="data-dot" />
          {dataMode === 'local' ? t('data.local') : t('data.live')}
          {db && <> · {t('data.updated', { d: db.meta.updatedAt })}</>}
        </div>
      </div>
      {db && <div className="container small muted" style={{ marginTop: 20, maxWidth: 1180 }}>{db.meta.disclaimer}</div>}
    </footer>
  );
}
