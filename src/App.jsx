import { lazy, Suspense, useMemo, useState } from 'react';
import { Routes, Route, Navigate, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Welcome from './pages/Welcome';
import Icon from './components/Icon';
import { MiloAvatar, MiloLogo } from './components/Milo';
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
    <MiloLogo size={64} />
    <div><strong>Money<span>Milo</span></strong><small>Bringing your financial picture together…</small></div>
  </div>
);

const NAV_ITEMS = [
  { to: '/app',             label: 'Overview',    icon: 'home',    hint: 'Your financial home' },
  { to: '/app/budget',      label: 'Budget',      icon: 'budget',  hint: 'Income and spending' },
  { to: '/app/investments', label: 'Investments', icon: 'invest',  hint: 'Portfolio and assets' },
  { to: '/app/goals',       label: 'Goals',       icon: 'goals',   hint: 'Plans and progress' },
  { to: '/app/networth',    label: 'Net worth',   icon: 'worth',   hint: 'Everything you own' },
  { to: '/app/projector',   label: 'Projector',   icon: 'project', hint: 'See your future' },
  { to: '/app/advisor',     label: 'Ask Milo',    icon: 'advisor', hint: 'Connected AI guidance' },
  { to: '/app/learn',       label: 'Learn',       icon: 'learn',   hint: 'Daily money lessons' },
];

const MOBILE_ITEMS = NAV_ITEMS.filter((x) => ['/app', '/app/budget', '/app/investments', '/app/advisor', '/app/learn'].includes(x.to));
const MORE_ITEMS = NAV_ITEMS.filter((x) => ['/app/goals', '/app/networth', '/app/projector'].includes(x.to));

function Shell({ children }) {
  const { profile } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [more, setMore] = useState(false);
  const initials = profile?.name ? profile.name[0].toUpperCase() : 'M';
  const active = useMemo(() => NAV_ITEMS.find((x) => location.pathname === x.to) || NAV_ITEMS[0], [location.pathname]);
  const date = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  return (
    <div className="app-shell-v3">
      <aside className="desktop-sidebar">
        <button className="side-brand" onClick={() => nav('/app')} aria-label="MoneyMilo home">
          <MiloLogo size={76} />
          <span className="brand-word">Money<span>Milo</span></span>
        </button>

        <div className="side-section-label">Your money</div>
        <nav className="side-nav-list">
          {NAV_ITEMS.map(({ to, label, icon, hint }) => (
            <NavLink key={to} to={to} end={to === '/app'} className={({ isActive }) => `side-nav-item${isActive ? ' active' : ''}`}>
              <span className="side-nav-icon"><Icon name={icon} size={20}/></span>
              <span><strong>{label}</strong><small>{hint}</small></span>
              <Icon name="chevron" size={15}/>
            </NavLink>
          ))}
        </nav>

        <button className="side-milo-card" onClick={() => nav('/app/advisor')}>
          <div><span>Ask Milo</span><strong>What should I focus on today?</strong><small>Use your connected financial picture.</small></div>
          <MiloAvatar mode="ai" size={138}/>
        </button>

        <button className="side-profile" onClick={() => nav('/app/settings')}>
          <span className="nav-avatar">{initials}</span>
          <span><strong>{profile?.name || 'Your profile'}</strong><small>Settings & preferences</small></span>
          <Icon name="chevron" size={15}/>
        </button>
      </aside>

      <section className="workspace-v3">
        <header className="workspace-topbar">
          <div>
            <div className="workspace-date">{date}</div>
            <h1>{active.label}</h1>
          </div>
          <div className="workspace-actions">
            <button className="top-ask" onClick={() => nav('/app/advisor')}><Icon name="spark" size={17}/> Ask Milo</button>
            <button className="top-avatar" onClick={() => nav('/app/settings')}>{initials}</button>
          </div>
        </header>

        <header className="mobile-topbar">
          <button className="brand" onClick={() => nav('/app')} aria-label="MoneyMilo home">
            <MiloLogo size={56} /><span className="brand-word">Money<span>Milo</span></span>
          </button>
          <div className="nav-actions">
            <button className="top-more" onClick={() => setMore(true)} aria-label="More"><Icon name="more"/></button>
            <button className="nav-avatar" title="Settings" onClick={() => nav('/app/settings')}>{initials}</button>
          </div>
        </header>

        <main className="workspace-content">{children}</main>
      </section>

      <button className="milo-fab" onClick={() => nav('/app/advisor')} aria-label="Ask Milo">
        <MiloLogo size={58}/><span><strong>Ask Milo</strong><small>Get a clear answer</small></span>
      </button>

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
            <div className="sheet-head"><div><span>MoneyMilo</span><h3>More tools</h3></div><button onClick={() => setMore(false)}><Icon name="close"/></button></div>
            <div className="more-grid">
              {MORE_ITEMS.map(({ to, label, icon, hint }) => (
                <button key={to} onClick={() => { nav(to); setMore(false); }}><span><Icon name={icon}/></span><strong>{label}</strong><small>{hint}</small></button>
              ))}
              <button onClick={() => { nav('/app/settings'); setMore(false); }}><span><Icon name="more"/></span><strong>Settings</strong><small>Profile and preferences</small></button>
            </div>
          </section>
        </div>
      )}
    </div>
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
