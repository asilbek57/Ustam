/**
 * Home: one clear action (describe the problem → AI finds the service),
 * real numbers from the database, categories, how it works, the verified
 * masters (confirmed phones), price check and sources.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDatabase } from '../../hooks/useDatabase';
import { matchTask } from '../../services/aiAdvisor';
import { usePrefs } from '../../state/PrefsContext';
import { Icon } from '../components/Icon';
import { CategoryTiles, ContactButtons, DistrictsText, useExp } from '../components/Cards';
import { Avatar, Skeleton } from '../components/primitives';
import { CountUp, Reveal, SplitLines, Stagger } from '../components/Motion';
import { useAuth } from '../../state/AuthContext';

export function HomePage() {
  const { t, tc } = usePrefs();
  const { db } = useDatabase();
  const exp = useExp();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [noMatch, setNoMatch] = useState(false);
  const { user } = useAuth();

  /** Free text → matching services → that category's request page, pre-filled. */
  function search(text: string) {
    if (!db) return;
    const ids = matchTask(text, db.services);
    if (!ids.length) return setNoMatch(true);
    const cat = db.services.find((s) => s.id === ids[0])!.categoryId;
    const same = ids.filter((id) => db.services.find((s) => s.id === id)?.categoryId === cat);
    navigate(`/c/${cat}?svc=${same.join(',')}&q=${encodeURIComponent(text)}`);
  }

  const verified = db?.masters.filter((m) => m.verified) ?? [];
  const onUstam = db?.masters.filter((m) => m.registered) ?? [];

  return (
    <div className="container">
      <section className="hero">
        <div className="hero-orb" aria-hidden />
        <div>
          <div className="eyebrow reveal in">{t('brand.tagline')}</div>
          <h1 className="display" style={{ marginTop: 18 }}><SplitLines lines={[t('home.title1'), t('home.title2')]} /></h1>
          <p className="lead">{t('home.sub')}</p>

          <form className="hero-search" onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) search(q); else (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus();
          }}>
            <input value={q} onChange={(e) => { setQ(e.target.value); setNoMatch(false); }} placeholder={t('home.placeholder')} aria-label={t('home.placeholder')} />
            <button className="btn lg" type="submit" disabled={!db}>{t('home.find')} <Icon name="arrow" size={18} /></button>
          </form>
          {noMatch && <div className="notice">{t('home.noMatch')}</div>}
          <div className="hero-examples">
            <span className="small muted">{t('home.try')}</span>
            {(['home.ex1', 'home.ex2', 'home.ex3'] as const).map((k) => (
              <button key={k} className="chip" onClick={() => { setQ(t(k)); search(t(k)); }}>{t(k)}</button>
            ))}
          </div>
        </div>

        <Stagger className="hero-side">
          <div className="kpi"><div className="serif-num">{db ? <CountUp value={db.services.length} /> : '—'}</div><div className="small muted">{t('home.statServices')}</div></div>
          <div className="kpi"><div className="serif-num">{db ? <CountUp value={db.masters.length} /> : '—'}</div><div className="small muted">{t('home.statMasters')}</div></div>
          <div className="kpi"><div className="serif-num">{db ? <CountUp value={verified.length} /> : '—'}</div><div className="small muted">{t('home.statVerified')}</div></div>
        </Stagger>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="h1">{t('home.services')}</h2>
          <span className="muted small desktop-only">{t('home.servicesSub')}</span>
        </div>
        {db ? <CategoryTiles categories={db.categories} services={db.services} /> : <Skeleton h={392} />}
      </section>

      <Reveal as="section" className="section">
        <h2 className="h1" style={{ marginBottom: 32 }}>{t('home.how')}</h2>
        <Stagger className="steps">
          {([1, 2, 3] as const).map((n) => (
            <div key={n} className="step">
              <span className="step-n">0{n}</span>
              <h3>{t(`home.step${n}`)}</h3>
              <p className="muted">{t(`home.step${n}t`)}</p>
            </div>
          ))}
        </Stagger>
      </Reveal>

      {user?.role !== 'client' && (
        <Reveal as="section" className="section">
          <div className="pro-cta">
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div className="eyebrow" style={{ color: 'inherit', opacity: .7 }}>{t('nav.forMasters')}</div>
              <h2 className="display" style={{ fontSize: 'clamp(36px, 5vw, 60px)', marginTop: 14 }}>{t('home.proTitle')}</h2>
              <p className="muted" style={{ marginTop: 14, maxWidth: 520 }}>{t('home.proText')}</p>
              <Link to={user?.role === 'master' ? '/pro' : '/auth?role=master'} className="btn lg" style={{ marginTop: 24 }}>
                {user?.role === 'master' ? t('pro.title') : t('home.proBtn')} <Icon name="arrow" size={18} />
              </Link>
            </div>
            <ul style={{ position: 'relative', zIndex: 1 }}>
              {(['home.pro1', 'home.pro2', 'home.pro3'] as const).map((k) => (
                <li key={k}><Icon name="check" size={18} />{t(k)}</li>
              ))}
            </ul>
          </div>
        </Reveal>
      )}

      {onUstam.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2 className="h1">{t('home.onUstam')}</h2>
            <span className="muted small row-flex" style={{ gap: 6 }}><Icon name="chat" size={15} />{t('home.onUstamSub')}</span>
          </div>
          <Stagger className="verified-grid">
            {onUstam.slice(0, 6).map((m) => (
              <div key={m.id} className="panel tight stack" style={{ gap: 14 }}>
                <Link to={`/master/${m.id}`} className="row-flex">
                  <Avatar name={m.name} photo={m.photo} />
                  <span style={{ minWidth: 0 }}>
                    <span className="master-name">{m.name}</span>
                    <span className="small muted" style={{ display: 'block' }}>{m.categoryIds.map((c) => tc(c, db!.categories.find((x) => x.id === c)?.title)).join(', ')}</span>
                  </span>
                </Link>
                <div className="small muted">
                  <Icon name="pin" size={13} /> {m.location ? tc(m.location) : <DistrictsText districts={m.districts} />} · {m.responseTime} · {t('m.experience').toLowerCase()} {exp(m.experienceLabel)}
                </div>
                <ContactButtons m={m} />
              </div>
            ))}
          </Stagger>
        </section>
      )}

      {verified.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2 className="h1">{t('home.verified')}</h2>
            <span className="muted small row-flex" style={{ gap: 6 }}><Icon name="shield" size={15} />{t('home.verifiedSub')}</span>
          </div>
          <Stagger className="verified-grid">
            {verified.map((m) => (
              <div key={m.id} className="panel tight stack" style={{ gap: 14 }}>
                <Link to={`/master/${m.id}`} className="row-flex">
                  <Avatar name={m.name} photo={m.photo} />
                  <span style={{ minWidth: 0 }}>
                    <span className="master-name">{m.name}<span className="verified"><Icon name="shield" size={15} /></span></span>
                    <span className="small muted" style={{ display: 'block' }}>{m.categoryIds.map((c) => tc(c, db!.categories.find((x) => x.id === c)?.title)).join(', ')}</span>
                  </span>
                </Link>
                <div className="small muted">
                  <Icon name="pin" size={13} /> {m.location ? tc(m.location) : <DistrictsText districts={m.districts} />} · {m.responseTime} · {t('m.experience').toLowerCase()} {exp(m.experienceLabel)}
                </div>
                <ContactButtons m={m} />
              </div>
            ))}
          </Stagger>
        </section>
      )}

      <section className="section grid-2">
        <Link to="/check" className="panel feature">
          <div>
            <div className="eyebrow">{t('nav.check')}</div>
            <h3 className="h1" style={{ marginTop: 12 }}>{t('home.checkTitle')}</h3>
            <p className="muted" style={{ marginTop: 10 }}>{t('home.checkText')}</p>
          </div>
          <span className="arrow-link">{t('nav.check')} <Icon name="arrow" size={16} /></span>
        </Link>
        <Link to="/sources" className="panel feature">
          <div>
            <div className="eyebrow">{t('nav.sources')}</div>
            <h3 className="h1" style={{ marginTop: 12 }}>{t('home.sourcesTitle')}</h3>
            <p className="muted" style={{ marginTop: 10 }}>{t('home.sourcesText')}</p>
          </div>
          <span className="arrow-link">{t('nav.sources')} <Icon name="arrow" size={16} /></span>
        </Link>
      </section>
    </div>
  );
}
