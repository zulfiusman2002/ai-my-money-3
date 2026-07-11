import { useLocation, Link } from 'react-router-dom';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { MiloLogo } from '../components/Milo';

export default function CheckEmail() {
  const { state } = useLocation();
  const email = state?.email || '';
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const resend = async () => {
    if (!email) return;
    setBusy(true); setMessage('');
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirmed` },
    });
    setBusy(false);
    setMessage(error ? error.message : 'A fresh verification email is on its way.');
  };

  return <div className="auth-centre-shell">
    <section className="auth-message-card">
      <MiloLogo size={82} />
      <div className="t-label">One quick step</div>
      <h1>Verify your email</h1>
      <p>We sent a confirmation link{email ? <> to <strong>{email}</strong></> : ''}. Open it on this device and MoneyMilo will continue your setup automatically.</p>
      <div className="auth-info-box">You do not need to create another account or try signing in before verification.</div>
      {message && <div className="data-notice">{message}</div>}
      <button className="btn btn-primary w-full" disabled={busy || !email} onClick={resend}>{busy ? 'Sending…' : 'Resend verification email'}</button>
      <Link to="/login" className="auth-text-link">Already verified? Sign in</Link>
    </section>
  </div>;
}
