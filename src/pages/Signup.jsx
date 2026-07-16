import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MiloLogo } from '../components/Milo';

const pendingKey = 'moneymilo_pending_signup_email';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const passwordChecks = useMemo(() => ({ length: password.length >= 8, letter: /[A-Za-z]/.test(password), number: /\d/.test(password) }), [password]);

  const submit = async (e) => {
    e.preventDefault();
    const normalisedEmail = email.trim().toLowerCase();
    setErr('');
    if (!passwordChecks.length || !passwordChecks.letter || !passwordChecks.number) {
      setErr('Use at least 8 characters with a letter and a number.');
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: normalisedEmail,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirmed` },
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    sessionStorage.setItem(pendingKey, normalisedEmail);
    if (data.session) nav('/welcome', { replace: true });
    else nav('/check-email', { replace: true, state: { email: normalisedEmail } });
  };

  return (
    <div className="auth-shell">
      <div className="auth-left auth-milo-panel">
        <div className="auth-brand"><MiloLogo size={54}/><span>Money<strong>Milo</strong></span></div>
        <div className="auth-milo-copy">
          <h2>Start understanding<br />your money.</h2>
          <p>Milo connects your budget, investments, goals, net worth and learning into one clear picture.</p>
        </div>
        <img className="auth-milo-figure" src="/milo/milo-core-v4.png" alt="Milo" />
        <div className="auth-feature-grid">
          {[['📊','Track personal, household or business money'], ['📸','Update investments by screenshot'], ['✨','Get insights from connected data'], ['🎓','Learn one useful idea each day']].map(([icon, text]) => (
            <div key={text}><span>{icon}</span><strong>{text}</strong></div>
          ))}
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-mobile-brand"><MiloLogo size={48}/><span>Money<strong>Milo</strong></span></div>
        <div className="auth-title-block">
          <div className="t-label">Create your MoneyMilo account</div>
          <h1>Create your account</h1>
          <p>After you submit, verify your email once and Milo will continue the setup.</p>
        </div>
        <form onSubmit={submit} className="auth-form">
          <div className="field"><label className="field-label">Email address</label><input className="field-input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div>
          <div className="field"><label className="field-label">Password</label><input className="field-input" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" /></div>
          <div className="password-checks" aria-live="polite">
            <span className={passwordChecks.length ? 'ok' : ''}>8+ characters</span>
            <span className={passwordChecks.letter ? 'ok' : ''}>A letter</span>
            <span className={passwordChecks.number ? 'ok' : ''}>A number</span>
          </div>
          {err && <div className="auth-error">{err}</div>}
          <button className="btn btn-primary btn-lg w-full" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
        </form>
        <p className="auth-fineprint">Educational guidance only. MoneyMilo does not provide regulated financial advice.</p>
        <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
      </div>
    </div>
  );
}
