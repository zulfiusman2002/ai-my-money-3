import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MiloLogo } from '../components/Milo';

const pendingKey = 'moneymilo_pending_signup_email';

export default function Login() {
  const [email, setEmail] = useState(sessionStorage.getItem(pendingKey) || '');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const nav = useNavigate();

  const friendlyError = (message='') => {
    if (/email not confirmed/i.test(message)) return 'Your account exists, but the email is not verified yet.';
    if (/invalid login credentials/i.test(message)) return 'The email or password is incorrect. If you just signed up, verify your email first.';
    return message;
  };

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    const normalised = email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithPassword({ email: normalised, password });
    setBusy(false);
    if (error) setErr(friendlyError(error.message));
    else { sessionStorage.removeItem(pendingKey); nav('/app', { replace: true }); }
  };

  const resend = async () => {
    const normalised = email.trim().toLowerCase();
    if (!normalised) return setErr('Enter your email address first.');
    setResending(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email: normalised, options: { emailRedirectTo: `${window.location.origin}/auth/confirmed` } });
    setResending(false);
    if (!error) sessionStorage.setItem(pendingKey, normalised);
    setErr(error ? error.message : 'A new verification email has been sent.');
  };

  return (
    <div className="auth-shell">
      <div className="auth-left auth-milo-panel">
        <div className="auth-brand"><MiloLogo size={54}/><span>Money<strong>Milo</strong></span></div>
        <div className="auth-milo-copy"><h2>Your financial<br />command centre.</h2><p>Every goal, asset and monthly decision brought into one connected view.</p></div>
        <img className="auth-milo-figure" src="/milo/milo-ai-v4.png" alt="AI Milo" />
        <div className="auth-feature-grid">
          {['Budget · Investments · Goals', 'Net worth · Projector · Ask Milo', 'Daily learning that responds to you'].map((t) => <div key={t}><span>✦</span><strong>{t}</strong></div>)}
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-mobile-brand"><MiloLogo size={48}/><span>Money<strong>Milo</strong></span></div>
        <div className="auth-title-block"><div className="t-label">Welcome back</div><h1>Sign in to MoneyMilo</h1><p>Continue to your connected money dashboard.</p></div>
        <form onSubmit={submit} className="auth-form">
          <div className="field"><label className="field-label">Email address</label><input className="field-input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div>
          <div className="field"><label className="field-label">Password</label><input className="field-input" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></div>
          {err && <div className="auth-error"><span>{err}</span>{/verified|verify|confirmation/i.test(err) && <button type="button" onClick={resend} disabled={resending}>{resending ? 'Sending…' : 'Resend verification'}</button>}</div>}
          <button className="btn btn-primary btn-lg w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <p className="auth-switch">Don't have an account? <Link to="/signup">Create one free</Link></p>
      </div>
    </div>
  );
}
