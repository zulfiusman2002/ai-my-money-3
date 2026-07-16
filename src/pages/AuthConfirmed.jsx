import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MiloLogo } from '../components/Milo';

const pendingKey = 'moneymilo_pending_signup_email';

export default function AuthConfirmed() {
  const nav = useNavigate();
  const [status, setStatus] = useState('Confirming your account…');
  const [needsLogin, setNeedsLogin] = useState(false);

  useEffect(() => {
    let alive = true;
    let navTimer;
    const complete = (session) => {
      if (!alive || !session) return;
      sessionStorage.removeItem(pendingKey);
      setStatus('Email verified. Opening MoneyMilo…');
      setNeedsLogin(false);
      navTimer = setTimeout(() => nav('/welcome', { replace: true }), 600);
    };
    const check = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!alive) return;
      if (error) setStatus(error.message);
      else if (data.session) complete(data.session);
      else {
        setStatus('Your email is verified. Sign in once to continue.');
        setNeedsLogin(true);
      }
    };
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => complete(session));
    const timer = setTimeout(check, 1200);
    return () => { alive = false; clearTimeout(timer); clearTimeout(navTimer); listener.subscription.unsubscribe(); };
  }, [nav]);

  return <div className="auth-centre-shell"><section className="auth-message-card auth-message-card-v1">
    <MiloLogo size={92}/><div className="t-label">MoneyMilo account</div><h1>{status}</h1>
    <p>{needsLogin ? 'Use the email and password you just created. You do not need to register again.' : 'Keep this page open for a moment while we securely finish your sign-up.'}</p>
    {needsLogin && <Link className="btn btn-primary w-full" to="/login">Continue to sign in</Link>}
  </section></div>;
}
