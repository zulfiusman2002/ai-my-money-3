import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MiloLogo } from '../components/Milo';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirmed` },
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    if (data.session) nav('/welcome');
    else nav('/check-email', { state: { email } });
  };

  return (
    <div className="auth-shell">
      <div className="auth-left auth-milo-panel">
        <div className="auth-brand"><MiloLogo size={48}/><span>Money<strong>Milo</strong></span></div>
        <div className="auth-milo-copy">
          <h2>Start understanding<br />your money.</h2>
          <p>Takes a few minutes to set up. Milo connects your budget, investments, goals and learning into one clear picture.</p>
        </div>
        <img className="auth-milo-figure" src="/milo/milo-core.png" alt="Milo" />
        <div className="auth-feature-grid">
          {[['📊','Track money in one place'], ['📸','Update investments by screenshot'], ['✨','Get insights from your real data'], ['🎓','Learn one useful idea each day']].map(([icon, text]) => (
            <div key={text}><span>{icon}</span><strong>{text}</strong></div>
          ))}
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-mobile-brand"><MiloLogo size={44}/><span>Money<strong>Milo</strong></span></div>
        <div style={{ marginBottom: 30 }}>
          <div className="t-label">Create your MoneyMilo account</div>
          <h1>Create your account</h1>
          <p>We will ask you to verify your email before the setup begins.</p>
        </div>
        <form onSubmit={submit} className="auth-form">
          <div className="field"><label className="field-label">Email address</label><input className="field-input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div>
          <div className="field"><label className="field-label">Password</label><input className="field-input" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" /></div>
          {err && <div className="auth-error">{err}</div>}
          <button className="btn btn-primary btn-lg w-full" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
        </form>
        <p className="auth-fineprint">Educational guidance only. MoneyMilo does not provide regulated financial advice.</p>
        <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
      </div>
    </div>
  );
}
