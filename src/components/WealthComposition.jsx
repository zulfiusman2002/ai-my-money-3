import { fmtMoney } from '../lib/wealth';

export default function WealthComposition({ comp, sym, base }) {
  const f = (n) => fmtMoney(n, sym);
  const segs = [
    ['Liquid', comp.liquid, '#47C9AA'],
    ['Semi-liquid', comp.semi, '#7657F5'],
    ['Illiquid', comp.illiquid, '#65A8FF'],
  ].filter(([, v]) => v > 0);
  const gross = Math.max(1, comp.gross);
  return (
    <div className="card fade-up" style={{ marginBottom: 22, padding: 26 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div><div className="t-label">Net worth · {base}</div><div className="num-hero" style={{ marginTop: 6 }}>{f(comp.netWorth)}</div><p className="t-small">Total assets minus liabilities</p></div>
        <div style={{textAlign:'right'}}><div className="t-label">Total assets</div><div className="num-xl" style={{marginTop:6}}>{f(comp.gross)}</div><p className="t-small">Before liabilities</p></div>
      </div>
      <div style={{ display: 'flex', height: 12, borderRadius: 8, overflow: 'hidden', marginTop: 22, background: 'var(--c-border)' }}>
        {segs.map(([name,v,color])=><div key={name} title={`${name} ${f(v)}`} style={{width:`${(v/gross)*100}%`,background:color,transition:'width .8s ease'}}/>)}
      </div>
      <div style={{ display: 'flex', gap: 18, marginTop: 10, flexWrap: 'wrap' }}>
        {segs.map(([name,v,color])=><span key={name} className="t-small"><span style={{display:'inline-block',width:9,height:9,borderRadius:3,background:color,marginRight:6}}/>{name} {f(v)} · {((v/gross)*100).toFixed(0)}%</span>)}
      </div>
      <div className="grid g4" style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--c-border)' }}>
        {[
          ['Broker investments',f(comp.invested),'var(--c-ink)'],['Other assets',f(comp.nonBroker),'var(--c-ink)'],['Liabilities',`−${f(comp.totalLiabilities)}`,'var(--c-red)'],['Net worth',f(comp.netWorth),'var(--c-green)']
        ].map(([label,value,color])=><div key={label}><div className="t-label">{label}</div><div className="num-lg" style={{marginTop:5,color}}>{value}</div></div>)}
      </div>
    </div>
  );
}
