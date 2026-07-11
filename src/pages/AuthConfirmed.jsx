import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MiloLogo } from '../components/Milo';

export default function AuthConfirmed() {
  const nav = useNavigate();
  const [status, setStatus] = useState('Confirming your account…');

  useEffect(() => {
    let alive = true;
    const finish = async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      if (data.session) {
        setStatus('Email verified. Opening MoneyMilo…');
        setTimeout(() => nav('/welcome', { replace: true }), 650);
      } else {
        setStatus('Your email is verified. Sign in once to continue.');
      }
    };
    const timer = setTimeout(finish, 900);
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setStatus('Email verified. Opening MoneyMilo…');
        setTimeout(() => nav('/welcome', { replace: true }), 500);
      }
    });
    return () => { alive = false; clearTimeout(timer); listener.subscription.unsubscribe(); };
  }, [nav]);

  return <div className="auth-centre-shell"><section className="auth-message-card">
    <MiloLogo size={82}/><div className="t-label">MoneyMilo account</div><h1>{status}</h1>
    <p>Keep this page open for a moment while we securely finish your sign-up.</p>
    <Link className="btn btn-primary w-full" to="/login">Go to sign in</Link>
  </section></div>;
}
