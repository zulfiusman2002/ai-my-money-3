import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { fmtMoney, symFor } from '../lib/wealth';
import { getFinancialSummary, currentMonth } from '../lib/financialSummary';
import { MiloAvatar, PageIntro } from '../components/Milo';

const GOAL_TYPES = ['House deposit', 'Emergency fund', 'Retirement', 'Education', 'Travel', 'Debt freedom', 'Wealth target', 'Business', 'Custom'];
const MS_MONTH = 2629800000;
const goalVisual = (type='') => {
  const t = type.toLowerCase();
  if (t.includes('house')) return ['🏡','goal-home'];
  if (t.includes('emergency')) return ['🛡️','goal-safety'];
  if (t.includes('travel')) return ['✈️','goal-travel'];
  if (t.includes('retirement')) return ['🌱','goal-retirement'];
  if (t.includes('debt')) return ['🔓','goal-debt'];
  if (t.includes('education')) return ['🎓','goal-education'];
  return ['🎯','goal-custom'];
};

function calendarMonthsUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  const target = new Date(`${dateStr}T23:59:59`);
  if (Number.isNaN(target.getTime())) return null;
  const raw = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
  const hasPartialMonth = target.getDate() >= now.getDate();
  return Math.max(0, raw + (hasPartialMonth ? 1 : 0));
}
function trajectory(g) {
  const target = Number(g.target_amount), current = Number(g.current_amount), mc = Number(g.monthly_contribution || 0);
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const remaining = Math.max(0, target - current);
  const monthsNeeded = mc > 0 && remaining > 0 ? Math.ceil(remaining / mc) : remaining === 0 ? 0 : null;
  const monthsAvailable = calendarMonthsUntil(g.target_date);
  const onTrack = monthsNeeded != null && monthsAvailable != null ? monthsNeeded <= monthsAvailable : null;
  const requiredMonthly = monthsAvailable > 0 ? remaining / monthsAvailable : null;
  const eta = monthsNeeded != null ? new Date(new Date().getFullYear(), new Date().getMonth() + monthsNeeded, 1) : null;
  return { target, current, mc, pct, remaining, monthsNeeded, monthsAvailable, onTrack, requiredMonthly, eta };
}

export default function Goals() {
  const { user, profile } = useAuth();
  const base = profile?.currency || 'GBP';
  const sym = symFor(base);
  const f = (n) => fmtMoney(n, sym);

  const [goals, setGoals] = useState(null);
  const [budget, setBudget] = useState({ income: 0, expenses: 0 });
  const [assets, setAssets] = useState([]);
  const [form, setForm] = useState(null);
  const [scenario, setScenario] = useState({});   // goal_id -> extra/mo
  const [aiNotes, setAiNotes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const month = currentMonth();
  const load = async () => {
    const [g, fin, ast] = await Promise.all([
      supabase.from('goals').select('*').eq('user_id', user.id).neq('status', 'deleted').order('created_at'),
      getFinancialSummary(user.id, month, { fallback: true }),
      supabase.from('assets').select('id, name, asset_class, liquidity, converted_value').eq('user_id', user.id).eq('is_active', true),
    ]);
    setGoals(g.data || []);
    setBudget({ income: fin.totalIncome, expenses: fin.totalExpenses, month: fin.month, isFallback: fin.isFallback });
    setAssets(ast.data || []);
  };
  useEffect(() => { load(); }, [user.id]);

  const netSavings = budget.income - budget.expenses;
  const committed = useMemo(() => (goals || []).filter((g) => g.status === 'active')
    .reduce((a, g) => a + Number(g.monthly_contribution || 0), 0), [goals]);
  const headroom = netSavings - committed;

  const save = async () => {
    setBusy(true); setErr('');
    try {
      if ([form.target_amount, form.current_amount, form.monthly_contribution].some((v) => Number(v) < 0))
        throw new Error('Amounts cannot be negative.');
      const linked = assets.find((a) => a.id === form.linked_asset_id);
      const row = {
        user_id: user.id, goal_name: form.goal_name, goal_type: form.goal_type || 'Custom',
        target_amount: Number(form.target_amount), current_amount: Number(form.current_amount || 0),
        target_date: form.target_date || null, monthly_contribution: Number(form.monthly_contribution || 0),
        linked_asset_id: form.linked_asset_id || null, linked_asset: linked?.name || null,
        status: form.status || 'active',
      };
      if (form.id) await supabase.from('goals').update(row).eq('id', form.id);
      else await supabase.from('goals').insert(row);
      setForm(null); await load();
      api.intelligence('snapshot').catch(() => {});
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const remove = async (g) => {
    if (!confirm(`Delete goal "${g.goal_name}"?`)) return;
    await supabase.from('goals').delete().eq('id', g.id);
    await load();
  };
  const markDone = async (g) => {
    await supabase.from('goals').update({ status: g.status === 'achieved' ? 'active' : 'achieved' }).eq('id', g.id);
    await load();
  };
  const runAI = async () => {
    setBusy(true);
    try { setAiNotes(await api.analyze('goals')); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  if (goals === null) return <div className="page page-wide"><div className="skeleton" style={{ height: 300 }} /></div>;

  return (
    <div className="page page-wide">
      <PageIntro eyebrow="What your money is actually for" title="Goals" subtitle="Milo turns targets into monthly systems and celebrates every step." action={<button className="btn btn-gold" onClick={() => setForm({ goal_type: 'Custom' })}>+ New goal</button>} />
      {budget.isFallback && <div className="data-notice">Goal headroom uses your latest complete budget month ({budget.month}).</div>}

      {/* budget linkage strip */}
      <div className="card" style={{ marginBottom: 18, display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
        {[['Net savings/mo (from Budget)', f(netSavings)],
          ['Committed to goals', f(committed)],
          ['Headroom', f(headroom)]].map(([l, v], i) => (
          <div key={l}>
            <div className="t-label">{l}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 600, color: i === 2 ? (headroom >= 0 ? 'var(--c-green)' : 'var(--c-red)') : 'var(--c-ink)' }}>{v}</div>
          </div>
        ))}
        {headroom < 0 && <p style={{ fontSize: '.72rem', color: 'var(--c-red)', alignSelf: 'center' }}>Your goal contributions exceed this month's net savings — something has to give.</p>}
        <MiloAvatar mode="goals" size={104} className="goal-strip-milo" />
      </div>

      {err && <div className="card" style={{ borderColor: 'var(--c-red)', color: 'var(--c-red)', marginBottom: 14, fontSize: '.8rem' }}>{err}</div>}

      {/* form */}
      {form && (
        <div className="card fade-up" style={{ marginBottom: 18 }}>
          <div className="t-label">{form.id ? 'Edit goal' : 'New goal'}</div>
          <div className="grid g3" style={{ marginTop: 12 }}>
            <div className="field"><label>Name</label><input value={form.goal_name || ''} onChange={(e) => setForm({ ...form, goal_name: e.target.value })} /></div>
            <div className="field"><label>Type</label><select value={form.goal_type} onChange={(e) => setForm({ ...form, goal_type: e.target.value, goal_name: form.goal_name || e.target.value })}>
              {GOAL_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
            <div className="field"><label>Target ({sym})</label><input type="number" min="0" value={form.target_amount || ''} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} /></div>
            <div className="field"><label>Saved so far ({sym})</label><input type="number" min="0" value={form.current_amount || ''} onChange={(e) => setForm({ ...form, current_amount: e.target.value })} /></div>
            <div className="field"><label>Monthly contribution ({sym})</label><input type="number" min="0" value={form.monthly_contribution || ''} onChange={(e) => setForm({ ...form, monthly_contribution: e.target.value })} /></div>
            <div className="field"><label>Target date</label><input type="date" value={form.target_date || ''} onChange={(e) => setForm({ ...form, target_date: e.target.value })} /></div>
            <div className="field"><label>Funded from (asset link)</label>
              <select value={form.linked_asset_id || ''} onChange={(e) => setForm({ ...form, linked_asset_id: e.target.value })}>
                <option value="">— none —</option>
                {assets.map((a) => <option key={a.id} value={a.id}>{a.name} ({fmtMoney(a.converted_value, sym)})</option>)}
              </select></div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button className="btn btn-secondary" onClick={() => setForm(null)}>Cancel</button>
            <button className="btn btn-gold" disabled={busy || !form.goal_name || !Number(form.target_amount)} onClick={save}>{busy ? 'Saving…' : 'Save goal'}</button>
          </div>
        </div>
      )}

      {/* goal cards */}
      {goals.length === 0 && !form ? (
        <div className="card empty">
          <div className="display">No goals yet</div>
          <p style={{ maxWidth: 400, margin: '8px auto 0' }}>A goal turns "saving" into "saving for". Start with the one that matters most.</p>
          <button className="btn btn-gold" style={{ marginTop: 16 }} onClick={() => setForm({ goal_type: 'Emergency fund', goal_name: 'Emergency fund' })}>Create first goal</button>
        </div>
      ) : (
        <div className="grid g2">
          {goals.map((g) => {
            const t = trajectory(g);
            const extra = scenario[g.id] || 0;
            const scenMonths = t.remaining > 0 && (t.mc + extra) > 0 ? Math.ceil(t.remaining / (t.mc + extra)) : null;
            const saved = t.monthsNeeded != null && scenMonths != null ? t.monthsNeeded - scenMonths : null;
            const achieved = g.status === 'achieved';
            return (
              <div key={g.id} className={`card goal-card ${goalVisual(g.goal_type)[1]}`} style={{ opacity: achieved ? 0.75 : 1 }}>
                <div className="goal-card-head">
                  <div className="goal-icon">{goalVisual(g.goal_type)[0]}</div>
                  <div style={{flex:1}}>
                    <div className="t-label">{g.goal_type}{g.linked_asset ? ` · funded from ${g.linked_asset}` : ''}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', marginTop: 2 }}>{g.goal_name}</div>
                  </div>
                  {achieved ? <span className="badge badge-good">achieved ✦</span>
                    : t.onTrack === true ? <span className="badge badge-good">on track</span>
                    : t.onTrack === false ? <span className="badge badge-risk">behind</span>
                    : <span className="badge badge-neutral">no deadline</span>}
                </div>

                {(() => {
                  const la = assets.find((a) => a.id === g.linked_asset_id);
                  if (!la || !['liquid', 'semi_liquid'].includes(la.liquidity)) return null;
                  const coverPct = t.target > 0 ? Math.min(100, (Number(la.converted_value) / t.target) * 100) : 0;
                  const assetVal = Math.round(Number(la.converted_value));
                  const differs = Math.abs(assetVal - t.current) > 1;
                  return (
                    <div style={{ fontSize: '.7rem', color: 'var(--c-muted)', marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span>{la.name} holds {f(la.converted_value)} — covers {coverPct.toFixed(0)}% of this target today.</span>
                      {differs && !achieved && (
                        <button className="chip" style={{ padding: '3px 10px', fontSize: '.62rem' }}
                          title="Set this goal's progress to the linked asset's current value"
                          onClick={async () => {
                            await supabase.from('goals').update({ current_amount: assetVal }).eq('id', g.id);
                            await load();
                            api.intelligence('snapshot').catch(() => {});
                          }}>
                          Use {f(assetVal)} as progress
                        </button>
                      )}
                    </div>
                  );
                })()}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.78rem', margin: '14px 0 6px' }}>
                  <span>{f(t.current)} <span style={{ color: 'var(--c-muted)' }}>of {f(t.target)}</span></span>
                  <span style={{ color: 'var(--c-muted)' }}>{t.pct.toFixed(0)}%</span>
                </div>
                <div style={{ height: 8, background: 'var(--c-border)', borderRadius: 8 }}>
                  <div style={{ height: '100%', width: `${t.pct}%`, borderRadius: 8, transition: 'width .8s ease',
                    background: achieved ? 'var(--c-green)' : 'linear-gradient(90deg, var(--c-green), var(--c-gold))' }} />
                </div>

                {/* timeline */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.68rem', color: 'var(--c-muted)', marginTop: 10 }}>
                  <span>{f(t.mc)}/mo</span>
                  {t.eta && <span>ETA {t.eta.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}{t.monthsNeeded != null ? ` (${t.monthsNeeded} mo)` : ''}</span>}
                  {g.target_date && <span>target {new Date(g.target_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span>}
                </div>
                {t.onTrack === false && t.requiredMonthly != null && (
                  <div className="goal-coach-note risk"><strong>Milo’s coaching note</strong><span>Add {f(Math.max(0,t.requiredMonthly - t.mc))}/month to move back on track for {g.target_date ? new Date(g.target_date).toLocaleDateString('en-GB',{month:'short',year:'numeric'}) : 'your target'}.</span></div>
                )}
                {t.onTrack === true && !achieved && <div className="goal-coach-note good"><strong>Milo’s coaching note</strong><span>Your current system is working. Keep the {f(t.mc)}/month contribution consistent.</span></div>}

                {/* scenario slider */}
                {!achieved && t.remaining > 0 && (
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--c-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.68rem', color: 'var(--c-muted)' }}>
                      <span>What if I add {f(extra)}/mo?</span>
                      {saved > 0 && <span className="scenario-impact">Finish {saved} months sooner · {scenMonths} months left</span>}
                    </div>
                    <input type="range" min="0" max={Math.max(100, Math.round(Math.max(headroom, 0) + 200))} step="25" value={extra}
                      style={{ width: '100%', accentColor: 'var(--c-gold)', marginTop: 6 }}
                      onChange={(e) => setScenario({ ...scenario, [g.id]: Number(e.target.value) })} />
                  </div>
                )}

                <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                  <button className="chip" onClick={() => setForm({ ...g })}>Edit</button>
                  <button className="chip" onClick={() => markDone(g)}>{achieved ? 'Reopen' : 'Mark achieved'}</button>
                  {extra > 0 && (
                    <button className="chip on" onClick={async () => {
                      await supabase.from('goals').update({ monthly_contribution: t.mc + extra }).eq('id', g.id);
                      setScenario({ ...scenario, [g.id]: 0 }); await load();
                    }}>Commit +{f(extra)}/mo</button>
                  )}
                  <button className="chip" onClick={() => remove(g)}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI goal check */}
      <div className="card milo-review-strip" style={{ marginTop: 18 }}>
        <MiloAvatar mode="goals" size={96} className="review-milo" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div className="t-label">AI goal check</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', marginTop: 4 }}>{aiNotes ? aiNotes.headline : 'Are these goals funded by this budget?'}</div>
          </div>
          <button className="btn btn-primary" onClick={runAI} disabled={busy}>{busy ? 'Checking…' : 'Check my goals'}</button>
        </div>
        {aiNotes?.actions?.length > 0 && aiNotes.actions.map((a, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderTop: i === 0 ? 'none' : '1px solid var(--c-border)', marginTop: i === 0 ? 14 : 0 }}>
            <span className={`badge ${a.priority === 'high' ? 'risk' : a.priority === 'medium' ? 'warning' : ''}`}>{a.priority}</span>
            <div><strong style={{ fontSize: '.82rem' }}>{a.title}</strong>
              <div style={{ fontSize: '.74rem', color: 'var(--c-muted)' }}>{a.detail}</div></div>
          </div>
        ))}
        {aiNotes?.disclaimer && <p style={{ marginTop: 12, fontSize: '.62rem', color: 'var(--c-muted)' }}>{aiNotes.disclaimer}</p>}
      </div>
    </div>
  );
}
