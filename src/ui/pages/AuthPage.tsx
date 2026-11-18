/** Sign in / sign up for clients and masters. ?role=master preselects the master tab. */
import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { dataMode } from '../../data';
import type { Role } from '../../domain/types';
import type { Key } from '../../i18n/dictionary';
import { useAuth } from '../../state/AuthContext';
import { usePrefs } from '../../state/PrefsContext';
import { Icon } from '../components/Icon';
import { Reveal } from '../components/Motion';

export function AuthPage() {
  const { t } = usePrefs();
  const { user, signIn, signUp } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = params.get('next');
  const [mode, setMode] = useState<'in' | 'up'>(params.get('mode') === 'in' ? 'in' : 'up');
  const [role, setRole] = useState<Role>(params.get('role') === 'client' ? 'client' : params.get('role') === 'master' ? 'master' : 'client');
  const [form, setForm] = useState({ name: '', email: '', phone: '+998 ', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user && !busy) return <Navigate to={next || (user.role === 'master' ? '/pro' : '/')} replace />;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const u = mode === 'in' ? await signIn(form.email, form.password) : await signUp({ role, ...form });
      navigate(next || (u.role === 'master' ? '/pro' : '/'), { replace: true });
    } catch (err) {
      const m = (err as Error).message;
      setError(m.startsWith('auth.') ? t(m as Key) : m);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <Reveal className="auth-wrap">
        <h1 className="h1">{mode === 'in' ? t('auth.titleIn') : t('auth.titleUp')}</h1>
        {mode === 'up' && <p className="muted" style={{ marginTop: 10 }}>{t('auth.subUp')}</p>}

        <form className="panel form-stack" style={{ marginTop: 24 }} onSubmit={submit}>
          {mode === 'up' && (
            <div className="role-pick" role="radiogroup">
              {(['client', 'master'] as Role[]).map((r) => (
                <button type="button" key={r} className={role === r ? 'on' : ''} onClick={() => setRole(r)} aria-pressed={role === r}>
                  <Icon name={r === 'client' ? 'home' : 'handyman'} size={22} />
                  <strong style={{ fontWeight: 600 }}>{r === 'client' ? t('auth.client') : t('auth.master')}</strong>
                </button>
              ))}
            </div>
          )}
          {mode === 'up' && (
            <label className="field"><span className="label" style={{ margin: 0 }}>{t('auth.name')}</span>
              <input className="input" required minLength={2} value={form.name} onChange={set('name')} autoComplete="name" /></label>
          )}
          <label className="field"><span className="label" style={{ margin: 0 }}>{t('auth.email')}</span>
            <input className="input" type="email" required value={form.email} onChange={set('email')} autoComplete="email" /></label>
          {mode === 'up' && (
            <label className="field"><span className="label" style={{ margin: 0 }}>{t('auth.phone')}</span>
              <input className="input" type="tel" required value={form.phone} onChange={set('phone')} autoComplete="tel" /></label>
          )}
          <label className="field"><span className="label" style={{ margin: 0 }}>{t('auth.password')}</span>
            <input className="input" type="password" required minLength={6} value={form.password} onChange={set('password')} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} /></label>
          {error && <p className="error">{error}</p>}
          <button className="btn lg block" disabled={busy}>{mode === 'in' ? t('auth.in') : t('auth.up')} <Icon name="arrow" size={18} /></button>
          <button type="button" className="link small" style={{ alignSelf: 'center' }} onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setError(null); }}>
            {mode === 'in' ? t('auth.toUp') : t('auth.toIn')}
          </button>
        </form>
        {dataMode === 'local' && <p className="small muted" style={{ marginTop: 14, textAlign: 'center' }}>{t('auth.demoNote')}</p>}
      </Reveal>
    </div>
  );
}
