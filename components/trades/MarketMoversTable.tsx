import { MarketSnapshot, AIAnalysis, PLAYBOOK_LABELS, PlaybookType } from '../../lib/types'
import { DecisionBadge } from '../DecisionBadge'
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react'

interface ScanTableProps {
  snapshots: MarketSnapshot[]
  analyses: Record<string, AIAnalysis>
  scanStatus: Record<string, string>
  onSelect?: (analysis: AIAnalysis) => void
}

const NEGATIVE: PlaybookType[] = ['OVEREXTENDED_CHASE_RISK', 'FAILED_BREAKOUT', 'REVERSAL_FADE_RISK', 'NONE']

function PlaybookTag({ pb }: { pb?: PlaybookType }) {
  if (!pb) return <span className="text-xs text-slate-600">—</span>
  const bad = NEGATIVE.includes(pb)
  return (
    <span className={`text-xs px-2 py-0.5 rounded whitespace-nowrap ${bad ? 'bg-signal-red bg-opacity-10 text-signal-red' : 'bg-signal-blue bg-opacity-10 text-signal-blue'}`}>
      {PLAYBOOK_LABELS[pb]}
    </span>
  )
}

export function ScanTable({ snapshots, analyses, scanStatus, onSelect }: ScanTableProps) {
  if (snapshots.length === 0) {
    return (
      <div className="text-center py-16 text-slate-600">
        <TrendingUp size={40} className="mx-auto mb-3 opacity-30" />
        <p className="font-medium text-slate-500">No scan yet</p>
        <p className="text-sm mt-1">Click "Run AI Committee" to scan the market</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-terminal-border">
            {['Ticker', 'Price', 'Change', 'Pre-mkt', 'RVOL', 'VWAP', 'Spread', 'Playbook', 'Conf', 'Decision'].map(h => (
              <th key={h} className="text-left py-3 px-3 text-xs text-slate-500 font-medium uppercase tracking-wide whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-terminal-border divide-opacity-40">
          {snapshots.map(s => {
            const a = analyses[s.ticker]
            const status = scanStatus[s.ticker] || 'PENDING'
            const isPos = s.change_pct >= 0
            const aboveVwap = s.vwap ? s.price >= s.vwap : null
            return (
              <tr key={s.ticker} className="table-row-hover group cursor-pointer" onClick={() => a && onSelect?.(a)}>
                <td className="py-3 px-3">
                  <p className="font-mono font-bold text-white group-hover:text-signal-green transition-colors">{s.ticker}</p>
                  <p className="text-xs text-slate-500 max-w-28 truncate">{s.company}</p>
                </td>
                <td className="py-3 px-3 font-mono text-white font-semibold">${s.price?.toFixed(2)}</td>
                <td className="py-3 px-3">
                  <div className={`flex items-center gap-1 font-mono font-bold text-sm ${isPos ? 'text-signal-green' : 'text-signal-red'}`}>
                    {isPos ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {isPos ? '+' : ''}{s.change_pct?.toFixed(2)}%
                  </div>
                </td>
                <td className="py-3 px-3 font-mono text-xs text-slate-400">
                  {s.premarket_change_pct != null ? `${s.premarket_change_pct > 0 ? '+' : ''}${s.premarket_change_pct.toFixed(1)}%` : '—'}
                </td>
                <td className="py-3 px-3 font-mono text-xs">
                  <span className={s.relative_volume >= 1.5 ? 'text-signal-green' : 'text-slate-500'}>
                    {s.relative_volume ? `${s.relative_volume.toFixed(2)}x` : '—'}
                  </span>
                </td>
                <td className="py-3 px-3 font-mono text-xs">
                  {aboveVwap == null ? <span className="text-slate-600">—</span>
                    : <span className={aboveVwap ? 'text-signal-green' : 'text-signal-red'}>{aboveVwap ? 'ABOVE' : 'BELOW'}</span>}
                </td>
                <td className="py-3 px-3 font-mono text-xs">
                  {s.spread_pct != null
                    ? <span className={s.spread_pct > 0.01 ? 'text-signal-red' : 'text-slate-400'}>{(s.spread_pct * 100).toFixed(2)}%</span>
                    : <span className="text-slate-600">—</span>}
                </td>
                <td className="py-3 px-3"><PlaybookTag pb={a?.playbook} /></td>
                <td className="py-3 px-3 font-mono text-xs">
                  {a ? <span className={a.confidence_score >= 70 ? 'text-signal-green' : 'text-signal-amber'}>{a.confidence_score}</span>
                    : <span className="text-slate-600">—</span>}
                </td>
                <td className="py-3 px-3">
                  {a ? <DecisionBadge decision={a.decision} />
                    : status === 'SCANNING'
                      ? <span className="flex items-center gap-1.5 text-signal-blue text-xs"><Loader2 size={12} className="animate-spin" />Scanning</span>
                      : <DecisionBadge decision="PENDING" />}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
