/**
 * Master cabinet: /pro (profile), /pro/orders, /pro/finance.
 * Only for signed-in masters.
 */
import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../../state/AuthContext';
import { usePrefs } from '../../state/PrefsContext';
import { Icon } from '../components/Icon';
import { ProProfile } from './pro/ProProfile';
import { ProOrders } from './pro/ProOrders';
import { ProFinance } from './pro/ProFinance';

export function ProPage() {
  const { t } = usePrefs();
  const { user, ready, masterProfileId, unread } = useAuth();
  if (!ready) return null;
  if (!user) return <Navigate to="/auth?role=master&next=/pro" replace />;
  if (user.role !== 'master') return <div className="container"><div className="panel empty"><p>{t('pro.onlyMasters')}</p></div></div>;

  const cls = ({ isActive }: { isActive: boolean }) => (isActive ? 'active' : '');
  return (
    <div className="container">
      <div className="page-head" style={{ marginBottom: 12 }}>
        <div>
          <div className="eyebrow">{t('pro.title')}</div>
          <h1 className="h1" style={{ marginTop: 10 }}>{user.name}</h1>
        </div>
        {masterProfileId && <Link to={`/master/${masterProfileId}`} className="btn ghost sm">{t('pro.preview')} <Icon name="external" size={14} /></Link>}
      </div>
      <nav className="tabs-line" style={{ marginBottom: 28 }}>
        <NavLink to="/pro" end className={cls}>{t('pro.tabProfile')}</NavLink>
        <NavLink to="/pro/orders" className={cls}>{t('pro.tabOrders')}</NavLink>
        <NavLink to="/pro/finance" className={cls}>{t('pro.tabAnalytics')}</NavLink>
        <NavLink to="/messages" className={cls}>{t('pro.tabMessages')}{unread > 0 && <span className="tag gold">{unread}</span>}</NavLink>
      </nav>
      <Routes>
        <Route index element={<ProProfile />} />
        <Route path="orders" element={<ProOrders />} />
        <Route path="finance" element={<ProFinance />} />
      </Routes>
    </div>
  );
}
