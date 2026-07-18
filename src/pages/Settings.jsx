import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { MiloAvatar, MILO_ROLES, PageIntro } from '../components/Milo';
import { PRODUCT } from '../lib/product';
import Icon from '../components/Icon';

const CURRENCIES = ['GBP', 'USD', 'EUR', 'INR', 'AED', 'AUD', 'CAD'];
const SCOPE_OPTIONS = [
  ['individual','Just me'],['couple','Me and my partner'],['household','My household'],['business','My business'],['household_business','Household and business'],
];

export default function Settings() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: profile?.name || '',
    country: profile?.country || '',
    currency: profile?.currency || 'GBP',
    profile_scope: profile?.profile_scope || (profile?.tracker_type === 'family' ? 'household' : 'individual'),
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');
  const [health, setHealth] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      supabase.from('income_sources').select('id',{count:'exact',head:true}).eq('user_id',user.id),
      supabase.from('expenses').select('id',{count:'exact',head:true}).eq('user_id',user.id),
      supabase.from('goals').select('id',{count:'exact',head:true}).eq('user_id',user.id),
      supabase.from('investment_snapshots').select('id',{count:'exact',head:true}).eq('user_id',user.id),
      supabase.from('assets').select('id',{count:'exact',head:true}).eq('user_id',user.id),
    ]).then((rows)=>{ if(alive) setHealth({income:rows[0].count||0,expenses:rows[1].count||0,goals:rows[2].count||0,investments:rows[3].count||0,assets:rows[4].count||0,error:rows.find((r)=>r.error)?.error?.message}); });
    return ()=>{alive=false;};
  },[user.id]);

  const currencyChanged = form.currency !== (profile?.currency || 'GBP');
  const scopeChanged = form.profile_scope !== (profile?.profile_scope || 'individual');

  const save = async () => {
    setBusy(true); setErr(''); setSaved(false);
    try {
      const tracker_type = form.profile_scope === 'individual' ? 'individual' : form.profile_scope === 'business' ? 'business' : 'family';
      const business_mode = form.profile_scope === 'business' ? 'business_only' : form.profile_scope === 'household_business' ? 'both' : 'none';
      const { error } = await supabase.from('user_profiles')
        .update({ name: form.name.trim(), country: form.country.trim(), currency: form.currency, tracker_type, profile_scope: form.profile_scope, business_mode })
        .eq('user_id', user.id);
      if (error) throw error;
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="page page-wide settings-v4 settings-v1">
      <PageIntro eyebrow="Your account and product preferences" title="Settings" subtitle="Keep Milo aligned with who and what you are tracking." />

      <div className="settings-grid-v1">
        <section className="card">
          <div className="section-head compact"><div><div className="t-label">Profile</div><h2>How Milo should understand you</h2></div></div>
          <div className="grid g2">
            <div className="field"><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="field"><label>Country</label><input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
            <div className="field"><label>Base currency</label><select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div className="field"><label>Tracking profile</label><select value={form.profile_scope} onChange={(e) => setForm({ ...form, profile_scope: e.target.value })}>{SCOPE_OPTIONS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
          </div>
          {currencyChanged && <p className="settings-warning-v1">Changing the base currency relabels amounts; it does not automatically re-convert old values. Review asset FX rates afterwards.</p>}
          {scopeChanged && <p className="settings-warning-v1">Changing the profile changes which household/business views appear. It does not delete existing records.</p>}
          {err && <p className="settings-error-v1">{err}</p>}
          <div className="settings-actions-v1"><button className="btn btn-primary" disabled={busy || !form.name.trim()} onClick={save}>{busy ? 'Saving…' : 'Save changes'}</button>{saved && <span className="badge good rise">Saved ✦</span>}</div>
        </section>

        <section className="card product-card-v1">
          <MiloAvatar mode="core" size={180} motion="wave" glow/>
          <div><div className="t-label">Current release</div><h2>{PRODUCT.release}</h2><p>Responsive money workspace, adaptive household/business onboarding, Professor Milo Academy and connected Ask Milo guidance.</p><span className="version-pill-v1">Version {PRODUCT.version}</span></div>
        </section>
      </div>

      <section className="card data-health-v1">
        <div className="section-head compact"><div><div className="t-label">Your MoneyMilo picture</div><h2>Data coverage</h2><p className="t-small">These counts help explain how complete Milo’s guidance can be.</p></div></div>
        {health?.error ? <div className="data-notice error-notice">{health.error}</div> : <div className="data-health-grid-v1">
          {[['Income sources',health?.income,'budget'],['Expense records',health?.expenses,'budget'],['Goals',health?.goals,'goals'],['Investment snapshots',health?.investments,'invest'],['Wider assets',health?.assets,'worth']].map(([label,value,icon])=><div key={label}><span><Icon name={icon} size={17}/>{label}</span><strong>{value ?? '—'}</strong></div>)}
        </div>}
      </section>

      <section className="card milo-roster-v4">
        <div className="section-head compact"><div><div className="t-label">Your MoneyMilo team</div><h2>One Milo. Different expertise.</h2><p className="t-small">The same Milo identity changes attire and behaviour for each financial job.</p></div></div>
        <div className="milo-roster-grid-v4">
          {[
            ['core','Daily companion','wave'],['builder','Budget builder','point'],['investor','Portfolio guide','idle'],['goals','Goal coach','celebrate'],
            ['scientist','Wealth analyst','think'],['future','Future explorer','float'],['ai','Connected AI','wave'],['learn','Professor','point'],
          ].map(([mode,label,motion])=><article key={mode}><MiloAvatar mode={mode} size={128} motion={motion}/><div><strong>{MILO_ROLES[mode]?.name}</strong><span>{label}</span></div></article>)}
        </div>
      </section>

      <div className="settings-grid-v1 lower">
        <section className="card">
          <div className="t-label">MoneyMilo introduction</div><h3>Replay the welcome journey</h3><p>Meet Milo, Ask Milo and Learn with Professor Milo.</p>
          <button className="btn btn-secondary" onClick={() => { localStorage.removeItem(`moneymilo_intro_seen_${user.id}`); navigate('/welcome'); }}>Replay introduction</button>
        </section>
        <section className="card">
          <div className="t-label">Session</div><h3>{user?.email}</h3><p>Sign out safely from this device.</p>
          <button className="btn btn-primary" onClick={async () => { await signOut(); navigate('/'); }}>Sign out</button>
        </section>
      </div>

      <section className="card danger-card-v1">
        <div className="t-label">Privacy controls</div><h3>Account deletion</h3><p>Permanent self-service deletion is not enabled in this beta. Until it is, deletion must be completed through support so financial records and uploaded screenshots are removed together.</p>
        <button className="btn btn-secondary" disabled>Delete account — beta limitation</button>
      </section>
    </div>
  );
}
