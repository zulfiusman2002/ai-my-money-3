import { useLocation, Link } from 'react-router-dom';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { MiloLogo } from '../components/Milo';

const pendingKey = 'moneymilo_pending_signup_email';

export default function CheckEmail() {
  const { state } = useLocation();
  const [email, setEmail] = useState(state?.email || sessionStorage.getItem(pendingKey) || '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const resend = async () => {
    const normalised = email.trim().toLowerCase();
    if (!normalised) { setMessage('Enter the email address you used to sign up.'); return; }
    setBusy(true); setMessage('');
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: normalised,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirmed` },
    });
    setBusy(false);
    if (!error) sessionStorage.setItem(pendingKey, normalised);
    setMessage(error ? error.message : 'A fresh verification email is on its way. Check spam or junk too.');
  };

  return <div className="auth-centre-shell">
    <section className="auth-message-card auth-message-card-v1">
      <MiloLogo size={92} />
      <div className="t-label">One quick step</div>
      <h1>Verify your email</h1>
      <p>Open the confirmation link from Supabase. It will return you to MoneyMilo and continue setup automatically.</p>
      <label className="field"><span className="field-label">Email used for signup</span><input className="field-input" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
      <div className="auth-info-box"><strong>Do not sign up again.</strong> Verification can take a minute. Once verified, the same email and password will work.</div>
      {message && <div className="data-notice">{message}</div>}
      <button className="btn btn-primary w-full" disabled={busy} onClick={resend}>{busy ? 'Sending…' : 'Resend verification email'}</button>
      <Link to="/login" className="auth-text-link">Already verified? Sign in</Link>
    </section>
  </div>;
}
