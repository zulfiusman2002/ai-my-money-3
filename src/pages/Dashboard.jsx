import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { composition, fmtMoney, symFor } from '../lib/wealth';
import { getFinancialSummary, currentMonth, defaultFinancialScope } from '../lib/financialSummary';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, ReferenceDot, Tooltip, Line } from 'recharts';
import MoneyChartTooltip, { shortMonth } from '../components/charts/MoneyChartTooltip';
import { MiloBriefing, MiloAvatar, SoftMetric } from '../components/Milo';
import Icon from '../components/Icon';

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const compactMoney = (value, symbol) => {
  const n = Number(value || 0);
  if (Math.abs(n) >= 1_000_000) return `${symbol}${(n / 1_000_000).toFixed(1)}m`;
  if (Math.abs(n) >= 1_000) return `${symbol}${Math.round(n / 1_000)}k`;
  return `${symbol}${Math.round(n)}`;
};

export default function Dashboard() {
  const { user, profile } = useAuth();
  const sym = symFor(profile?.currency);
  const f = (n) => fmtMoney(n, sym);
  const nav = useNavigate();
  const scope = defaultFinancialScope(profile);
  const [data, setData] = useState(null);
  const [brief, setBrief] = useState(null);
  const [briefBusy, setBriefBusy] = useState(false);
  const [briefErr, setBriefErr] = useState('');

  useEffect(() => {
    (async () => {
      const [fin, goals, snaps, insights, assets, liabs, nwHistory] = await Promise.all([
        getFinancialSummary(user.id, currentMonth(), { fallback: true, scope }),
        supabase.from('goals').select('*').eq('user_id', user.id).eq('status', 'active'),
        supabase.from('investment_snapshots').select('asset_type,total_value,converted_total,snapshot_date')
          .eq('user_id', user.id).order('snapshot_date', { ascending: false }),
        supabase.from('insights').select('*').eq('user_id', user.id).eq('status', 'active')
          .order('created_at', { ascending: false }).limit(6),
        supabase.from('assets').select('*').eq('user_id', user.id).eq('is_active', true),
        supabase.from('liabilities').select('amount,scope').eq('user_id', user.id),
        supabase.from('monthly_snapshots').select('month,net_worth,total_invested,total_assets,total_liabilities').eq('user_id', user.id).order('month'),
      ]);
      const latest = {};
      for (const s of snaps.data || []) if (!latest[s.asset_type]) latest[s.asset_type] = s;
      const scopedLiabilities = (liabs.data || []).filter((x) => (x.scope || 'household') === scope);
      const comp = composition(assets.data || [], Object.values(latest), scopedLiabilities);
      const byCat = Object.entries(fin.byCategory).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
      const history = (nwHistory.data || []).map((x) => ({
        month: x.month,
        value: Number(x.net_worth || 0),
        assets: Number(x.total_invested || 0) + Number(x.total_assets || 0),
        liabilities: Number(x.total_liabilities || 0),
      }));
      const nowMonth = new Date().toISOString().slice(0, 7);
      const livePoint = { month: nowMonth, value: comp.netWorth, assets: comp.gross, liabilities: comp.totalLiabilities, isLive: true };
      if (!history.length || history.at(-1)?.month !== nowMonth) history.push(livePoint);
      else if (Math.abs(history.at(-1)?.value - comp.netWorth) > 1) history[history.length - 1] = livePoint;
      setData({ fin, goals: goals.data || [], comp, insights: insights.data || [], byCat, history: history.slice(-12) });
    })();
  }, [user.id, scope]);

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
  if (!data) return <div className="page page-wide"><div className="skeleton" style={{ height: 390, marginBottom: 18 }} /><div className="grid g4">{[1,2,3,4].map((x)=><div key={x} className="skeleton" style={{height:150}} />)}</div></div>;

  const { fin, comp } = data;
  const latestInsight = brief?.summary || brief?.headline || data.insights[0]?.body || data.insights[0]?.detail;
  const goalPct = topGoal ? Math.min(100, Number(topGoal.current_amount || 0) / Math.max(1, Number(topGoal.target_amount || 0)) * 100) : 0;
  const liquidRatio = comp.gross > 0 ? comp.liquid / comp.gross : 0;
  const debtRatio = comp.gross > 0 ? comp.totalLiabilities / comp.gross : 0;
  const moneyPulse = Math.round(clamp(38 + Math.min(fin.savingsRate, 35) * 1.15 + liquidRatio * 28 - debtRatio * 45, 0, 100));
  const pulseLabel = moneyPulse >= 80 ? 'Strong' : moneyPulse >= 65 ? 'Healthy' : moneyPulse >= 45 ? 'Building' : 'Needs attention';
  const monthlyDelta = data.history.length >= 2 ? data.history.at(-1).value - data.history.at(-2).value : 0;
  const topSpend = data.byCat[0];

  return (
    <div className="page page-wide dashboard-v42">
      {fin.isFallback && (
        <div className="data-notice"><Icon name="spark" size={16}/>Showing the latest complete budget month ({fin.month}) because {fin.requestedMonth} has no expenses yet.</div>
      )}

      <MiloBriefing name={profile?.name || 'there'}
        body={latestInsight || 'I have connected your budget, goals, investments and wider wealth. Here is the one-minute view of what matters today.'}
        facts={[
          { label: 'One win', value: `${Math.round(fin.savingsRate)}% saved`, detail: fin.savingsRate >= 20 ? 'Your monthly margin is strong.' : 'Every improvement creates more room.' },
          { label: 'One watch-out', value: `${Math.round(debtRatio * 100)}% debt ratio`, detail: debtRatio < .15 ? 'Debt is contained relative to assets.' : 'Keep an eye on repayments and headroom.' },
          { label: 'One next action', value: topGoal ? `${goalPct.toFixed(0)}% to goal` : 'Create a goal', detail: topGoal ? `Keep ${topGoal.goal_name} moving this month.` : 'Give your savings a clear destination.' },
        ]}
        action={brief ? 'Refresh briefing' : 'Get my briefing'} busy={briefBusy} onAction={runBrief}/>

      {briefErr && <div className="data-notice error-notice">{briefErr}</div>}

      <section className="dashboard-overview-grid-v42 fade-up">
        <article className="hero-wealth-v42">
          <header className="wealth-topline-v42">
            <div>
              <div className="hero-label">Your financial position</div>
              <div className="hero-number">{f(comp.netWorth)}</div>
              <p>Net worth after subtracting every tracked liability.</p>
            </div>
            <div className={`wealth-change-v42 ${monthlyDelta >= 0 ? 'up' : 'down'}`}>
              <span>{monthlyDelta >= 0 ? '↗' : '↘'}</span>
              <div><strong>{monthlyDelta >= 0 ? '+' : ''}{f(monthlyDelta)}</strong><small>since the previous snapshot</small></div>
            </div>
          </header>

          <div className="wealth-kpis-v42">
            <div><span>Total assets</span><strong>{f(comp.gross)}</strong><small>Everything you own</small></div>
            <div><span>Liabilities</span><strong className="down">{f(comp.totalLiabilities)}</strong><small>Everything you owe</small></div>
            <div><span>Liquid wealth</span><strong>{f(comp.liquid)}</strong><small>{Math.round(liquidRatio * 100)}% of assets</small></div>
          </div>

          <div className="chart-title-row-v42">
            <div><span>12-month wealth movement</span><strong>How assets, debt and net worth changed</strong></div>
            <div className="chart-legend-v42">
              <span><i className="legend-net"/>Net worth</span>
              <span><i className="legend-assets"/>Assets</span>
              <span><i className="legend-debt"/>Liabilities</span>
            </div>
          </div>

          <div className="hero-chart-v42">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.history} margin={{ top: 14, right: 18, left: 6, bottom: 4 }}>
                <defs>
                  <linearGradient id="wealthGradientV42" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7657F5" stopOpacity=".34"/><stop offset="100%" stopColor="#7657F5" stopOpacity=".02"/></linearGradient>
                </defs>
                <CartesianGrid stroke="#E8E5F3" strokeDasharray="3 7" vertical={false}/>
                <XAxis dataKey="month" tickFormatter={shortMonth} minTickGap={26} tick={{fontSize:12,fill:'#817D91'}} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={(v)=>compactMoney(v,sym)} tick={{fontSize:11,fill:'#918DA0'}} axisLine={false} tickLine={false} width={58}/>
                <Tooltip content={<MoneyChartTooltip formatter={f}/>}/>
                <Area type="monotone" dataKey="value" name="Net worth" stroke="#7657F5" strokeWidth={4} fill="url(#wealthGradientV42)" animationDuration={900}/>
                <Line type="monotone" dataKey="assets" name="Total assets" stroke="#47C9AA" strokeWidth={2.5} dot={false}/>
                <Line type="monotone" dataKey="liabilities" name="Liabilities" stroke="#D75555" strokeWidth={2.2} strokeDasharray="7 5" dot={false}/>
                {data.history.length > 0 && <ReferenceDot x={data.history.at(-1).month} y={data.history.at(-1).value} r={7} fill="#7657F5" stroke="#fff" strokeWidth={3}/>} 
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <footer className="chart-footer-v42"><span>Hover or tap any month to see exact values.</span><button onClick={()=>nav('/app/networth')}>Open full net worth analysis <Icon name="arrow" size={16}/></button></footer>
        </article>

        <aside className="pulse-card-v42">
          <header><span>Money Pulse</span><small>A simple health signal from your connected data</small></header>
          <div className="pulse-ring-v42" style={{'--pulse':`${moneyPulse * 3.6}deg`}}><div><strong>{moneyPulse}</strong><span>/100</span></div></div>
          <h3>{pulseLabel}</h3>
          <p>{fin.savingsRate >= 20 ? 'Your monthly margin is doing the heavy lifting.' : 'Cash-flow improvement would create the biggest immediate benefit.'}</p>
          <div className="pulse-breakdown-v42">
            <div><span>Savings rate</span><strong>{Math.round(fin.savingsRate)}%</strong></div>
            <div><span>Liquid wealth</span><strong>{Math.round(liquidRatio * 100)}%</strong></div>
            <div><span>Debt ratio</span><strong>{Math.round(debtRatio * 100)}%</strong></div>
          </div>
          <div className="pulse-action-v42"><MiloAvatar mode="scientist" size={138} motion="think"/><div><span>Milo’s interpretation</span><strong>{topSpend ? `${topSpend.name} is your largest expense category.` : 'Add expenses to improve this score.'}</strong><button onClick={()=>nav('/app/advisor')}>Ask why <Icon name="chevron" size={14}/></button></div></div>
        </aside>
      </section>

      <div className="metric-strip-v42 fade-up delay-1">
        <SoftMetric label="Monthly cash flow" value={f(fin.netSavings)} detail={`${fin.month} · income minus expenses`} tone="purple" icon="budget"/>
        <SoftMetric label="Savings rate" value={`${Math.round(fin.savingsRate)}%`} detail={fin.savingsRate >= 20 ? 'Strong monthly margin' : 'Room to improve'} tone="mint" icon="invest"/>
        <SoftMetric label="Broker investments" value={f(comp.invested)} detail="Latest uploaded snapshots" tone="blue" icon="invest"/>
        <SoftMetric label="Other wealth" value={f(comp.nonBroker)} detail="Property, gold, pension and cash" tone="peach" icon="worth"/>
      </div>

      <section className="weekly-meeting-v42 fade-up delay-2">
        <MiloAvatar mode="core" size={190} motion="wave" glow />
        <div className="weekly-copy-v42"><div className="milo-eyebrow"><Icon name="spark" size={15}/>Your weekly meeting with Milo</div><h2>Three minutes to keep your money moving.</h2><p>Review what changed, celebrate one win and choose one action for the week ahead.</p></div>
        <div className="weekly-checks-v42"><span><b>{f(fin.netSavings)}</b>monthly cash flow</span><span><b>{f(comp.netWorth)}</b>net worth</span><span><b>{topGoal ? `${goalPct.toFixed(0)}%` : '—'}</b>priority goal</span></div>
        <button className="btn btn-primary" onClick={runBrief}>{briefBusy ? 'Preparing…' : 'Start check-in'}<Icon name="arrow" size={16}/></button>
      </section>

      <div className="dashboard-content-grid-v42">
        <section className="card dashboard-goal-v42">
          <div className="section-head compact"><div><span className="t-label">Next destination</span><h2>Your priority goal</h2></div><Link to="/app/goals">All goals <Icon name="chevron" size={15}/></Link></div>
          {topGoal ? <>
            <div className="goal-visual-head"><div><span>{topGoal.goal_type}</span><h3>{topGoal.goal_name}</h3></div><strong>{goalPct.toFixed(0)}%</strong></div>
            <div className="goal-big-number"><span>{f(topGoal.current_amount)}</span><small>of {f(topGoal.target_amount)}</small></div>
            <div className="progress-track tall"><div className="progress-fill" style={{width:`${goalPct}%`}}/></div>
            <div className="goal-meta-v3"><span>{f(topGoal.monthly_contribution)}/month</span><button onClick={()=>nav('/app/goals')} className="btn btn-secondary btn-sm">Open goal</button></div>
          </> : <div className="empty-state"><div className="empty-title">Give your money a destination</div><div className="empty-body">Milo can help you turn a target into a monthly plan.</div><button className="btn btn-primary btn-sm" onClick={()=>nav('/app/goals')}>Create a goal</button></div>}
        </section>

        <section className="card dashboard-spend-v42">
          <div className="section-head compact"><div><span className="t-label">This month</span><h2>Where your money went</h2></div><Link to="/app/budget">Open budget <Icon name="chevron" size={15}/></Link></div>
          <div className="spend-list-v42">
            {data.byCat.slice(0,5).map((x,i)=>{const pct=(x.value/Math.max(1,fin.totalExpenses)*100);return <div className="spend-row-v42" key={x.name}><div className="spend-row-label"><span className="color-dot" style={{background:['#7657F5','#47C9AA','#65A8FF','#FF9F77','#D9A321'][i]}}/><div><strong style={{textTransform:'capitalize'}}>{x.name}</strong><small>{pct.toFixed(0)}% of spending</small></div></div><div><strong>{f(x.value)}</strong><span className="mini-progress"><i style={{width:`${pct}%`}}/></span></div></div>})}
            {!data.byCat.length && <div className="empty-body">No expenses in this budget month.</div>}
          </div>
        </section>
      </div>

      <div className="section-head"><div><h2>Milo noticed</h2><p className="t-small">Connected observations from across your money life.</p></div><Link to="/app/advisor">Ask Milo <Icon name="chevron" size={15}/></Link></div>
      <div className="insight-grid-v42">
        {(brief?.insights || data.insights).slice(0,4).map((ins,i)=><div key={ins.id || i} className={`insight-card-v42 ${ins.sentiment === 'good' || ins.severity === 'good' ? 'good' : ins.sentiment === 'risk' || ins.severity === 'risk' ? 'risk' : 'warn'}`}><div className="insight-index">0{i+1}</div><div><div className="insight-title">{ins.title || ins.headline}</div><div className="insight-body">{ins.detail || ins.body}</div></div></div>)}
        {!brief && !data.insights.length && <div className="card"><div className="t-label">A clearer next step</div><p className="t-body" style={{marginTop:8}}>Run Milo’s briefing to connect your budget, goals, investments and learning journey.</p></div>}
      </div>
    </div>
  );
}
