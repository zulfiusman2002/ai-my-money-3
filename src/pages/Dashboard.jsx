import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { composition, fmtMoney, symFor } from '../lib/wealth';
import { getFinancialSummary, currentMonth } from '../lib/financialSummary';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MiloGreeting, SoftMetric } from '../components/Milo';
import Icon from '../components/Icon';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const sym = symFor(profile?.currency);
  const f = (n) => fmtMoney(n, sym);
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [brief, setBrief] = useState(null);
  const [briefBusy, setBriefBusy] = useState(false);
  const [briefErr, setBriefErr] = useState('');

  useEffect(() => {
    (async () => {
      const [fin, goals, snaps, insights, assets, liabs, nwHistory] = await Promise.all([
        getFinancialSummary(user.id, currentMonth(), { fallback: true }),
        supabase.from('goals').select('*').eq('user_id', user.id).eq('status', 'active'),
        supabase.from('investment_snapshots').select('asset_type,total_value,converted_total,snapshot_date')
          .eq('user_id', user.id).order('snapshot_date', { ascending: false }),
        supabase.from('insights').select('*').eq('user_id', user.id).eq('status', 'active')
          .order('created_at', { ascending: false }).limit(4),
        supabase.from('assets').select('*').eq('user_id', user.id).eq('is_active', true),
        supabase.from('liabilities').select('amount').eq('user_id', user.id),
        supabase.from('monthly_snapshots').select('month,net_worth').eq('user_id', user.id).order('month'),
      ]);
      const latest = {};
      for (const s of snaps.data || []) if (!latest[s.asset_type]) latest[s.asset_type] = s;
      const comp = composition(assets.data || [], Object.values(latest), liabs.data || []);
      const byCat = Object.entries(fin.byCategory).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
      const history = (nwHistory.data || []).map((x) => ({ month: x.month, value: Number(x.net_worth || 0) }));
      if (!history.length || history.at(-1)?.value !== comp.netWorth) history.push({ month: 'Now', value: comp.netWorth });
      setData({ fin, goals: goals.data || [], comp, insights: insights.data || [], byCat, history });
    })();
  }, [user.id]);

  const runBrief = async () => {
    setBriefBusy(true); setBriefErr('');
    try {
      const review = await api.analyze('full-review');
      setBrief(review);
      api.intelligence('both').catch(() => null);
    } catch (e) { setBriefErr(e.message); }
    finally { setBriefBusy(false); }
  };

  const topGoal = useMemo(() => data?.goals?.[0], [data]);
  if (!data) return <div className="page"><div className="skeleton" style={{ height: 230, marginBottom: 16 }} /><div className="grid g4">{[1,2,3,4].map((x)=><div key={x} className="skeleton" style={{height:130}} />)}</div></div>;

  const { fin, comp } = data;
  const latestInsight = brief?.summary || brief?.headline || data.insights[0]?.body || data.insights[0]?.detail;
  const goalPct = topGoal ? Math.min(100, Number(topGoal.current_amount || 0) / Math.max(1, Number(topGoal.target_amount || 0)) * 100) : 0;

  return (
    <div className="page">
      {fin.isFallback && (
        <div className="data-notice"><Icon name="spark" size={16}/>Showing the latest complete budget month ({fin.month}) because {fin.requestedMonth} has no expenses yet.</div>
      )}

      <div className="dashboard-hero fade-up">
        <section className="hero-wealth">
          <div className="hero-label">Your net worth</div>
          <div className="hero-number">{f(comp.netWorth)}</div>
          <div className="hero-meta">
            <span><b>{f(comp.gross)}</b> total assets</span>
            <span><b>{f(comp.totalLiabilities)}</b> liabilities</span>
            <span><b>{f(comp.liquid)}</b> liquid</span>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.history} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                <defs><linearGradient id="wealthGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7657F5" stopOpacity=".34"/><stop offset="100%" stopColor="#54CDB1" stopOpacity="0"/></linearGradient></defs>
                <XAxis dataKey="month" hide/><YAxis hide domain={['dataMin - 5000','dataMax + 5000']}/>
                <Tooltip formatter={(v)=>f(v)} contentStyle={{border:'0',borderRadius:14,boxShadow:'var(--sh-md)'}}/>
                <Area type="monotone" dataKey="value" stroke="#7657F5" strokeWidth={3} fill="url(#wealthGradient)" animationDuration={900}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
        <MiloGreeting className="dashboard-milo" mode="core" eyebrow="Milo's daily briefing"
          title={`Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, ${profile?.name || 'there'} 👋`}
          body={latestInsight || 'I have your budget, goals, investments and wider wealth in one place. Let’s make the next decision clearer.'}
          action={briefBusy ? 'Reading your numbers…' : brief ? 'Refresh briefing' : 'Get my briefing'} onAction={runBrief}/>
      </div>

      {briefErr && <div className="data-notice" style={{color:'var(--c-red)',background:'var(--c-red-bg)'}}>{briefErr}</div>}

      <div className="grid g4 fade-up delay-1">
        <SoftMetric label="Cash flow" value={f(fin.netSavings)} detail={`${fin.month} · income minus expenses`} tone="purple" icon="budget"/>
        <SoftMetric label="Savings rate" value={`${fin.savingsRate.toFixed(1)}%`} detail={fin.savingsRate >= 20 ? 'Strong monthly margin' : 'Room to improve'} tone="mint" icon="invest"/>
        <SoftMetric label="Investments" value={f(comp.invested)} detail="Latest broker snapshots" tone="blue" icon="invest"/>
        <SoftMetric label="Other wealth" value={f(comp.nonBroker)} detail="Property, gold, pension and cash" tone="peach" icon="worth"/>
      </div>

      <div className="section-head"><h2>Your goals</h2><Link to="/app/goals">View all <Icon name="chevron" size={15}/></Link></div>
      <div className="grid g2">
        <div className="card">
          {topGoal ? <>
            <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'flex-start'}}>
              <div><div className="t-label">{topGoal.goal_type}</div><h3 style={{fontSize:'1.35rem',marginTop:5}}>{topGoal.goal_name}</h3></div>
              <span className="badge badge-info">{goalPct.toFixed(0)}%</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',margin:'22px 0 8px'}}><strong>{f(topGoal.current_amount)}</strong><span className="t-small">of {f(topGoal.target_amount)}</span></div>
            <div className="progress-track"><div className="progress-fill" style={{width:`${goalPct}%`}}/></div>
            <div style={{display:'flex',justifyContent:'space-between',marginTop:12}}><span className="t-small">{f(topGoal.monthly_contribution)}/month</span><button onClick={()=>nav('/app/goals')} className="btn btn-secondary btn-xs">Open goal</button></div>
          </> : <div className="empty-state"><div className="empty-title">Give your money a destination</div><div className="empty-body">Milo can help you turn a target into a monthly plan.</div><button className="btn btn-primary btn-sm" onClick={()=>nav('/app/goals')}>Create a goal</button></div>}
        </div>
        <div className="card">
          <div className="t-label">Where this month went</div>
          <div className="mini-list" style={{marginTop:10}}>
            {data.byCat.slice(0,5).map((x,i)=><div className="mini-row" key={x.name}><div style={{display:'flex',alignItems:'center',gap:10}}><span className="color-dot" style={{background:['#7657F5','#47C9AA','#65A8FF','#FF9F77','#D9A321'][i]}}/><div className="mini-row-main"><strong style={{textTransform:'capitalize'}}>{x.name}</strong><small>{(x.value/Math.max(1,fin.totalExpenses)*100).toFixed(0)}% of spending</small></div></div><span className="num-sm">{f(x.value)}</span></div>)}
            {!data.byCat.length && <div className="empty-body">No expenses in this budget month.</div>}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={()=>nav('/app/budget')} style={{marginTop:14}}>Open budget <Icon name="arrow" size={15}/></button>
        </div>
      </div>

      <div className="section-head"><h2>Milo noticed</h2><Link to="/app/advisor">Ask Milo <Icon name="chevron" size={15}/></Link></div>
      <div className="grid g2">
        {(brief?.insights || data.insights).slice(0,4).map((ins,i)=><div key={ins.id || i} className={`insight-card ${ins.sentiment === 'good' || ins.severity === 'good' ? 'good' : ins.sentiment === 'risk' || ins.severity === 'risk' ? 'risk' : 'warn'}`}><div className="insight-title">{ins.title || ins.headline}</div><div className="insight-body">{ins.detail || ins.body}</div></div>)}
        {!brief && !data.insights.length && <div className="card"><div className="t-label">A clearer next step</div><p className="t-body" style={{marginTop:8}}>Run Milo’s briefing to connect your budget, goals, investments and learning journey.</p></div>}
      </div>
    </div>
  );
}
