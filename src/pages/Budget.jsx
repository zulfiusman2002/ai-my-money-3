import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { fmtMoney, symFor } from '../lib/wealth';
import { getMonthlyIncome, materialiseIncome } from '../lib/income';
import { resolveFinancialMonth } from '../lib/financialSummary';
import { PageIntro } from '../components/Milo';
import {
  ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, Cell,
  RadialBarChart, RadialBar, PolarAngleAxis, PieChart, Pie, Legend, CartesianGrid,
} from 'recharts';

const CATEGORIES = ['housing', 'food', 'transport', 'family', 'lifestyle', 'health', 'debt', 'other'];
const TYPES = ['fixed', 'variable', 'one-time'];
const DESTS = ['emergency_fund', 'bank', 'stocks', 'mutual_funds', 'crypto', 'gold', 'property', 'other'];
const thisMonth = () => new Date().toISOString().slice(0, 7);
const shiftMonth = (m, d) => { const [y, mo] = m.split('-').map(Number); const dt = new Date(y, mo - 1 + d, 1); return dt.toISOString().slice(0, 7); };
const monthName = (m) => new Date(m + '-02').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

// Custom money-flow diagram — works on all screen sizes
function MoneyFlow({ income, fixed, variable, oneOff, savings, sym, f }) {
  const total = Math.max(income, 1);
  const bars = [
    { label: 'Fixed costs', value: fixed, color: '#7657F5' },
    { label: 'Variable', value: variable, color: '#65A8FF' },
    { label: 'One-off', value: oneOff, color: 'var(--c-amber)' },
    { label: 'Saved', value: savings, color: 'var(--c-green)' },
  ].filter((b) => b.value > 0);
  return (
    <div>
      {/* Income row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ width: 90, fontSize: '.75rem', color: 'var(--c-muted)', textAlign: 'right', flexShrink: 0 }}>Income</div>
        <div style={{ flex: 1, height: 28, background: 'var(--c-ink)', borderRadius: 6, display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
          <span style={{ fontSize: '.8rem', fontWeight: 600, color: '#fff' }}>{f(income)}</span>
        </div>
      </div>
      {/* Flow bars */}
      {bars.map((b) => (
        <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div style={{ width: 90, fontSize: '.75rem', color: 'var(--c-muted)', textAlign: 'right', flexShrink: 0 }}>{b.label}</div>
          <div style={{ flex: 1, height: 22, background: 'var(--c-border)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
            <div style={{ height: '100%', width: `${Math.min(100, (b.value / total) * 100)}%`, background: b.color, borderRadius: 6, transition: 'width .8s ease' }} />
          </div>
          <div style={{ width: 72, fontSize: '.8rem', fontWeight: 600, color: 'var(--c-ink)', flexShrink: 0 }}>{f(b.value)}</div>
        </div>
      ))}
    </div>
  );
}

export default function Budget() {
  const { user, profile } = useAuth();
  const base = profile?.currency || 'GBP';
  const sym = symFor(base);
  const f = (n) => fmtMoney(n, sym);

  const [month, setMonth] = useState(null);
  const [income, setIncome] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [prevExpenses, setPrevExpenses] = useState([]);
  const [allocs, setAllocs] = useState([]);
  const [history, setHistory] = useState([]);
  const [editing, setEditing] = useState(null);   // { table:'income'|'expense'|'alloc', row }
  const [insights, setInsights] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const [incomeSource, setIncomeSource] = useState('records'); // 'records' | 'standard' fallback
  const load = async () => {
    const [inc, exp, prev, al, hist] = await Promise.all([
      getMonthlyIncome(user.id, month),
      supabase.from('expenses').select('*').eq('user_id', user.id).eq('month', month).order('amount', { ascending: false }),
      supabase.from('expenses').select('*').eq('user_id', user.id).eq('month', shiftMonth(month, -1)),
      supabase.from('savings_allocations').select('*').eq('user_id', user.id).eq('month', month),
      supabase.from('monthly_snapshots').select('month,fixed_expenses,variable_expenses,one_time_expenses,total_income,total_expenses,total_savings').eq('user_id', user.id).order('month', { ascending: false }).limit(12),
    ]);
    setIncome(inc.rows); setIncomeSource(inc.source); setExpenses(exp.data || []);
    setPrevExpenses(prev.data || []); setAllocs(al.data || []); setHistory(hist.data || []);
  };
  useEffect(() => { resolveFinancialMonth(user.id, thisMonth()).then((r) => setMonth(r.month)); }, [user.id]);
  useEffect(() => { if (month) load(); }, [user.id, month]);

  // ---------- derived ----------
  const totals = useMemo(() => {
    const ti = (income || []).reduce((a, i) => a + Number(i.amount), 0);
    const byType = { fixed: 0, variable: 0, 'one-time': 0 };
    const byCat = {};
    for (const e of expenses) {
      byType[e.type] = (byType[e.type] || 0) + Number(e.amount);
      byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount);
    }
    const te = byType.fixed + byType.variable + byType['one-time'];
    const ta = allocs.reduce((a, x) => a + Number(x.amount), 0);
    const prevTotal = prevExpenses.reduce((a, e) => a + Number(e.amount), 0);
    // top movers vs last month by category
    const prevCat = {};
    for (const e of prevExpenses) prevCat[e.category] = (prevCat[e.category] || 0) + Number(e.amount);
    const movers = [...new Set([...Object.keys(byCat), ...Object.keys(prevCat)])]
      .map((c) => ({ cat: c, now: byCat[c] || 0, prev: prevCat[c] || 0, delta: (byCat[c] || 0) - (prevCat[c] || 0) }))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 5).filter((m) => m.delta !== 0);
    return { ti, te, byType, byCat, ta, net: ti - te, rate: ti > 0 ? ((ti - te) / ti) * 100 : 0, prevTotal, movers };
  }, [income, expenses, allocs, prevExpenses]);

  const catData = Object.entries(totals.byCat).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const budgetTrend = useMemo(() => {
    const rows = history.map((x) => ({
      month: x.month, fixed: Number(x.fixed_expenses || 0), variable: Number(x.variable_expenses || 0), oneTime: Number(x.one_time_expenses || 0), savings: Number(x.total_savings || 0),
    }));
    const current = { month, fixed: totals.byType.fixed, variable: totals.byType.variable, oneTime: totals.byType['one-time'], savings: Math.max(0, totals.net) };
    const idx = rows.findIndex((x) => x.month === month);
    if (idx >= 0) rows[idx] = current; else rows.push(current);
    return rows.sort((a,b)=>a.month.localeCompare(b.month)).slice(-6);
  }, [history, month, totals]);
  const allocationData = useMemo(() => {
    const rows = allocs.filter((a)=>Number(a.amount)>0).map((a)=>({ name:a.destination.replace(/_/g,' '), value:Number(a.amount) }));
    const remaining = Math.max(0, totals.net - totals.ta);
    if (remaining > 0) rows.push({ name:'unallocated', value:remaining });
    return rows;
  }, [allocs, totals]);

  // ---------- CRUD ----------
  const save = async () => {
    setBusy(true); setErr('');
    try {
      const { table, row } = editing;
      if (Number(row.amount) < 0) throw new Error('Amounts cannot be negative.');
      if (!Number(row.amount) && Number(row.amount) !== 0) throw new Error('Enter a valid amount.');
      if (table === 'income') {
        // editing standard fallback rows first materialises this month's records
        if (incomeSource === 'standard') await materialiseIncome(user.id, month);
        const data = { user_id: user.id, month, name: row.name, amount: Number(row.amount), type: row.type || 'salary' };
        if (row.id && incomeSource === 'records') await supabase.from('income_records').update(data).eq('id', row.id);
        else await supabase.from('income_records').insert(data);
      } else if (table === 'expense') {
        const data = { user_id: user.id, month, description: row.description, category: row.category, amount: Number(row.amount), type: row.type, recurring: row.type === 'fixed' };
        if (row.id) await supabase.from('expenses').update(data).eq('id', row.id);
        else await supabase.from('expenses').insert(data);
      } else {
        const data = { user_id: user.id, month, destination: row.destination, amount: Number(row.amount) };
        if (row.id) await supabase.from('savings_allocations').update(data).eq('id', row.id);
        else await supabase.from('savings_allocations').insert(data);
      }
      setEditing(null); await load();
      api.intelligence('snapshot').catch(() => {});
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const remove = async (table, id) => {
    
    if (table === 'income' && incomeSource === 'standard') {
      // deleting from the fallback view: materialise first so history stays intact
      const rows = await materialiseIncome(user.id, month);
      const match = rows.find((r) => r.source_id === id);
      if (match) id = match.id;
    }
    const t = { income: 'income_records', expense: 'expenses', alloc: 'savings_allocations' }[table];
    await supabase.from(t).delete().eq('id', id);
    await load();
    api.intelligence('snapshot').catch(() => {});
  };

  const copyPrevious = async () => {
    const fixed = prevExpenses.filter((e) => e.recurring || e.type === 'fixed');
    if (!fixed.length) return;
    await supabase.from('expenses').insert(fixed.map((e) => ({
      user_id: user.id, month, description: e.description, category: e.category,
      amount: e.amount, type: e.type, recurring: e.recurring,
    })));
    await load();
    api.intelligence('snapshot').catch(() => {});
  };

  const runInsights = async () => {
    setBusy(true); setErr(''); setInsights(null);
    try { setInsights(await api.analyze('budget')); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  if (!month || income === null) return <div className="page page-wide"><div className="skeleton" style={{ height: 300 }} /></div>;

  const Editor = () => {
    const { table, row } = editing;
    const set = (k, v) => setEditing({ table, row: { ...row, [k]: v } });
    return (
      <div className="card fade-up" style={{ marginBottom: 18 }}>
        <div className="t-label">{row.id ? 'Edit' : 'Add'} {table === 'alloc' ? 'savings allocation' : table}</div>
        <div className="grid g3" style={{ marginTop: 12 }}>
          {table === 'income' && (<>
            <div className="field"><label>Source</label><input value={row.name || ''} onChange={(e) => set('name', e.target.value)} /></div>
            <div className="field"><label>Amount ({sym}/mo)</label><input type="number" min="0" value={row.amount || ''} onChange={(e) => set('amount', e.target.value)} /></div>
            <div className="field"><label>Type</label><select value={row.type || 'salary'} onChange={(e) => set('type', e.target.value)}>
              {['salary', 'side', 'rental', 'bonus', 'other'].map((t) => <option key={t}>{t}</option>)}</select></div>
          </>)}
          {table === 'expense' && (<>
            <div className="field"><label>Description</label><input value={row.description || ''} onChange={(e) => set('description', e.target.value)} /></div>
            <div className="field"><label>Amount ({sym})</label><input type="number" min="0" value={row.amount || ''} onChange={(e) => set('amount', e.target.value)} /></div>
            <div className="field"><label>Category</label><select value={row.category || 'other'} onChange={(e) => set('category', e.target.value)}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div className="field"><label>Type</label><select value={row.type || 'fixed'} onChange={(e) => set('type', e.target.value)}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
          </>)}
          {table === 'alloc' && (<>
            <div className="field"><label>Destination</label><select value={row.destination || 'emergency_fund'} onChange={(e) => set('destination', e.target.value)}>
              {DESTS.map((d) => <option key={d} value={d}>{d.replace(/_/g, ' ')}</option>)}</select></div>
            <div className="field"><label>Amount ({sym})</label><input type="number" min="0" value={row.amount || ''} onChange={(e) => set('amount', e.target.value)} /></div>
          </>)}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
          <button className="btn btn-gold" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    );
  };

  return (
    <div className="page page-wide">
      {/* header + month selector */}
      <PageIntro eyebrow="Where the month went — and where it should go" title="Budget" subtitle="A clear monthly view of income, spending and the money you deliberately put to work." action={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><button className="chip" onClick={() => setMonth(shiftMonth(month, -1))}>←</button><span style={{ fontSize: '1rem', minWidth: 140, textAlign: 'center', fontWeight: 700 }}>{monthName(month)}</span><button className="chip" onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= thisMonth()}>→</button></div>} />
      {month !== thisMonth() && <div className="data-notice">Opening your latest complete budget month. Use the arrows to set up {monthName(thisMonth())}.</div>}

      {err && <div className="card" style={{ borderColor: 'var(--c-red)', color: 'var(--c-red)', marginBottom: 14, fontSize: '.8rem' }}>{err}</div>}

      {incomeSource === 'standard' && income.length > 0 && (
        <div className="card fade-up" style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, borderColor: 'var(--c-gold)' }}>
          <span style={{ fontSize: '.8rem' }}>Showing your <strong>standard income</strong> ({f(totals.ti)}) — {monthName(month)} hasn't been confirmed yet.</span>
          <button className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '.72rem' }} disabled={busy}
            onClick={async () => {
              setBusy(true);
              try { await materialiseIncome(user.id, month); await load(); }
              finally { setBusy(false); }
            }}>
            {busy ? 'Confirming…' : `Confirm for ${monthName(month)}`}</button>
        </div>
      )}

      {expenses.length === 0 && prevExpenses.some((e) => e.recurring || e.type === 'fixed') && (
        <div className="card fade-up" style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, borderColor: 'var(--c-gold)' }}>
          <span style={{ fontSize: '.8rem' }}>
            New month. Import <strong>{prevExpenses.filter((e) => e.recurring || e.type === 'fixed').length} fixed expenses</strong> ({f(prevExpenses.filter((e) => e.recurring || e.type === 'fixed').reduce((a, e) => a + Number(e.amount), 0))}) from {monthName(shiftMonth(month, -1))}?
          </span>
          <button className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '.72rem' }} onClick={copyPrevious}>Import fixed expenses</button>
        </div>
      )}

      {totals.ta > Math.max(0, totals.net) && totals.ti > 0 && (
        <div className="card" style={{ marginBottom: 14, borderColor: 'var(--c-amber)', fontSize: '.78rem', color: 'var(--c-amber)' }}>
          ⚠ Savings allocations ({f(totals.ta)}) exceed this month's net savings ({f(Math.max(0, totals.net))}). Reduce allocations or expenses so the plan adds up.
        </div>
      )}

      {/* headline stats + gauge */}
      <div className="grid g4">
        {[['Income', f(totals.ti)], ['Expenses', f(totals.te)], ['Net savings', f(totals.net)]].map(([l, v]) => (
          <div key={l} className="card"><div className="t-label">{l}</div>
            <div className="num-xl" style={{ marginTop: 6 }}>{v}</div>
            {l === 'Expenses' && totals.prevTotal > 0 && (
              <div style={{ fontSize: '.72rem', color: totals.te <= totals.prevTotal ? 'var(--c-green)' : 'var(--c-red)' }}>
                {totals.te <= totals.prevTotal ? '▼' : '▲'} {f(Math.abs(totals.te - totals.prevTotal))} vs last month
              </div>)}
          </div>
        ))}
        <div className="card" style={{ position: 'relative' }}>
          <div className="t-label">Savings rate</div>
          <ResponsiveContainer width="100%" height={110}>
            <RadialBarChart innerRadius="70%" outerRadius="100%" startAngle={210} endAngle={-30}
              data={[{ value: Math.max(0, Math.min(100, totals.rate)) }]}>
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar dataKey="value" cornerRadius={8} fill={totals.rate >= 20 ? '#47C9AA' : totals.rate >= 10 ? '#7657F5' : '#D75555'} background={{ fill: '#E7E3F2' }} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 26 }}>
            <span className="num-xl" style={{ fontSize: '1.7rem' }}>{totals.rate.toFixed(0)}%</span>
          </div>
        </div>
      </div>

      <div className="budget-visual-grid">
        <section className="card chart-card">
          <div className="chart-card-head compact"><div><div className="t-label">Six-month rhythm</div><h3>Spending and savings over time</h3></div></div>
          <div className="medium-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={budgetTrend} margin={{top:12,right:8,left:2,bottom:4}}><CartesianGrid stroke="#E8E5F2" strokeDasharray="3 6" vertical={false}/><XAxis dataKey="month" tickFormatter={(v)=>new Date(v+'-02').toLocaleDateString('en-GB',{month:'short'})} tick={{fontSize:10,fill:'#8A889B'}} axisLine={false} tickLine={false}/><YAxis tickFormatter={(v)=>`${sym}${Math.round(v/1000)}k`} tick={{fontSize:10,fill:'#8A889B'}} axisLine={false} tickLine={false} width={46}/><Tooltip formatter={(v)=>f(v)}/><Legend iconType="circle" wrapperStyle={{fontSize:10}}/><Bar dataKey="fixed" name="Fixed" stackId="a" fill="#7657F5" radius={[5,5,0,0]}/><Bar dataKey="variable" name="Variable" stackId="a" fill="#65A8FF"/><Bar dataKey="oneTime" name="One-time" stackId="a" fill="#FF9F77"/><Bar dataKey="savings" name="Savings" fill="#47C9AA" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div>
        </section>
        <section className="card chart-card">
          <div className="chart-card-head compact"><div><div className="t-label">Where savings go</div><h3>{f(Math.max(0,totals.net))} available this month</h3></div></div>
          {allocationData.length ? <div className="allocation-chart-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={allocationData} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={3}>{allocationData.map((_,i)=><Cell key={i} fill={['#7657F5','#47C9AA','#65A8FF','#FF9F77','#D9A321','#A76BEF'][i%6]}/>)}</Pie><Tooltip formatter={(v)=>f(v)}/><Legend iconType="circle" wrapperStyle={{fontSize:10,textTransform:'capitalize'}}/></PieChart></ResponsiveContainer><div className="donut-center"><strong>{Math.round(totals.net ? totals.ta/totals.net*100 : 0)}%</strong><span>allocated</span></div></div> : <div className="empty-state"><div className="empty-title">Give your savings a job</div><p className="empty-body">Allocate savings to goals, investments or your emergency fund.</p></div>}
        </section>
      </div>

      <section className="card money-flow-card"><div className="chart-card-head compact"><div><div className="t-label">Money flow · {monthName(month)}</div><h3>Every pound from income to outcome</h3></div></div><MoneyFlow income={totals.ti} fixed={totals.byType.fixed} variable={totals.byType.variable} oneOff={totals.byType['one-time']} savings={Math.max(0,totals.net)} sym={sym} f={f}/></section>

      {/* category chart + movers */}
      <div className="grid g2" style={{ marginTop: 18 }}>
        <div className="card">
          <div className="t-label" style={{ marginBottom: 12 }}>Spending by category</div>
          {catData.length ? (
            <ResponsiveContainer width="100%" height={Math.max(160, Math.min(catData.length * 34, 280))}>
              <BarChart data={catData} layout="vertical" margin={{ left: 6 }}>
                <XAxis type="number" hide /><YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fontFamily: 'Arial' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => f(v)} cursor={{ fill: 'rgba(168,133,74,.08)' }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} animationDuration={700}>
                  {catData.map((_, i) => <Cell key={i} fill={i === 0 ? '#7657F5' : '#47C9AA'} opacity={1 - i * 0.09} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="empty-state"><div className="display">Nothing yet</div><p>Add this month's expenses below.</p></div>}
        </div>
        <div className="card">
          <div className="t-label" style={{ marginBottom: 12 }}>Top movers vs last month</div>
          {totals.movers.length ? totals.movers.map((m) => (
            <div key={m.cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--c-border)', fontSize: '.82rem' }}>
              <span style={{ textTransform: 'capitalize' }}>{m.cat}</span>
              <span style={{ color: m.delta > 0 ? 'var(--c-red)' : 'var(--c-green)' }}>
                {m.delta > 0 ? '+' : ''}{f(m.delta)} <span style={{ color: 'var(--c-muted)' }}>({f(m.prev)} → {f(m.now)})</span>
              </span>
            </div>
          )) : <div className="empty-state"><p>No data for {monthName(shiftMonth(month, -1))} to compare against.</p></div>}
        </div>
      </div>

      {editing && <div style={{ marginTop: 18 }}><Editor /></div>}

      {/* three ledgers */}
      <div className="grid g3" style={{ marginTop: 18 }}>
        {[
          ['Income', 'income', income, (r) => [r.name, f(r.amount), r.type]],
          ['Expenses', 'expense', expenses, (r) => [r.description, f(r.amount), `${r.category} · ${r.type}`]],
          ['Savings allocation', 'alloc', allocs, (r) => [r.destination.replace(/_/g, ' '), f(r.amount), '']],
        ].map(([title, table, rows, fmt2]) => (
          <div key={table} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 6 }}>
              <span className="t-label">{title}</span>
              <span style={{ display: 'flex', gap: 6 }}>
                {table === 'expense' && prevExpenses.length > 0 && expenses.length > 0 && (
                  <button className="chip" style={{ padding: '6px 12px' }} title="Copy last month's fixed expenses" onClick={copyPrevious}>⟳ prev</button>)}
                <button className="chip" onClick={() => setEditing({ table, row: {} })}>+ Add</button>
              </span>
            </div>
            {rows.length === 0 && <p style={{ fontSize: '.76rem', color: 'var(--c-muted)' }}>Nothing recorded{table !== 'income' ? ` for ${monthName(month)}` : ''}.</p>}
            {rows.map((r) => {
              const [a, b, c] = fmt2(r);
              return (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--c-border)', gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: table === 'alloc' ? 'capitalize' : 'none' }}>{a}</div>
                    {c && <div style={{ fontSize: '.64rem', color: 'var(--c-muted)' }}>{c}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>{b}</span>
                    <button className="chip" style={{ padding: '4px 10px' }} onClick={() => setEditing({ table, row: { ...r } })}>✎</button>
                    <button className="chip" style={{ padding: '4px 10px' }} onClick={() => remove(table, r.id)}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* AI insights */}
      <div className="card" style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div className="t-label">AI budget insights</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', marginTop: 4 }}>{insights ? insights.headline : 'Let the analyst read this month.'}</div>
          </div>
          <button className="btn btn-primary" onClick={runInsights} disabled={busy}>{busy ? 'Analysing…' : 'Analyse my budget'}</button>
        </div>
        {insights?.insights?.length > 0 && (
          <div className="grid g3" style={{ marginTop: 16 }}>
            {insights.insights.map((ins, i) => (
              <div key={i} style={{ border: '1px solid var(--c-border)', borderRadius: 12, padding: 14 }}>
                <span className={`badge badge-${ins.sentiment === "good" ? "good" : ins.sentiment === "warning" ? "warn" : ins.sentiment === "risk" ? "risk" : "neutral"}`}>{ins.sentiment}</span>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', margin: '6px 0 2px' }}>{ins.title}</div>
                <div style={{ fontSize: '.74rem', color: 'var(--c-muted)' }}>{ins.detail}</div>
              </div>
            ))}
          </div>
        )}
        {insights?.disclaimer && <p style={{ marginTop: 12, fontSize: '.62rem', color: 'var(--c-muted)' }}>{insights.disclaimer}</p>}
      </div>
    </div>
  );
}
