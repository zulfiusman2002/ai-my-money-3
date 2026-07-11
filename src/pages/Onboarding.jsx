import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { MiloAvatar, MiloLogo } from '../components/Milo';

const TOTAL_STEPS = 8;
const month = new Date().toISOString().slice(0, 7);

const FIXED_DEFAULTS = [
  ['Rent / mortgage', 'housing'], ['Utilities', 'housing'], ['Groceries', 'food'],
  ['Insurance', 'fixed'], ['Car payment', 'transport'], ['Fuel / transport', 'transport'],
  ['Loan repayments', 'debt'], ['Subscriptions', 'lifestyle'], ['Family support', 'family'], ['Childcare', 'family'],
].map(([description, category]) => ({ description, category, amount: '' }));
const BROKER_TYPES = ['Indian stocks', 'UK stocks', 'US stocks', 'Mutual funds', 'ETFs', 'Crypto', 'Bonds'];
const WEALTH_TYPES = [
  ['Property', 'property', 'illiquid'], ['Land', 'land', 'illiquid'], ['Gold', 'gold', 'liquid'],
  ['Pension', 'pension', 'illiquid'], ['Cash savings', 'cash', 'liquid'], ['Vehicle', 'vehicle', 'semi_liquid'], ['Other', 'other', 'semi_liquid'],
];
const GOAL_TYPES = ['Emergency fund', 'House deposit', 'Debt freedom', 'Retirement', 'Child education', 'Travel', 'Business', 'Wealth target'];
const CURRENCIES = ['GBP', 'USD', 'EUR', 'INR', 'AED', 'AUD', 'CAD'];
const SYM = { GBP: '£', USD: '$', EUR: '€', INR: '₹', AED: 'AED ', AUD: 'A$', CAD: 'C$' };
const PRIMARY_NAMES = { salaried: 'Take-home salary', 'self-employed': 'Self-employed income', freelancer: 'Freelance income', business: 'Business income', mixed: 'Primary income' };
const EXTRA_SOURCES = ['Second salary', 'Bonus', 'Rental income', 'Side income'];

const money = (n, sym) => `${sym}${Math.max(0, Number(n || 0)).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;

function Choice({ active, children, onClick }) {
  return <button type="button" className={`onb-choice${active ? ' active' : ''}`} onClick={onClick}>{children}</button>;
}
function Field({ label, children, hint }) {
  return <label className="onb-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}
function Input(props) { return <input className="onb-input" {...props}/>; }
function Select(props) { return <select className="onb-input" {...props}/>; }

export default function Onboarding() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const [profile, setProfile] = useState({ name: '', country: 'United Kingdom', currency: 'GBP', age_range: '25–34', tracker_type: 'individual', earning_members: 1, dependents: 0, financial_confidence: 'beginner' });
  const [incomeType, setIncomeType] = useState('salaried');
  const [incomeVar, setIncomeVar] = useState('fixed');
  const [incomes, setIncomes] = useState([{ name: PRIMARY_NAMES.salaried, amount: '', type: 'salary', primary: true }]);
  const [expenses, setExpenses] = useState(FIXED_DEFAULTS);
  const [savings, setSavings] = useState({ current: '', emergencyTarget: '', monthly: '', destinations: [] });
  const [assets, setAssets] = useState([]);
  const [assetValues, setAssetValues] = useState({});
  const [goals, setGoals] = useState([]);

  const sym = SYM[profile.currency] || `${profile.currency} `;
  const set = (k, v) => setProfile((p) => ({ ...p, [k]: v }));
  const totalIncome = useMemo(() => incomes.reduce((a, x) => a + Number(x.amount || 0), 0), [incomes]);
  const totalCosts = useMemo(() => expenses.reduce((a, x) => a + Number(x.amount || 0), 0), [expenses]);
  const estimatedMonthly = Math.max(0, totalIncome - totalCosts);
  const plannedMonthly = savings.monthly === '' ? estimatedMonthly : Math.max(0, Number(savings.monthly || 0));
  const actualInfoStep = step === 0 || step === 7 ? null : step;
  const pct = step === 0 ? 0 : Math.round((Math.min(step, 6) / 6) * 100);
  const canNext = step !== 1 || profile.name.trim().length > 0;

  const updateIncomeType = (type) => {
    setIncomeType(type);
    setIncomes((rows) => rows.map((r, i) => i === 0 ? { ...r, name: PRIMARY_NAMES[type], type: type === 'salaried' ? 'salary' : 'side' } : r));
  };
  const addIncome = (name) => {
    if (incomes.some((x) => x.name === name)) return;
    setIncomes([...incomes, { name, amount: '', type: name === 'Second salary' ? 'salary' : 'side', primary: false }]);
  };
  const removeIncome = (idx) => setIncomes(incomes.filter((_, i) => i !== idx));
  const toggleAsset = (name) => setAssets(assets.includes(name) ? assets.filter((x) => x !== name) : [...assets, name]);
  const toggleDestination = (d) => setSavings({ ...savings, destinations: savings.destinations.includes(d) ? savings.destinations.filter((x) => x !== d) : [...savings.destinations, d] });
  const toggleGoal = (type) => setGoals(goals.some((g) => g.goal_type === type) ? goals.filter((g) => g.goal_type !== type) : [...goals, { goal_type: type, goal_name: type, target_amount: '', current_amount: '', target_date: '', monthly_contribution: '' }]);

  const finish = async () => {
    setBusy(true); setErr('');
    try {
      const uid = user.id;
      const { error: pe } = await supabase.from('user_profiles').upsert({ user_id: uid, ...profile, income_type: incomeType, income_variability: incomeVar, onboarding_complete: true });
      if (pe) throw pe;

      const incomeRows = incomes.filter((i) => Number(i.amount) > 0).map((i) => ({ user_id: uid, name: i.name, amount: Number(i.amount), type: i.type }));
      if (incomeRows.length) {
        const { data: srcRows, error } = await supabase.from('income_sources').insert(incomeRows).select();
        if (error) throw error;
        const { error: recErr } = await supabase.from('income_records').insert((srcRows || []).map((r) => ({ user_id: uid, month, name: r.name, amount: r.amount, type: r.type, source_id: r.id })));
        if (recErr) throw recErr;
      }

      const expenseRows = expenses.filter((e) => Number(e.amount) > 0).map((e) => ({ user_id: uid, month, description: e.description, amount: Number(e.amount), type: 'fixed', recurring: true, category: e.category || 'fixed' }));
      if (expenseRows.length) { const { error } = await supabase.from('expenses').insert(expenseRows); if (error) throw error; }

      const allocRows = savings.destinations.map((d) => ({ user_id: uid, month, destination: d.toLowerCase().replace(/ /g, '_'), amount: savings.destinations.length ? plannedMonthly / savings.destinations.length : 0 }));
      if (allocRows.length) { const { error } = await supabase.from('savings_allocations').insert(allocRows); if (error) throw error; }

      const hasEF = goals.some((g) => g.goal_type === 'Emergency fund');
      const allGoals = Number(savings.emergencyTarget) > 0 && !hasEF ? [{ goal_name: 'Emergency fund', goal_type: 'Emergency fund', target_amount: savings.emergencyTarget, current_amount: savings.current || 0, monthly_contribution: 0, target_date: '' }, ...goals] : goals;
      const goalRows = allGoals.filter((g) => g.goal_name && Number(g.target_amount) > 0).map((g) => ({ user_id: uid, goal_name: g.goal_name, goal_type: g.goal_type || 'custom', target_amount: Number(g.target_amount), current_amount: Number(g.current_amount || 0), target_date: g.target_date || null, monthly_contribution: Number(g.monthly_contribution || 0) }));
      if (goalRows.length) { const { error } = await supabase.from('goals').insert(goalRows); if (error) throw error; }

      const brokerSel = assets.filter((a) => BROKER_TYPES.includes(a));
      if (brokerSel.length) {
        const { error } = await supabase.from('investment_snapshots').insert(brokerSel.map((a) => ({ user_id: uid, asset_type: a.toLowerCase().replace(/ /g, '_').replace('etfs', 'etf'), snapshot_date: new Date().toISOString().slice(0, 10), total_value: 0, currency: profile.currency, base_currency: profile.currency, converted_total: 0, fx_rate: 1, source: 'manual', notes: 'Placeholder — update by screenshot or manual entry.' })));
        if (error) throw error;
      }

      const wealthSel = assets.map((a) => WEALTH_TYPES.find(([l]) => l === a)).filter(Boolean);
      if (wealthSel.length) {
        const today = new Date().toISOString().slice(0, 10);
        const { data: created, error } = await supabase.from('assets').insert(wealthSel.map(([lName, cls, liq]) => ({ user_id: uid, name: lName, asset_class: cls, liquidity: liq, original_currency: profile.currency, original_value: Number(assetValues[lName] || 0), base_currency: profile.currency, converted_value: Number(assetValues[lName] || 0), fx_rate: 1, fx_date: today, valuation_date: today, valuation_source: 'manual estimate' }))).select();
        if (error) throw error;
        const valued = (created || []).filter((a) => Number(a.original_value) > 0);
        if (valued.length) await supabase.from('asset_valuations').insert(valued.map((a) => ({ asset_id: a.id, user_id: uid, original_currency: a.original_currency, original_value: a.original_value, base_currency: a.base_currency, converted_value: a.converted_value, fx_rate: 1, fx_date: today, valuation_date: today, source: 'manual estimate' })));
      }
      await refreshProfile();
      navigate('/app');
    } catch (e) { setErr(e.message || 'Something went wrong. Please try again.'); }
    finally { setBusy(false); }
  };

  const screens = [
    <section className="onb-intro" key="intro"><div><div className="t-label">MoneyMilo setup</div><h1>Let Milo understand your money life.</h1><p>Six short steps create your starting budget, wealth picture and goals. Rough estimates are completely fine, and everything stays editable.</p><button className="btn btn-primary btn-lg" onClick={() => setStep(1)}>Start my setup</button></div><MiloAvatar mode="core" size={320}/></section>,

    <section key="profile" className="onb-step"><div className="onb-step-head"><MiloLogo size={54}/><div><div className="t-label">About you</div><h1>Who is Milo helping?</h1><p>This personalises language, currency and the kind of plan Milo builds.</p></div></div><div className="onb-grid two"><Field label="First name"><Input value={profile.name} placeholder="Alex" autoFocus onChange={(e) => set('name', e.target.value)}/></Field><Field label="Country"><Input value={profile.country} onChange={(e) => set('country', e.target.value)}/></Field><Field label="Base currency"><Select value={profile.currency} onChange={(e) => set('currency', e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</Select></Field><Field label="Money confidence"><Select value={profile.financial_confidence} onChange={(e) => set('financial_confidence', e.target.value)}><option value="beginner">I am getting started</option><option value="intermediate">I understand the basics</option><option value="advanced">I am confident with money</option></Select></Field></div><div className="onb-coach"><MiloLogo size={38}/><span>Milo uses this only to make the experience clearer — it does not affect your calculations.</span></div></section>,

    <section key="income" className="onb-step"><div className="onb-step-head"><MiloAvatar mode="core" size={82}/><div><div className="t-label">Income</div><h1>What comes in each month?</h1><p>Add take-home income, not gross salary. The main source stays fixed so it cannot be accidentally renamed.</p></div></div><div className="onb-choice-row">{[['salaried','Salaried'],['self-employed','Self-employed'],['freelancer','Freelancer'],['business','Business owner'],['mixed','Mixed']].map(([v,l]) => <Choice key={v} active={incomeType === v} onClick={() => updateIncomeType(v)}>{l}</Choice>)}</div><div className="onb-income-list">{incomes.map((inc, i) => <div className="onb-income-row" key={`${inc.name}-${i}`}><div className="onb-static-source"><span>{inc.primary ? 'Primary source' : 'Additional source'}</span><strong>{inc.name}</strong></div><Field label={`Monthly amount (${sym})`}><Input type="number" min="0" placeholder="0" value={inc.amount} onChange={(e) => setIncomes(incomes.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))}/></Field>{!inc.primary && <button className="onb-remove" onClick={() => removeIncome(i)} aria-label={`Remove ${inc.name}`}>×</button>}</div>)}</div><div className="onb-add-row">{EXTRA_SOURCES.filter((n) => !incomes.some((x) => x.name === n)).map((n) => <Choice key={n} active={false} onClick={() => addIncome(n)}>+ {n}</Choice>)}</div><Field label="Income stability"><div className="onb-choice-row"><Choice active={incomeVar === 'fixed'} onClick={() => setIncomeVar('fixed')}>Mostly fixed</Choice><Choice active={incomeVar === 'variable'} onClick={() => setIncomeVar('variable')}>Changes month to month</Choice></div></Field><div className="onb-summary"><span>Estimated monthly income</span><strong>{money(totalIncome, sym)}</strong></div></section>,

    <section key="expenses" className="onb-step"><div className="onb-step-head"><MiloAvatar mode="core" size={82}/><div><div className="t-label">Regular spending</div><h1>What normally leaves each month?</h1><p>Fill only what applies. These become editable recurring expenses in your budget.</p></div></div><div className="onb-expense-grid">{expenses.map((ex, i) => <Field key={ex.description} label={ex.description}><Input type="number" min="0" placeholder="0" value={ex.amount} onChange={(e) => setExpenses(expenses.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))}/></Field>)}</div><div className="onb-summary"><span>Estimated regular spending</span><strong>{money(totalCosts, sym)}</strong></div></section>,

    <section key="savings" className="onb-step"><div className="onb-step-head"><MiloAvatar mode="goals" size={90}/><div><div className="t-label">Savings</div><h1>What is left — and where should it go?</h1><p>Milo estimates monthly saving from income minus regular costs. Adjust it only when your real saving is different.</p></div></div><div className="onb-savings-hero"><div><span>Estimated monthly saving</span><strong>{money(estimatedMonthly, sym)}</strong><small>{money(totalIncome, sym)} income − {money(totalCosts, sym)} regular costs</small></div><Field label="Use a different monthly estimate"><Input type="number" min="0" placeholder={String(estimatedMonthly)} value={savings.monthly} onChange={(e) => setSavings({ ...savings, monthly: e.target.value })}/><small>Leave blank to use Milo’s estimate.</small></Field></div><div className="onb-grid two"><Field label={`Savings already built (${sym})`}><Input type="number" min="0" placeholder="0" value={savings.current} onChange={(e) => setSavings({ ...savings, current: e.target.value })}/></Field><Field label={`Emergency fund target (${sym})`}><Input type="number" min="0" placeholder="e.g. 15000" value={savings.emergencyTarget} onChange={(e) => setSavings({ ...savings, emergencyTarget: e.target.value })}/></Field></div><Field label="Where do you usually put monthly savings?"><div className="onb-choice-row">{['Bank account', 'Emergency fund', 'Stocks', 'Mutual funds', 'Crypto', 'Property', 'Gold', 'Other'].map((d) => <Choice key={d} active={savings.destinations.includes(d)} onClick={() => toggleDestination(d)}>{d}</Choice>)}</div></Field></section>,

    <section key="assets" className="onb-step"><div className="onb-step-head"><MiloAvatar mode="ai" size={90}/><div><div className="t-label">Investments and wider wealth</div><h1>What do you own today?</h1><p>Select all that apply. Broker accounts can be updated later by screenshot or manual entry.</p></div></div><Field label="Broker investments"><div className="onb-choice-row">{BROKER_TYPES.map((a) => <Choice key={a} active={assets.includes(a)} onClick={() => toggleAsset(a)}>{a}</Choice>)}</div></Field><Field label="Property, gold and other wealth"><div className="onb-choice-row">{WEALTH_TYPES.map(([a]) => <Choice key={a} active={assets.includes(a)} onClick={() => toggleAsset(a)}>{a}</Choice>)}</div></Field>{assets.some((a) => WEALTH_TYPES.some(([l]) => l === a)) && <div className="onb-grid two onb-estimates">{assets.filter((a) => WEALTH_TYPES.some(([l]) => l === a)).map((a) => <Field key={a} label={`${a} estimate (${sym})`} hint="A rough current value is fine."><Input type="number" min="0" placeholder="Optional" value={assetValues[a] || ''} onChange={(e) => setAssetValues({ ...assetValues, [a]: e.target.value })}/></Field>)}</div>}</section>,

    <section key="goals" className="onb-step"><div className="onb-step-head"><MiloAvatar mode="goals" size={90}/><div><div className="t-label">Goals</div><h1>What should your money make possible?</h1><p>Choose goals and add only the details you know. Dates and contributions can be refined later.</p></div></div><div className="onb-choice-row">{GOAL_TYPES.map((g) => <Choice key={g} active={goals.some((x) => x.goal_type === g)} onClick={() => toggleGoal(g)}>{g}</Choice>)}</div><div className="onb-goal-list">{goals.map((g, i) => <article className="onb-goal-card" key={g.goal_type}><strong>{g.goal_name}</strong><div className="onb-grid two"><Field label={`Target (${sym})`}><Input type="number" min="0" value={g.target_amount} onChange={(e) => setGoals(goals.map((x, j) => j === i ? { ...x, target_amount: e.target.value } : x))}/></Field><Field label={`Already saved (${sym})`}><Input type="number" min="0" value={g.current_amount} onChange={(e) => setGoals(goals.map((x, j) => j === i ? { ...x, current_amount: e.target.value } : x))}/></Field><Field label={`Monthly contribution (${sym})`}><Input type="number" min="0" value={g.monthly_contribution} onChange={(e) => setGoals(goals.map((x, j) => j === i ? { ...x, monthly_contribution: e.target.value } : x))}/></Field><Field label="Target date"><Input type="date" value={g.target_date} onChange={(e) => setGoals(goals.map((x, j) => j === i ? { ...x, target_date: e.target.value } : x))}/></Field></div></article>)}</div></section>,

    <section key="done" className="onb-finish"><MiloAvatar mode="core" size={250}/><div><div className="t-label">Your starting picture is ready</div><h1>{profile.name ? `${profile.name}, Milo is ready.` : 'Milo is ready.'}</h1><p>Your income, regular spending, savings, investments and goals will now work together across every module.</p>{err && <div className="auth-error">{err}</div>}<button className="btn btn-primary btn-lg" onClick={finish} disabled={busy}>{busy ? 'Building your dashboard…' : 'Open my dashboard'}</button></div></section>,
  ];

  const interview = [
    { mode:'core', label:'Welcome', title:'Five minutes to a clearer financial picture.', body:'I’ll ask only what I need. Estimates are fine and every number stays editable.' },
    { mode:'core', label:'First, you', title:'Let’s make MoneyMilo feel like yours.', body:'Your name, country and confidence level help me explain money in the right language.' },
    { mode:'core', label:'Money in', title:'What normally arrives each month?', body:'Use take-home amounts. I’ll keep your primary source fixed so it cannot be renamed accidentally.' },
    { mode:'core', label:'Money out', title:'What does a normal month cost?', body:'Add recurring essentials first. You can refine categories and one-off spending later.' },
    { mode:'goals', label:'Your margin', title:'Now let’s see what is left to build with.', body:'I estimate savings from income minus regular costs, then you can correct it if real life differs.' },
    { mode:'ai', label:'Your wealth', title:'What have you already built?', body:'Broker investments, property, gold, pensions and cash belong in the same financial picture.' },
    { mode:'goals', label:'Your future', title:'What should your money make possible?', body:'A good target gives every monthly decision context. Add only the details you know today.' },
    { mode:'core', label:'Ready', title:'Your MoneyMilo home is ready.', body:'Budget, goals, wealth, projections, Ask Milo and learning now work from one connected picture.' },
  ][step];

  return <div className="onboarding-shell onboarding-v3">
    <aside className="onboarding-interview-v3">
      <div className="onboarding-side-brand"><MiloLogo size={46}/><span>Money<strong>Milo</strong></span></div>
      <div className="onboarding-side-copy"><span>{interview.label}</span><h2>{interview.title}</h2><p>{interview.body}</p></div>
      <div className="onboarding-side-milo"><MiloAvatar mode={interview.mode} size={260}/></div>
      {step > 0 && step < 7 && <div className="onboarding-live-summary">
        <div><span>Income</span><strong>{money(totalIncome, sym)}</strong></div>
        <div><span>Regular costs</span><strong>{money(totalCosts, sym)}</strong></div>
        <div><span>Estimated saving</span><strong>{money(estimatedMonthly, sym)}</strong></div>
      </div>}
      <div className="onboarding-privacy">Private by design · editable at any time</div>
    </aside>
    <section className="onboarding-main-v3">
      <header className="onboarding-brand"><div><MiloLogo size={44}/><span>Money<strong>Milo</strong></span></div>{actualInfoStep && <span>Step {actualInfoStep} of 6</span>}</header>
      <div className="onboarding-progress"><span style={{ width: `${pct}%` }}/></div>
      <main className="onboarding-card fade-up" key={step}>{screens[step]}</main>
      {step > 0 && step < TOTAL_STEPS - 1 && <footer className="onboarding-nav"><button className="btn btn-secondary" onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</button><button className="btn btn-primary" disabled={!canNext} onClick={() => { setErr(''); setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1)); }}>Continue</button></footer>}
    </section>
  </div>;
}
