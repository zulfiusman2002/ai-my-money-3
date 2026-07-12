import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { MiloAvatar, MiloLogo } from '../components/Milo';
import Icon from '../components/Icon';

const TOTAL_STEPS = 9;
const STEP_LABELS = ['Welcome','Profile','People','Income','Expenses','Monthly picture','Wealth','Goals','Review'];
const month = new Date().toISOString().slice(0, 7);
const CURRENCIES = ['GBP', 'USD', 'EUR', 'INR', 'AED', 'AUD', 'CAD'];
const SYM = { GBP: '£', USD: '$', EUR: '€', INR: '₹', AED: 'AED ', AUD: 'A$', CAD: 'C$' };
const BROKER_TYPES = ['Indian stocks', 'UK stocks', 'US stocks', 'Mutual funds', 'ETFs', 'Crypto', 'Bonds'];
const WEALTH_TYPES = [
  ['Property', 'property', 'illiquid'], ['Land', 'land', 'illiquid'], ['Gold', 'gold', 'liquid'],
  ['Pension', 'pension', 'illiquid'], ['Cash savings', 'cash', 'liquid'], ['Vehicle', 'vehicle', 'semi_liquid'], ['Business value', 'business', 'illiquid'], ['Other', 'other', 'semi_liquid'],
];
const GOAL_TYPES = ['Emergency fund', 'House deposit', 'Debt freedom', 'Retirement', 'Child education', 'Travel', 'Grow a business', 'Wealth target'];
const HOUSEHOLD_INCOME_TYPES = [
  ['Salary', 'salary'], ['Second job', 'second_job'], ['Freelance / contract', 'freelance'], ['Business salary', 'business_salary'],
  ['Business drawings', 'business_drawings'], ['Dividends', 'dividends'], ['Rental income', 'rental'], ['Pension', 'pension'],
  ['Benefits', 'benefits'], ['Bonus / commission', 'bonus'], ['Investment income', 'investment_income'], ['Other income', 'other'],
];
const BUSINESS_INCOME_TYPES = [
  ['Sales revenue', 'sales'], ['Service revenue', 'services'], ['Retainers', 'retainers'], ['Online sales', 'online_sales'],
  ['Rental / property revenue', 'rental'], ['Grants', 'grants'], ['Other business revenue', 'other'],
];
const HOUSEHOLD_EXPENSES = [
  ['Rent / mortgage', 'housing'], ['Council tax', 'housing'], ['Utilities', 'housing'], ['Groceries', 'food'],
  ['Transport', 'transport'], ['Childcare', 'family'], ['Insurance', 'fixed'], ['Debt repayments', 'debt'],
  ['Subscriptions', 'lifestyle'], ['Family support', 'family'], ['Health', 'health'], ['Other household cost', 'other'],
];
const BUSINESS_EXPENSES = [
  ['Business rent', 'business_rent'], ['Payroll', 'payroll'], ['Contractors', 'contractors'], ['Software', 'software'],
  ['Stock / inventory', 'inventory'], ['Equipment', 'equipment'], ['Marketing', 'marketing'], ['Professional services', 'professional_services'],
  ['Business travel', 'business_travel'], ['Business insurance', 'business_insurance'], ['Taxes', 'tax'], ['Business loan repayment', 'business_debt'],
];
const LIABILITY_TYPES = [['Mortgage', 'mortgage'], ['Personal loan', 'loan'], ['Car finance', 'car_finance'], ['Credit card', 'credit_card'], ['Business loan', 'business_loan'], ['Student loan', 'student_loan'], ['Other debt', 'other']];

const id = (prefix = 'row') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const money = (n, sym) => `${sym}${Math.max(0, Number(n || 0)).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
const monthlyAmount = (amount, frequency) => {
  const n = Number(amount || 0);
  if (frequency === 'weekly') return n * 52 / 12;
  if (frequency === 'fortnightly') return n * 26 / 12;
  if (frequency === 'quarterly') return n / 3;
  if (frequency === 'annual') return n / 12;
  return n;
};

function Choice({ active, children, onClick, icon }) {
  return <button type="button" className={`onb-choice${active ? ' active' : ''}`} onClick={onClick}>{icon && <Icon name={icon} size={16}/>} {children}</button>;
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

  const [profile, setProfile] = useState({
    name: '', country: 'United Kingdom', currency: 'GBP', age_range: '25–34', profile_scope: 'individual',
    tracker_type: 'individual', dependents: 0, financial_confidence: 'beginner', business_mode: 'none',
  });
  const [members, setMembers] = useState([{ localId: 'self', name: '', relationship: 'self', scope: 'household', isPrimary: true }]);
  const [business, setBusiness] = useState({ localId: 'business', name: 'My business', scope: 'business', relationship: 'owner', isPrimary: true });
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [savings, setSavings] = useState({ current: '', emergencyTarget: '', monthly: '', destinations: [] });
  const [assets, setAssets] = useState([]);
  const [assetValues, setAssetValues] = useState({});
  const [liabilities, setLiabilities] = useState([]);
  const [goals, setGoals] = useState([]);
  const [draftReady, setDraftReady] = useState(false);
  const [resumed, setResumed] = useState(false);
  const draftKey = `moneymilo_onboarding_draft_${user.id}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.profile) setProfile(d.profile);
        if (Array.isArray(d.members) && d.members.length) setMembers(d.members);
        if (d.business) setBusiness(d.business);
        if (Array.isArray(d.incomes)) setIncomes(d.incomes);
        if (Array.isArray(d.expenses)) setExpenses(d.expenses);
        if (d.savings) setSavings(d.savings);
        if (Array.isArray(d.assets)) setAssets(d.assets);
        if (d.assetValues) setAssetValues(d.assetValues);
        if (Array.isArray(d.liabilities)) setLiabilities(d.liabilities);
        if (Array.isArray(d.goals)) setGoals(d.goals);
        if (Number.isInteger(d.step) && d.step > 0 && d.step < TOTAL_STEPS) setStep(d.step);
        setResumed(true);
      }
    } catch { localStorage.removeItem(draftKey); }
    setDraftReady(true);
  }, [draftKey]);

  useEffect(() => {
    if (!draftReady || busy) return;
    const timer = setTimeout(() => {
      localStorage.setItem(draftKey, JSON.stringify({ step, profile, members, business, incomes, expenses, savings, assets, assetValues, liabilities, goals, savedAt: new Date().toISOString() }));
    }, 250);
    return () => clearTimeout(timer);
  }, [draftReady, busy, draftKey, step, profile, members, business, incomes, expenses, savings, assets, assetValues, liabilities, goals]);

  const resetDraft = () => {
    localStorage.removeItem(draftKey);
    window.location.reload();
  };

  const sym = SYM[profile.currency] || `${profile.currency} `;
  const set = (k, v) => setProfile((p) => ({ ...p, [k]: v }));
  const hasHousehold = profile.profile_scope !== 'business';
  const hasBusiness = profile.profile_scope === 'business' || profile.profile_scope === 'household_business';
  const isMultiPerson = profile.profile_scope === 'couple' || profile.profile_scope === 'household' || profile.profile_scope === 'household_business';
  const entities = useMemo(() => [...(hasHousehold ? members : []), ...(hasBusiness ? [business] : [])], [members, business, hasHousehold, hasBusiness]);

  const householdIncome = useMemo(() => incomes.filter((x) => x.scope === 'household').reduce((a, x) => a + monthlyAmount(x.amount, x.frequency), 0), [incomes]);
  const businessIncome = useMemo(() => incomes.filter((x) => x.scope === 'business').reduce((a, x) => a + monthlyAmount(x.amount, x.frequency), 0), [incomes]);
  const householdCosts = useMemo(() => expenses.filter((x) => x.scope === 'household').reduce((a, x) => a + monthlyAmount(x.amount, x.frequency), 0), [expenses]);
  const businessCosts = useMemo(() => expenses.filter((x) => x.scope === 'business').reduce((a, x) => a + monthlyAmount(x.amount, x.frequency), 0), [expenses]);
  const householdRemainder = householdIncome - householdCosts;
  const businessRemainder = businessIncome - businessCosts;
  const estimatedMonthly = Math.max(0, hasHousehold ? householdRemainder : businessRemainder);
  const plannedMonthly = savings.monthly === '' ? estimatedMonthly : Math.max(0, Number(savings.monthly || 0));
  const progress = step === 0 ? 0 : Math.round((Math.min(step, TOTAL_STEPS - 1) / (TOTAL_STEPS - 1)) * 100);
  const infoStep = step > 0 ? step : null;

  const updateScope = (scope) => {
    const tracker = scope === 'individual' ? 'individual' : scope === 'business' ? 'business' : 'family';
    setProfile((p) => ({ ...p, profile_scope: scope, tracker_type: tracker, business_mode: scope === 'business' ? 'business_only' : scope === 'household_business' ? 'both' : 'none' }));
    if (scope === 'couple' && members.length < 2) setMembers((rows) => [...rows, { localId: id('person'), name: '', relationship: 'partner', scope: 'household', isPrimary: false }]);
  };
  const updateMember = (localId, patch) => setMembers((rows) => rows.map((x) => x.localId === localId ? { ...x, ...patch } : x));
  const addMember = () => setMembers((rows) => [...rows, { localId: id('person'), name: '', relationship: rows.length === 1 ? 'partner' : 'household_member', scope: 'household', isPrimary: false }]);
  const removeMember = (localId) => {
    setMembers((rows) => rows.filter((x) => x.localId !== localId));
    setIncomes((rows) => rows.filter((x) => x.entityLocalId !== localId));
    setExpenses((rows) => rows.map((x) => x.entityLocalId === localId ? { ...x, entityLocalId: 'self' } : x));
  };
  const addIncome = (scope = hasHousehold ? 'household' : 'business', kind = scope === 'business' ? 'sales' : 'salary') => {
    const owner = scope === 'business' ? 'business' : members[0]?.localId || 'self';
    const sourceList = scope === 'business' ? BUSINESS_INCOME_TYPES : HOUSEHOLD_INCOME_TYPES;
    const title = sourceList.find((x) => x[1] === kind)?.[0] || 'Income source';
    setIncomes((rows) => [...rows, { localId: id('income'), entityLocalId: owner, scope, kind, name: title, amount: '', frequency: 'monthly', variability: 'fixed', amountBasis: scope === 'business' ? 'gross' : 'take_home' }]);
  };
  const updateIncome = (localId, patch) => setIncomes((rows) => rows.map((x) => x.localId === localId ? { ...x, ...patch } : x));
  const addExpense = (name, category, scope = 'household') => {
    if (expenses.some((x) => x.description === name && x.scope === scope)) return;
    setExpenses((rows) => [...rows, { localId: id('expense'), entityLocalId: scope === 'business' ? 'business' : members[0]?.localId || 'self', description: name, category, amount: '', frequency: 'monthly', type: 'fixed', essentiality: 'required', scope }]);
  };
  const updateExpense = (localId, patch) => setExpenses((rows) => rows.map((x) => x.localId === localId ? { ...x, ...patch } : x));
  const toggleAsset = (name) => setAssets((rows) => rows.includes(name) ? rows.filter((x) => x !== name) : [...rows, name]);
  const toggleDestination = (d) => setSavings((s) => ({ ...s, destinations: s.destinations.includes(d) ? s.destinations.filter((x) => x !== d) : [...s.destinations, d] }));
  const toggleGoal = (type) => setGoals((rows) => rows.some((g) => g.goal_type === type) ? rows.filter((g) => g.goal_type !== type) : [...rows, { goal_type: type, goal_name: type, target_amount: '', current_amount: '', target_date: '', monthly_contribution: '' }]);
  const addLiability = (label = 'Personal loan', type = 'loan') => setLiabilities((rows) => [...rows, { localId: id('liability'), name: label, type, amount: '', interest_rate: '', monthly_payment: '', scope: type === 'business_loan' ? 'business' : (hasHousehold ? 'household' : 'business'), entityLocalId: type === 'business_loan' ? 'business' : members[0]?.localId || 'self' }]);

  const validateStep = () => {
    if (step === 1 && !profile.name.trim()) return 'Tell Milo what to call you.';
    if (step === 2 && hasHousehold && members.some((m, i) => i === 0 && !m.name.trim())) return 'Add your name to the household.';
    if (step === 2 && hasBusiness && !business.name.trim()) return 'Add a name for the business.';
    if (step === 3 && incomes.some((x) => Number(x.amount || 0) < 0)) return 'Income amounts cannot be negative.';
    if (step === 4 && expenses.some((x) => Number(x.amount || 0) < 0)) return 'Expense amounts cannot be negative.';
    if (step === 6 && liabilities.some((x) => Number(x.amount || 0) < 0)) return 'Debt balances cannot be negative.';
    return '';
  };

  const finish = async () => {
    setBusy(true); setErr('');
    try {
      const uid = user.id;
      const primaryIncomeType = incomes.find((x) => x.scope === (hasHousehold ? 'household' : 'business'))?.kind || 'mixed';
      const incomeVariability = incomes.some((x) => x.variability === 'variable') ? 'variable' : 'fixed';
      const { error: pe } = await supabase.from('user_profiles').upsert({
        user_id: uid, ...profile, name: profile.name.trim(), earning_members: members.length,
        income_type: primaryIncomeType, income_variability: incomeVariability, onboarding_complete: true,
      });
      if (pe) throw pe;

      const entityPayload = entities.map((e) => ({ user_id: uid, name: e.name.trim() || (e.localId === 'self' ? profile.name.trim() : 'Unnamed'), entity_type: e.scope === 'business' ? 'business' : 'person', scope: e.scope, relationship: e.relationship, is_primary: e.isPrimary }));
      const { data: createdEntities, error: ee } = await supabase.from('financial_entities').insert(entityPayload).select();
      if (ee) throw new Error(`${ee.message}. Run supabase/phase-4-1.sql before testing this onboarding.`);
      const entityMap = new Map();
      entities.forEach((e, index) => entityMap.set(e.localId, createdEntities?.[index]?.id || null));

      const incomeRows = incomes.filter((x) => Number(x.amount) > 0).map((x) => ({
        user_id: uid, name: x.name.trim() || 'Income source', amount: monthlyAmount(x.amount, x.frequency), frequency: x.frequency,
        type: ['salary', 'second_job'].includes(x.kind) ? 'salary' : x.scope === 'business' ? 'business' : 'side',
        income_kind: x.kind, amount_basis: x.amountBasis, variability: x.variability, scope: x.scope, entity_id: entityMap.get(x.entityLocalId),
      }));
      if (incomeRows.length) {
        const { data: srcRows, error } = await supabase.from('income_sources').insert(incomeRows).select();
        if (error) throw error;
        const { error: recErr } = await supabase.from('income_records').insert((srcRows || []).map((r) => ({ user_id: uid, month, name: r.name, amount: r.amount, type: r.type, source_id: r.id, scope: r.scope || 'household', entity_id: r.entity_id })));
        if (recErr) throw recErr;
      }

      const expenseRows = expenses.filter((x) => Number(x.amount) > 0).map((x) => ({
        user_id: uid, month, description: x.description.trim() || 'Expense', amount: monthlyAmount(x.amount, x.frequency),
        type: x.type || 'fixed', recurring: x.type !== 'one-time', category: x.category || 'other', frequency: x.frequency,
        essentiality: x.essentiality, scope: x.scope, entity_id: entityMap.get(x.entityLocalId),
      }));
      if (expenseRows.length) { const { error } = await supabase.from('expenses').insert(expenseRows); if (error) throw error; }

      const defaultScope = hasHousehold ? 'household' : 'business';
      const allocRows = defaultScope === 'household' ? savings.destinations.map((d) => ({ user_id: uid, month, destination: d.toLowerCase().replace(/ /g, '_'), amount: savings.destinations.length ? plannedMonthly / savings.destinations.length : 0 })) : [];
      if (allocRows.length) { const { error } = await supabase.from('savings_allocations').insert(allocRows); if (error) throw error; }

      const liabilityRows = liabilities.filter((x) => Number(x.amount) > 0).map((x) => ({
        user_id: uid, name: x.name, amount: Number(x.amount), interest_rate: Number(x.interest_rate || 0), monthly_payment: Number(x.monthly_payment || 0), type: x.type, scope: x.scope, entity_id: entityMap.get(x.entityLocalId),
      }));
      if (liabilityRows.length) { const { error } = await supabase.from('liabilities').insert(liabilityRows); if (error) throw error; }

      const hasEF = goals.some((g) => g.goal_type === 'Emergency fund');
      const allGoals = Number(savings.emergencyTarget) > 0 && !hasEF ? [{ goal_name: 'Emergency fund', goal_type: 'Emergency fund', target_amount: savings.emergencyTarget, current_amount: savings.current || 0, monthly_contribution: 0, target_date: '' }, ...goals] : goals;
      const goalRows = allGoals.filter((g) => g.goal_name && Number(g.target_amount) > 0).map((g) => ({ user_id: uid, goal_name: g.goal_name, goal_type: g.goal_type || 'custom', target_amount: Number(g.target_amount), current_amount: Number(g.current_amount || 0), target_date: g.target_date || null, monthly_contribution: Number(g.monthly_contribution || 0) }));
      if (goalRows.length) { const { error } = await supabase.from('goals').insert(goalRows); if (error) throw error; }

      const brokerSel = assets.filter((a) => BROKER_TYPES.includes(a));
      if (brokerSel.length) {
        const { error } = await supabase.from('investment_snapshots').insert(brokerSel.map((a) => ({ user_id: uid, asset_type: a.toLowerCase().replace(/ /g, '_').replace('etfs', 'etf'), snapshot_date: new Date().toISOString().slice(0, 10), total_value: 0, currency: profile.currency, base_currency: profile.currency, converted_total: 0, fx_rate: 1, source: 'manual', notes: 'Placeholder — update by screenshot or manual entry.' })));
        if (error) throw error;
      }
      const wealthSel = assets.map((a) => WEALTH_TYPES.find(([label]) => label === a)).filter(Boolean);
      if (wealthSel.length) {
        const today = new Date().toISOString().slice(0, 10);
        const { data: created, error } = await supabase.from('assets').insert(wealthSel.map(([name, assetClass, liquidity]) => ({ user_id: uid, name, asset_class: assetClass, liquidity, original_currency: profile.currency, original_value: Number(assetValues[name] || 0), base_currency: profile.currency, converted_value: Number(assetValues[name] || 0), fx_rate: 1, fx_date: today, valuation_date: today, valuation_source: 'manual estimate' }))).select();
        if (error) throw error;
        const valued = (created || []).filter((a) => Number(a.original_value) > 0);
        if (valued.length) await supabase.from('asset_valuations').insert(valued.map((a) => ({ asset_id: a.id, user_id: uid, original_currency: a.original_currency, original_value: a.original_value, base_currency: a.base_currency, converted_value: a.converted_value, fx_rate: 1, fx_date: today, valuation_date: today, source: 'manual estimate' })));
      }
      await refreshProfile();
      localStorage.removeItem(draftKey);
      navigate('/app', { replace: true });
    } catch (e) { setErr(e.message || 'Something went wrong. Please try again.'); }
    finally { setBusy(false); }
  };

  const screens = [
    <section className="onb-intro onb-v41-intro" key="intro"><div><div className="t-label">MoneyMilo setup</div><h1>Tell Milo about your money life — not a generic employment box.</h1><p>Add one person, a couple, a household, a business, or both. Milo adapts the questions and keeps personal and business money separate.</p>{resumed&&<div className="onb-resume-note">Milo restored your saved setup draft.</div>}<div className="onb-intro-actions"><button className="btn btn-primary btn-lg" onClick={() => setStep(1)}>{resumed?'Continue setup':'Start with Milo'}</button>{resumed&&<button className="btn btn-secondary" onClick={resetDraft}>Start again</button>}</div></div><MiloAvatar mode="core" size={360} motion="wave" glow/></section>,

    <section key="scope" className="onb-step"><div className="onb-step-head"><MiloAvatar mode="core" size={120} motion="wave"/><div><div className="t-label">Your starting point</div><h1>Who should Milo understand?</h1><p>Choose the financial picture you want to build. You can add or remove people later.</p></div></div><Field label="What should MoneyMilo track?"><div className="onb-profile-grid">
      {[
        ['individual','Just me','One person and their money'],['couple','Me and my partner','Two incomes, shared or personal costs'],['household','My household','Several earners or dependants'],['business','My business','Revenue, costs and business position'],['household_business','Household and business','Keep both separate, understand the connection'],
      ].map(([value,title,desc])=><button type="button" key={value} className={`onb-profile-card${profile.profile_scope===value?' active':''}`} onClick={()=>updateScope(value)}><strong>{title}</strong><span>{desc}</span><i>✓</i></button>)}
    </div></Field><div className="onb-grid two"><Field label="What should Milo call you?"><Input value={profile.name} placeholder="Your first name" onChange={(e)=>{set('name',e.target.value); updateMember('self',{name:e.target.value});}}/></Field><Field label="Main currency"><Select value={profile.currency} onChange={(e)=>set('currency',e.target.value)}>{CURRENCIES.map((c)=><option key={c}>{c}</option>)}</Select></Field><Field label="Country"><Input value={profile.country} onChange={(e)=>set('country',e.target.value)}/></Field><Field label="Money confidence"><Select value={profile.financial_confidence} onChange={(e)=>set('financial_confidence',e.target.value)}><option value="beginner">I want simple explanations</option><option value="intermediate">I know the basics</option><option value="advanced">I’m comfortable with detail</option></Select></Field></div></section>,

    <section key="people" className="onb-step"><div className="onb-step-head"><MiloAvatar mode={hasBusiness ? 'builder' : 'core'} size={120} motion="point"/><div><div className="t-label">People and organisations</div><h1>{hasBusiness && hasHousehold ? 'Build the household and business separately.' : hasBusiness ? 'Tell Milo about the business.' : 'Who belongs in this money picture?'}</h1><p>Every income and expense can be assigned to the right person or business, so totals stay understandable.</p></div></div>{hasHousehold && <div className="onb-entity-list">{members.map((m,index)=><article className="onb-entity-card" key={m.localId}><div className="entity-avatar">{(m.name||profile.name||'?')[0].toUpperCase()}</div><div className="onb-grid two"><Field label={index===0?'Your name':'Member name'}><Input value={m.name} placeholder={index===0?'Your name':'Partner or household member'} onChange={(e)=>updateMember(m.localId,{name:e.target.value})}/></Field><Field label="Relationship"><Select value={m.relationship} onChange={(e)=>updateMember(m.localId,{relationship:e.target.value})}><option value="self">Me</option><option value="partner">Partner</option><option value="household_member">Household member</option><option value="dependant">Dependant</option></Select></Field></div>{index>0&&<button type="button" className="onb-remove" onClick={()=>removeMember(m.localId)}>×</button>}</article>)}</div>}
      {isMultiPerson && <button type="button" className="onb-add-card" onClick={addMember}><span>+</span><div><strong>Add another household member</strong><small>Useful for multiple earners or shared expenses</small></div></button>}
      {hasBusiness && <article className="onb-business-card"><MiloAvatar mode="builder" size={140}/><div className="onb-grid two"><Field label="Business name"><Input value={business.name} onChange={(e)=>setBusiness({...business,name:e.target.value})}/></Field><Field label="How should Milo treat it?"><Select value={profile.business_mode} onChange={(e)=>set('business_mode',e.target.value)}><option value={profile.profile_scope==='business'?'business_only':'both'}>{profile.profile_scope==='business'?'Track the business':'Track household and business separately'}</option>{hasHousehold&&<option value="personal_only">Only track what I take home</option>}</Select></Field></div><p>Business revenue will not be counted again as household income. Salary, drawings or dividends paid to you belong in the household scope.</p></article>}
    </section>,

    <section key="income" className="onb-step"><div className="onb-step-head"><MiloAvatar mode="builder" size={125} motion="point"/><div><div className="t-label">Money coming in</div><h1>Add every income source that matters.</h1><p>Two jobs, two people, rental income or business revenue all work. Milo converts weekly and annual figures into a monthly estimate.</p></div></div>
      <div className="onb-scope-summary">{hasHousehold&&<div><span>Household income</span><strong>{money(householdIncome,sym)}</strong></div>}{hasBusiness&&profile.business_mode!=='personal_only'&&<div><span>Business revenue</span><strong>{money(businessIncome,sym)}</strong></div>}</div>
      <div className="onb-ledger-list">{incomes.map((inc)=><article className={`onb-ledger-card scope-${inc.scope}`} key={inc.localId}><header><span>{inc.scope==='business'?'Business revenue':'Household income'}</span><button type="button" onClick={()=>setIncomes((r)=>r.filter((x)=>x.localId!==inc.localId))}>Remove</button></header><div className="onb-grid three"><Field label="Source type"><Select value={inc.kind} onChange={(e)=>{const list=inc.scope==='business'?BUSINESS_INCOME_TYPES:HOUSEHOLD_INCOME_TYPES; updateIncome(inc.localId,{kind:e.target.value,name:list.find((x)=>x[1]===e.target.value)?.[0]||inc.name});}}>{(inc.scope==='business'?BUSINESS_INCOME_TYPES:HOUSEHOLD_INCOME_TYPES).map(([l,v])=><option value={v} key={v}>{l}</option>)}</Select></Field><Field label="Description"><Input value={inc.name} onChange={(e)=>updateIncome(inc.localId,{name:e.target.value})}/></Field>{inc.scope==='household'&&<Field label="Received by"><Select value={inc.entityLocalId} onChange={(e)=>updateIncome(inc.localId,{entityLocalId:e.target.value})}>{members.map((m)=><option key={m.localId} value={m.localId}>{m.name||'Household member'}</option>)}</Select></Field>}<Field label={`Amount (${sym})`}><Input type="number" min="0" value={inc.amount} placeholder="0" onChange={(e)=>updateIncome(inc.localId,{amount:e.target.value})}/></Field><Field label="Frequency"><Select value={inc.frequency} onChange={(e)=>updateIncome(inc.localId,{frequency:e.target.value})}><option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="fortnightly">Every two weeks</option><option value="quarterly">Quarterly</option><option value="annual">Annual</option><option value="irregular">Monthly average / irregular</option></Select></Field><Field label="Pattern"><Select value={inc.variability} onChange={(e)=>updateIncome(inc.localId,{variability:e.target.value})}><option value="fixed">Mostly fixed</option><option value="variable">Changes month to month</option></Select></Field></div><footer><span>Monthly estimate</span><strong>{money(monthlyAmount(inc.amount,inc.frequency),sym)}</strong></footer></article>)}</div>
      <div className="onb-add-actions">{hasHousehold&&<button className="onb-add-card" type="button" onClick={()=>addIncome('household')}><span>+</span><div><strong>Add household income</strong><small>Salary, second job, rental, dividends or freelance work</small></div></button>}{hasBusiness&&profile.business_mode!=='personal_only'&&<button className="onb-add-card business" type="button" onClick={()=>addIncome('business')}><span>+</span><div><strong>Add business revenue</strong><small>Sales, services, retainers or other business income</small></div></button>}</div>
      {!incomes.length&&<div className="onb-empty-callout"><strong>Start with the income you rely on most.</strong><p>You can add as many sources as your household or business needs.</p></div>}
    </section>,

    <section key="expenses" className="onb-step"><div className="onb-step-head"><MiloAvatar mode="builder" size={125} motion="point"/><div><div className="t-label">Money going out</div><h1>Add normal costs, not every receipt.</h1><p>Choose useful suggestions or create your own. Household and business costs stay in separate totals.</p></div></div>
      {hasHousehold&&<div className="onb-suggestion-block"><header><div><strong>Household suggestions</strong><small>Rent, groceries, transport and other personal costs</small></div><span>{money(householdCosts,sym)}/month</span></header><div className="onb-choice-row">{HOUSEHOLD_EXPENSES.filter(([name])=>!expenses.some((x)=>x.description===name&&x.scope==='household')).map(([name,cat])=><Choice key={name} onClick={()=>addExpense(name,cat,'household')}>+ {name}</Choice>)}</div></div>}
      {hasBusiness&&profile.business_mode!=='personal_only'&&<div className="onb-suggestion-block business"><header><div><strong>Business suggestions</strong><small>Operating expenses kept outside the household budget</small></div><span>{money(businessCosts,sym)}/month</span></header><div className="onb-choice-row">{BUSINESS_EXPENSES.filter(([name])=>!expenses.some((x)=>x.description===name&&x.scope==='business')).map(([name,cat])=><Choice key={name} onClick={()=>addExpense(name,cat,'business')}>+ {name}</Choice>)}</div></div>}
      <div className="onb-ledger-list">{expenses.map((ex)=><article className={`onb-ledger-card expense scope-${ex.scope}`} key={ex.localId}><header><span>{ex.scope==='business'?'Business expense':'Household expense'}</span><button type="button" onClick={()=>setExpenses((r)=>r.filter((x)=>x.localId!==ex.localId))}>Remove</button></header><div className="onb-grid three"><Field label="Expense"><Input value={ex.description} onChange={(e)=>updateExpense(ex.localId,{description:e.target.value})}/></Field><Field label={`Amount (${sym})`}><Input type="number" min="0" value={ex.amount} onChange={(e)=>updateExpense(ex.localId,{amount:e.target.value})}/></Field><Field label="Frequency"><Select value={ex.frequency} onChange={(e)=>updateExpense(ex.localId,{frequency:e.target.value})}><option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="fortnightly">Every two weeks</option><option value="quarterly">Quarterly</option><option value="annual">Annual</option><option value="irregular">Monthly average / irregular</option></Select></Field><Field label="Cost behaviour"><Select value={ex.type} onChange={(e)=>updateExpense(ex.localId,{type:e.target.value})}><option value="fixed">Fixed / recurring</option><option value="variable">Variable</option><option value="one-time">One-time</option></Select></Field><Field label="Importance"><Select value={ex.essentiality} onChange={(e)=>updateExpense(ex.localId,{essentiality:e.target.value})}><option value="required">Required</option><option value="flexible">Flexible</option><option value="optional">Optional</option></Select></Field>{ex.scope==='household'&&<Field label="Paid for / by"><Select value={ex.entityLocalId} onChange={(e)=>updateExpense(ex.localId,{entityLocalId:e.target.value})}>{members.map((m)=><option key={m.localId} value={m.localId}>{m.name||'Household'}</option>)}</Select></Field>}</div><footer><span>Monthly estimate</span><strong>{money(monthlyAmount(ex.amount,ex.frequency),sym)}</strong></footer></article>)}</div>
    </section>,

    <section key="position" className="onb-step"><div className="onb-step-head"><MiloAvatar mode="scientist" size={130} motion="think"/><div><div className="t-label">Your estimated monthly position</div><h1>Does this look like real life?</h1><p>Milo calculates the difference. A remainder is not automatically savings — it is the amount available before irregular spending and transfers.</p></div></div><div className="onb-position-grid">{hasHousehold&&<article><span>Household</span><div><small>Income</small><strong>{money(householdIncome,sym)}</strong></div><div><small>Regular expenses</small><strong>− {money(householdCosts,sym)}</strong></div><footer className={householdRemainder>=0?'positive':'negative'}><small>Estimated remainder</small><strong>{householdRemainder<0?'− ':''}{money(Math.abs(householdRemainder),sym)}</strong></footer></article>}{hasBusiness&&profile.business_mode!=='personal_only'&&<article className="business"><span>Business</span><div><small>Revenue</small><strong>{money(businessIncome,sym)}</strong></div><div><small>Operating expenses</small><strong>− {money(businessCosts,sym)}</strong></div><footer className={businessRemainder>=0?'positive':'negative'}><small>Estimated operating remainder</small><strong>{businessRemainder<0?'− ':''}{money(Math.abs(businessRemainder),sym)}</strong></footer></article>}</div>
      {hasHousehold&&<><div className="onb-savings-hero"><div><span>Milo’s estimated monthly saving capacity</span><strong>{money(Math.max(0,householdRemainder),sym)}</strong><small>Based on household income minus the regular costs entered above</small></div><Field label="Use a different realistic estimate"><Input type="number" min="0" placeholder={String(Math.max(0,householdRemainder))} value={savings.monthly} onChange={(e)=>setSavings({...savings,monthly:e.target.value})}/><small>Leave blank to use Milo’s estimate.</small></Field></div><div className="onb-grid two"><Field label={`Cash savings already built (${sym})`}><Input type="number" min="0" value={savings.current} onChange={(e)=>setSavings({...savings,current:e.target.value})}/></Field><Field label={`Emergency fund target (${sym})`}><Input type="number" min="0" value={savings.emergencyTarget} onChange={(e)=>setSavings({...savings,emergencyTarget:e.target.value})}/></Field></div><Field label="Where do you normally direct savings?"><div className="onb-choice-row">{['Bank account','Emergency fund','Stocks','Mutual funds','Crypto','Property','Gold','Other'].map((d)=><Choice key={d} active={savings.destinations.includes(d)} onClick={()=>toggleDestination(d)}>{d}</Choice>)}</div></Field></>}
    </section>,

    <section key="wealth" className="onb-step"><div className="onb-step-head"><MiloAvatar mode="investor" size={130} motion="point"/><div><div className="t-label">What you own and owe</div><h1>Build the starting balance sheet.</h1><p>Rough values are fine. Broker portfolios can be updated later using a screenshot or manual entry.</p></div></div><Field label="Broker investments"><div className="onb-choice-row">{BROKER_TYPES.map((a)=><Choice key={a} active={assets.includes(a)} onClick={()=>toggleAsset(a)}>{a}</Choice>)}</div></Field><Field label="Property, cash and wider wealth"><div className="onb-choice-row">{WEALTH_TYPES.map(([a])=><Choice key={a} active={assets.includes(a)} onClick={()=>toggleAsset(a)}>{a}</Choice>)}</div></Field>{assets.some((a)=>WEALTH_TYPES.some(([l])=>l===a))&&<div className="onb-grid three onb-estimates">{assets.filter((a)=>WEALTH_TYPES.some(([l])=>l===a)).map((a)=><Field key={a} label={`${a} estimate (${sym})`}><Input type="number" min="0" placeholder="Optional" value={assetValues[a]||''} onChange={(e)=>setAssetValues({...assetValues,[a]:e.target.value})}/></Field>)}</div>}
      <div className="onb-subsection-head"><div><strong>Debts and commitments</strong><small>Add balances that should reduce net worth.</small></div></div><div className="onb-choice-row">{LIABILITY_TYPES.map(([l,t])=><Choice key={t} onClick={()=>addLiability(l,t)}>+ {l}</Choice>)}</div><div className="onb-ledger-list">{liabilities.map((l)=><article className={`onb-ledger-card scope-${l.scope}`} key={l.localId}><header><span>{l.scope==='business'?'Business liability':'Household liability'}</span><button type="button" onClick={()=>setLiabilities((r)=>r.filter((x)=>x.localId!==l.localId))}>Remove</button></header><div className="onb-grid three"><Field label="Name"><Input value={l.name} onChange={(e)=>setLiabilities((r)=>r.map((x)=>x.localId===l.localId?{...x,name:e.target.value}:x))}/></Field><Field label={`Balance (${sym})`}><Input type="number" min="0" value={l.amount} onChange={(e)=>setLiabilities((r)=>r.map((x)=>x.localId===l.localId?{...x,amount:e.target.value}:x))}/></Field><Field label={`Monthly payment (${sym})`}><Input type="number" min="0" value={l.monthly_payment} onChange={(e)=>setLiabilities((r)=>r.map((x)=>x.localId===l.localId?{...x,monthly_payment:e.target.value}:x))}/></Field></div></article>)}</div>
    </section>,

    <section key="goals" className="onb-step"><div className="onb-step-head"><MiloAvatar mode="goals" size={140} motion="point"/><div><div className="t-label">What comes next</div><h1>What should Milo help you achieve first?</h1><p>Choose only the goals that matter now. Your dashboard will use them to make spending and savings more meaningful.</p></div></div><div className="onb-choice-row">{GOAL_TYPES.map((g)=><Choice key={g} active={goals.some((x)=>x.goal_type===g)} onClick={()=>toggleGoal(g)}>{g}</Choice>)}</div><div className="onb-goal-list">{goals.map((g,i)=><article className="onb-goal-card" key={g.goal_type}><strong>{g.goal_name}</strong><div className="onb-grid two"><Field label={`Target (${sym})`}><Input type="number" min="0" value={g.target_amount} onChange={(e)=>setGoals(goals.map((x,j)=>j===i?{...x,target_amount:e.target.value}:x))}/></Field><Field label={`Already saved (${sym})`}><Input type="number" min="0" value={g.current_amount} onChange={(e)=>setGoals(goals.map((x,j)=>j===i?{...x,current_amount:e.target.value}:x))}/></Field><Field label={`Monthly contribution (${sym})`}><Input type="number" min="0" value={g.monthly_contribution} onChange={(e)=>setGoals(goals.map((x,j)=>j===i?{...x,monthly_contribution:e.target.value}:x))}/></Field><Field label="Target date"><Input type="date" value={g.target_date} onChange={(e)=>setGoals(goals.map((x,j)=>j===i?{...x,target_date:e.target.value}:x))}/></Field></div></article>)}</div></section>,

    <section key="review" className="onb-review"><div className="onb-step-head"><MiloAvatar mode="core" size={150} motion="celebrate" glow/><div><div className="t-label">Review with Milo</div><h1>Here is the financial picture I will start with.</h1><p>Check the totals before Milo creates your dashboard. Every item remains editable afterwards.</p></div></div><div className="onb-review-grid"><article><span>Profile</span><strong>{profile.profile_scope.replace(/_/g,' ')}</strong><small>{members.length} household member{members.length===1?'':'s'}{hasBusiness?` · ${business.name}`:''}</small></article>{hasHousehold&&<><article><span>Household income</span><strong>{money(householdIncome,sym)}</strong><small>{incomes.filter((x)=>x.scope==='household').length} source(s)</small></article><article><span>Household costs</span><strong>{money(householdCosts,sym)}</strong><small>{expenses.filter((x)=>x.scope==='household').length} regular cost(s)</small></article><article className={householdRemainder>=0?'positive':'negative'}><span>Estimated remainder</span><strong>{householdRemainder<0?'− ':''}{money(Math.abs(householdRemainder),sym)}</strong><small>Before irregular spending</small></article></>}{hasBusiness&&profile.business_mode!=='personal_only'&&<><article><span>Business revenue</span><strong>{money(businessIncome,sym)}</strong><small>Kept separate from household income</small></article><article><span>Business expenses</span><strong>{money(businessCosts,sym)}</strong><small>{expenses.filter((x)=>x.scope==='business').length} operating cost(s)</small></article></>}<article><span>Assets selected</span><strong>{assets.length}</strong><small>Investments and wider wealth</small></article><article><span>Goals selected</span><strong>{goals.length}</strong><small>{goals[0]?.goal_name||'Can be added later'}</small></article></div>{err&&<div className="auth-error">{err}</div>}<div className="onb-review-actions"><button className="btn btn-secondary" onClick={()=>setStep(1)}>Edit profile</button><button className="btn btn-primary btn-lg" onClick={finish} disabled={busy}>{busy?'Building your dashboard…':'Create my MoneyMilo home'}</button></div></section>,
  ];

  const interview = [
    { mode:'core', label:'Welcome', title:'Your money life is not a drop-down.', body:'I’ll adapt to one person, a household, a business or both.' },
    { mode:'core', label:'Your picture', title:'First, choose who I should understand.', body:'This decides which questions appear and keeps irrelevant fields out of the way.' },
    { mode:hasBusiness?'builder':'core', label:'People and organisations', title:'Assign money to the right owner.', body:'Household members and businesses stay clearly separated.' },
    { mode:'builder', label:'Money in', title:'Every source can have a different owner and rhythm.', body:'Weekly, annual and irregular amounts are converted into a monthly estimate.' },
    { mode:'builder', label:'Money out', title:'Use personal or business expense suggestions.', body:'Add only the normal costs that shape a typical month.' },
    { mode:'scientist', label:'The monthly picture', title:'Income minus regular costs is a starting estimate.', body:'I call it a remainder until you confirm how much is genuinely saved.' },
    { mode:'investor', label:'Balance sheet', title:'Add what you own and what you owe.', body:'This creates a more complete net-worth picture from day one.' },
    { mode:'goals', label:'Direction', title:'Give your money a destination.', body:'Goals help me explain every future recommendation in context.' },
    { mode:'core', label:'Review', title:'One last check before your dashboard.', body:'Household and business totals are shown separately to prevent double counting.' },
  ][step];

  const goNext = () => {
    const validation = validateStep();
    if (validation) { setErr(validation); return; }
    setErr(''); setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  };

  return <div className="onboarding-shell onboarding-v3 onboarding-v41">
    <aside className="onboarding-interview-v3">
      <div className="onboarding-side-brand"><MiloLogo size={64}/><span>Money<strong>Milo</strong></span></div>
      <div className="onboarding-side-copy"><span>{interview.label}</span><h2>{interview.title}</h2><p>{interview.body}</p></div>
      <div className="onboarding-side-milo"><MiloAvatar mode={interview.mode} size={330} motion={step===8?'celebrate':'idle'} glow/></div>
      {step > 0 && step < TOTAL_STEPS - 1 && <div className="onboarding-live-summary">
        {hasHousehold&&<><div><span>Household income</span><strong>{money(householdIncome,sym)}</strong></div><div><span>Household costs</span><strong>{money(householdCosts,sym)}</strong></div><div><span>Monthly remainder</span><strong>{householdRemainder<0?'− ':''}{money(Math.abs(householdRemainder),sym)}</strong></div></>}
        {hasBusiness&&profile.business_mode!=='personal_only'&&<div><span>Business position</span><strong>{businessRemainder<0?'− ':''}{money(Math.abs(businessRemainder),sym)}</strong></div>}
      </div>}
      <div className="onboarding-privacy">Private by design · editable at any time</div>
    </aside>
    <section className="onboarding-main-v3">
      <header className="onboarding-brand"><div><MiloLogo size={58}/><span>Money<strong>Milo</strong></span></div>{infoStep&&<span>Step {infoStep} of {TOTAL_STEPS-1}</span>}</header>
      <div className="onboarding-progress"><span style={{width:`${progress}%`}}/></div>
      {step>0&&<div className="onboarding-stepper-v1">{STEP_LABELS.slice(1).map((label,i)=><button type="button" key={label} className={step===i+1?'active':step>i+1?'done':''} onClick={()=>{if(i+1<step)setStep(i+1);}} disabled={i+1>step}><b>{step>i+1?'✓':i+1}</b><span>{label}</span></button>)}</div>}
      <main className="onboarding-card fade-up" key={step}>{screens[step]}</main>
      {err&&step!==TOTAL_STEPS-1&&<div className="onb-inline-error">{err}</div>}
      {step > 0 && step < TOTAL_STEPS - 1 && <footer className="onboarding-nav"><button className="btn btn-secondary" onClick={()=>{setErr('');setStep((s)=>Math.max(0,s-1));}}>Back</button><span className="onboarding-autosave">Draft saved automatically</span><button className="btn btn-primary" onClick={goNext}>{[5,6,7].includes(step)?'Continue — I can edit later':'Continue'}</button></footer>}
    </section>
  </div>;
}
