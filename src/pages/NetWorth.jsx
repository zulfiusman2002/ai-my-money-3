import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { composition, fmtMoney, symFor, snapshotValue } from '../lib/wealth';
import WealthComposition from '../components/WealthComposition';
import Liabilities from '../components/Liabilities';
import { PageIntro } from '../components/Milo';
import MoneyChartTooltip, { shortMonth } from '../components/charts/MoneyChartTooltip';
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  Treemap, BarChart, Bar, Cell, Legend, ReferenceDot,
} from 'recharts';

const PALETTE = ['#7657F5','#47C9AA','#65A8FF','#FF9F77','#D9A321','#A76BEF','#54B8D8','#7B89A8'];
const label = (t) => String(t || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const TreeCell = ({ x, y, width, height, name, value, sym, index }) => {
  if (width < 4 || height < 4) return null;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={8}
        fill={PALETTE[index % PALETTE.length]} stroke="#fff" strokeWidth={3} />
      {width > 88 && height > 42 && <>
        <text x={x + 12} y={y + 22} style={{ fontFamily: 'Arial', fontSize: 10, fill: '#fff', letterSpacing: '.04em' }}>{name}</text>
        <text x={x + 12} y={y + 43} style={{ fontFamily: 'Arial', fontSize: 16, fontWeight: 700, fill: '#fff' }}>{sym}{Number(value).toLocaleString('en-GB', { maximumFractionDigits: 0 })}</text>
      </>}
    </g>
  );
};

export default function NetWorth() {
  const { user, profile } = useAuth();
  const base = profile?.currency || 'GBP';
  const sym = symFor(base);
  const f = (n) => fmtMoney(n, sym);
  const [data, setData] = useState(null);
  const [ai, setAi] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [range, setRange] = useState('all');

  const load = async () => {
    const [snaps, assets, liabs, months] = await Promise.all([
      supabase.from('investment_snapshots').select('asset_type,total_value,converted_total,snapshot_date')
        .eq('user_id', user.id).order('snapshot_date', { ascending: false }),
      supabase.from('assets').select('*').eq('user_id', user.id).eq('is_active', true),
      supabase.from('liabilities').select('*').eq('user_id', user.id).order('amount', { ascending: false }),
      supabase.from('monthly_snapshots').select('month,net_worth,total_invested,total_assets,total_liabilities')
        .eq('user_id', user.id).order('month'),
    ]);
    const latest = {};
    for (const s of snaps.data || []) if (!latest[s.asset_type]) latest[s.asset_type] = s;
    setData({ latest: Object.values(latest), assets: assets.data || [], liabilities: liabs.data || [], trend: months.data || [] });
  };
  useEffect(() => { load(); }, [user.id]);

  const comp = useMemo(() => data && composition(data.assets, data.latest, data.liabilities), [data]);
  const allocation = useMemo(() => !data ? [] : [
    ...data.latest.map((s) => ({ name: label(s.asset_type), value: snapshotValue(s) })),
    ...data.assets.map((a) => ({ name: a.name, value: Number(a.converted_value) })),
  ].filter((x) => x.value > 0).sort((a, b) => b.value - a.value), [data]);
  const liabByType = useMemo(() => {
    if (!data) return [];
    const m = {};
    for (const l of data.liabilities) m[l.type] = (m[l.type] || 0) + Number(l.amount);
    return Object.entries(m).map(([name, value]) => ({ name: label(name), value })).sort((a, b) => b.value - a.value);
  }, [data]);

  const runAI = async () => {
    setBusy(true); setErr('');
    try { setAi(await api.analyze('networth')); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  if (!data) return <div className="page page-wide"><div className="skeleton" style={{ height: 340 }} /></div>;

  const trend = data.trend.map((x) => ({
    ...x,
    netWorth: Number(x.net_worth || 0),
    assets: Number(x.total_invested || 0) + Number(x.total_assets || 0),
    liabilities: Number(x.total_liabilities || 0),
  }));
  const currentTrendMonth = new Date().toISOString().slice(0, 7);
  const livePoint = { month: currentTrendMonth, netWorth: comp.netWorth, assets: comp.gross, liabilities: comp.totalLiabilities, isLive: true };
  if (!trend.length || trend.at(-1).month !== currentTrendMonth) trend.push(livePoint);
  else if (Math.abs(trend.at(-1).netWorth - comp.netWorth) > 1) trend[trend.length - 1] = livePoint;
  const rangeCount = { '3m': 3, '6m': 6, '1y': 12, all: trend.length }[range] || trend.length;
  const visibleTrend = trend.slice(-rangeCount);
  const mom = trend.length >= 2 ? trend.at(-1).netWorth - trend.at(-2).netWorth : null;
  const firstVisible = visibleTrend[0]?.netWorth || comp.netWorth;
  const rangeDelta = comp.netWorth - firstVisible;
  const monthlyChanges = visibleTrend.slice(1).map((x, i) => ({ month: x.month, change: x.netWorth - visibleTrend[i].netWorth }));

  return (
    <div className="page page-wide">
      <PageIntro eyebrow="Everything you own, minus everything you owe" title="Net Worth" subtitle="A single view across investments, property, gold, pensions, cash and liabilities." action={mom != null ? <div className="page-kpi"><div className="t-label">vs last snapshot</div><div className={`num-lg ${mom >= 0 ? 'up' : 'down'}`}>{mom >= 0 ? '+' : ''}{f(mom)}</div></div> : null} />

      <WealthComposition comp={comp} sym={sym} base={base} />

      <section className="card chart-card networth-trend-card">
        <div className="chart-card-head">
          <div><div className="t-label">Wealth movement</div><h2>Your full financial picture over time</h2><p>Assets, liabilities and the net worth left after both are combined.</p></div>
          <div className="range-switch">{[['3m','3M'],['6m','6M'],['1y','1Y'],['all','All']].map(([v,l])=><button key={v} className={range===v?'active':''} onClick={()=>setRange(v)}>{l}</button>)}</div>
        </div>
        <div className="trend-summary-row">
          <div><span>Current net worth</span><strong>{f(comp.netWorth)}</strong></div>
          <div><span>Assets</span><strong>{f(comp.gross)}</strong></div>
          <div><span>Liabilities</span><strong className="down">{f(comp.totalLiabilities)}</strong></div>
          <div><span>Change in range</span><strong className={rangeDelta >= 0 ? 'up' : 'down'}>{rangeDelta >= 0 ? '+' : ''}{f(rangeDelta)}</strong></div>
        </div>
        {visibleTrend.length >= 2 ? <div className="large-chart">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={visibleTrend} margin={{ top: 22, right: 12, left: 4, bottom: 8 }}>
              <defs>
                <linearGradient id="nw2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7657F5" stopOpacity=".28"/><stop offset="100%" stopColor="#7657F5" stopOpacity=".015"/></linearGradient>
              </defs>
              <CartesianGrid stroke="#E7E3F2" strokeDasharray="3 6" vertical={false}/>
              <XAxis dataKey="month" tickFormatter={shortMonth} tick={{fontSize:11,fill:'#8A889B'}} minTickGap={24} axisLine={false} tickLine={false}/>
              <YAxis yAxisId="money" tickFormatter={(v)=>`${sym}${v >= 1e6 ? `${(v/1e6).toFixed(1)}m` : `${Math.round(v/1000)}k`}`} tick={{fontSize:10,fill:'#8A889B'}} axisLine={false} tickLine={false} width={58}/>
              <YAxis yAxisId="debt" orientation="right" tickFormatter={(v)=>`${sym}${Math.round(v/1000)}k`} tick={{fontSize:10,fill:'#D75555'}} axisLine={false} tickLine={false} width={52}/>
              <Tooltip content={<MoneyChartTooltip formatter={f}/>}/>
              <Legend iconType="circle" wrapperStyle={{fontSize:11,paddingTop:8}}/>
              <Area yAxisId="money" type="monotone" dataKey="netWorth" name="Net worth" stroke="#7657F5" strokeWidth={3} fill="url(#nw2)"/>
              <Line yAxisId="money" type="monotone" dataKey="assets" name="Total assets" stroke="#47C9AA" strokeWidth={2.2} dot={{r:3,fill:'#47C9AA',stroke:'#fff',strokeWidth:2}}/>
              <Line yAxisId="debt" type="monotone" dataKey="liabilities" name="Liabilities" stroke="#D75555" strokeWidth={2} strokeDasharray="5 4" dot={{r:3,fill:'#D75555',stroke:'#fff',strokeWidth:2}}/>
              <ReferenceDot yAxisId="money" x={visibleTrend.at(-1).month} y={visibleTrend.at(-1).netWorth} r={6} fill="#7657F5" stroke="#fff" strokeWidth={3}/>
            </ComposedChart>
          </ResponsiveContainer>
        </div> : <div className="empty-state"><div className="empty-icon">📈</div><div className="empty-title">Your trend begins with the next snapshot</div><p className="empty-body">One consistent snapshot each month will reveal the story behind your wealth.</p></div>}
        {monthlyChanges.length > 0 && <div className="networth-delta-panel"><div className="t-label">Month-to-month change</div><ResponsiveContainer width="100%" height={150}><BarChart data={monthlyChanges} margin={{top:12,right:8,left:0,bottom:2}}><CartesianGrid stroke="#ECE9F4" strokeDasharray="3 6" vertical={false}/><XAxis dataKey="month" tickFormatter={shortMonth} tick={{fontSize:10,fill:'#8A889B'}} axisLine={false} tickLine={false}/><YAxis tickFormatter={(v)=>`${v>=0?'+':''}${sym}${Math.round(v/1000)}k`} tick={{fontSize:9,fill:'#8A889B'}} axisLine={false} tickLine={false} width={54}/><Tooltip formatter={(v)=>f(v)} labelFormatter={(v)=>new Date(v+'-02').toLocaleDateString('en-GB',{month:'long',year:'numeric'})}/><Bar dataKey="change" name="Net worth change" radius={[7,7,0,0]}>{monthlyChanges.map((x,i)=><Cell key={i} fill={x.change>=0?'#47C9AA':'#D75555'}/>)}</Bar></BarChart></ResponsiveContainer></div>}
        {Math.abs(rangeDelta) > Math.max(5000, comp.netWorth * .08) && <div className="chart-explainer">Large movements can come from property or land revaluations, new investment uploads, or liabilities being added. Milo uses the same calculation for every point shown here.</div>}
      </section>

      <div className="grid g2 desktop-wealth-grid">
        <div className="card">
          <div className="chart-card-head compact"><div><div className="t-label">Wealth allocation</div><h3>What your wealth is made of</h3></div></div>
          {allocation.length ? <ResponsiveContainer width="100%" height={330}><Treemap data={allocation} dataKey="value" nameKey="name" isAnimationActive={false} content={<TreeCell sym={sym}/>} /></ResponsiveContainer> : <div className="empty-state"><div className="empty-icon">📊</div><p className="empty-body">Add investments or assets to see allocation.</p></div>}
        </div>
        <div className="liability-column">
          <Liabilities rows={data.liabilities} onChanged={load}/>
          {liabByType.length > 0 && <div className="card"><div className="t-label" style={{marginBottom:10}}>Liability breakdown</div><ResponsiveContainer width="100%" height={Math.max(130,liabByType.length*48)}><BarChart data={liabByType} layout="vertical"><XAxis type="number" hide/><YAxis type="category" dataKey="name" width={110} tick={{fontSize:11}} axisLine={false} tickLine={false}/><Tooltip content={<MoneyChartTooltip formatter={f}/>}/><Bar dataKey="value" name="Balance" radius={[0,8,8,0]}>{liabByType.map((_,i)=><Cell key={i} fill="#D75555" opacity={1-i*.14}/>)}</Bar></BarChart></ResponsiveContainer></div>}
        </div>
      </div>

      {err && <div className="data-notice error-notice">{err}</div>}
      <div className="card milo-review-strip">
        <div><div className="t-label">Milo’s net worth review</div><h3>{ai ? ai.headline : 'What does this composition say about you?'}</h3></div>
        <button className="btn btn-primary" onClick={runAI} disabled={busy}>{busy ? 'Reviewing…' : 'Review my net worth'}</button>
        {ai?.insights?.length > 0 && <div className="grid g3 review-insights">{ai.insights.map((ins,i)=><div key={i} className={`insight-card ${ins.sentiment === 'good' ? 'good' : ins.sentiment === 'risk' ? 'risk' : 'warn'}`}><div className="insight-title">{ins.title}</div><div className="insight-body">{ins.detail}</div></div>)}</div>}
      </div>
    </div>
  );
}
