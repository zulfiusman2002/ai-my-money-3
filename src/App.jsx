import { lazy, Suspense, useState } from 'react';
import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Welcome from './pages/Welcome';
import Icon from './components/Icon';
import { MiloLogo } from './components/Milo';
import CheckEmail from './pages/CheckEmail';
import AuthConfirmed from './pages/AuthConfirmed';

const Onboarding  = lazy(() => import('./pages/Onboarding'));
const Dashboard   = lazy(() => import('./pages/Dashboard'));
const Advisor     = lazy(() => import('./pages/Advisor'));
const Investments = lazy(() => import('./pages/Investments'));
const Learn       = lazy(() => import('./pages/Learn'));
const Budget      = lazy(() => import('./pages/Budget'));
const Goals       = lazy(() => import('./pages/Goals'));
const NetWorth    = lazy(() => import('./pages/NetWorth'));
const Projector   = lazy(() => import('./pages/Projector'));
const Settings    = lazy(() => import('./pages/Settings'));

const Spinner = () => (
  <div className="app-loading">
    <MiloLogo size={58} />
    <div><strong>Money<span>Milo</span></strong><small>Getting your money ready…</small></div>
  </div>
);

const NAV_ITEMS = [
  { to: '/app',             label: 'Home',       icon: 'home' },
  { to: '/app/budget',      label: 'Budget',     icon: 'budget' },
  { to: '/app/investments', label: 'Invest',     icon: 'invest' },
  { to: '/app/goals',       label: 'Goals',      icon: 'goals' },
  { to: '/app/networth',    label: 'Net Worth',  icon: 'worth' },
  { to: '/app/projector',   label: 'Projector',  icon: 'project' },
  { to: '/app/advisor',     label: 'Ask Milo',   icon: 'advisor' },
  { to: '/app/learn',       label: 'Learn',      icon: 'learn' },
];

const MOBILE_ITEMS = NAV_ITEMS.filter((x) => ['/app', '/app/investments', '/app/goals', '/app/advisor', '/app/learn'].includes(x.to));
const MORE_ITEMS = NAV_ITEMS.filter((x) => ['/app/budget', '/app/networth', '/app/projector'].includes(x.to));

function Shell({ children }) {
  const { profile } = useAuth();
  const nav = useNavigate();
  const [more, setMore] = useState(false);
  const initials = profile?.name ? profile.name[0].toUpperCase() : 'M';

  return (
    <>
      <nav className="nav">
        <button className="brand" onClick={() => nav('/app')} aria-label="MoneyMilo home">
          <MiloLogo size={38} className="brand-logo" />
          <span className="brand-word">Money<span>Milo</span></span>
        </button>
        <div className="nav-tabs">
          {NAV_ITEMS.map(({ to, label }) => (
            <NavLink key={to} to={to} end={to === '/app'} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              {label}
            </NavLink>
          ))}
        </div>
        <div className="nav-actions">
          <button className="top-more" onClick={() => setMore(true)} aria-label="More"><Icon name="more"/></button>
          <button className="nav-avatar" title="Settings" onClick={() => nav('/app/settings')}>{initials}</button>
        </div>
      </nav>

      <main>{children}</main>

      <nav className="bottom-nav">
        {MOBILE_ITEMS.map(({ to, label, icon }) => (
          <NavLink key={to} to={to} end={to === '/app'} className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
            <Icon name={icon}/><span>{label}</span>
          </NavLink>
        ))}
        <button className="bottom-nav-item" onClick={() => setMore(true)}><Icon name="more"/><span>More</span></button>
      </nav>

      {more && (
        <div className="sheet-backdrop" onClick={() => setMore(false)}>
          <section className="more-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-head"><div><span>MoneyMilo</span><h3>Everything else</h3></div><button onClick={() => setMore(false)}><Icon name="close"/></button></div>
            <div className="more-grid">
              {MORE_ITEMS.map(({ to, label, icon }) => (
                <button key={to} onClick={() => { nav(to); setMore(false); }}><span><Icon name={icon}/></span><strong>{label}</strong><small>Open {label.toLowerCase()}</small></button>
              ))}
              <button onClick={() => { nav('/app/settings'); setMore(false); }}><span><Icon name="more"/></span><strong>Settings</strong><small>Profile and preferences</small></button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function Protected({ children }) {
  const { session, profile, user } = useAuth();
  if (session === undefined || (session && profile === null)) return <Spinner />;
  if (!session) return <Navigate to="/login" replace />;
  if (profile === false || (profile && !profile.onboarding_complete)) {
    const seen = user?.id && localStorage.getItem(`moneymilo_intro_seen_${user.id}`);
    return <Navigate to={seen ? '/onboarding' : '/welcome'} replace />;
  }
  return <Shell>{children}</Shell>;
}

export default function App() {
  const { session } = useAuth();
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/" element={session ? <Navigate to="/app" /> : <Landing />} />
        <Route path="/login" element={session ? <Navigate to="/app" /> : <Login />} />
        <Route path="/signup" element={session ? <Navigate to="/app" /> : <Signup />} />
        <Route path="/check-email" element={<CheckEmail />} />
        <Route path="/auth/confirmed" element={<AuthConfirmed />} />
        <Route path="/welcome" element={session ? <Welcome /> : <Navigate to="/login" />} />
        <Route path="/onboarding" element={session ? <Onboarding /> : <Navigate to="/login" />} />
        <Route path="/app" element={<Protected><Dashboard /></Protected>} />
        <Route path="/app/budget" element={<Protected><Budget /></Protected>} />
        <Route path="/app/investments" element={<Protected><Investments /></Protected>} />
        <Route path="/app/goals" element={<Protected><Goals /></Protected>} />
        <Route path="/app/networth" element={<Protected><NetWorth /></Protected>} />
        <Route path="/app/projector" element={<Protected><Projector /></Protected>} />
        <Route path="/app/advisor" element={<Protected><Advisor /></Protected>} />
        <Route path="/app/learn" element={<Protected><Learn /></Protected>} />
        <Route path="/app/settings" element={<Protected><Settings /></Protected>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Suspense>
  );
}
