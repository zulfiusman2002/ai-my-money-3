import { PaperTrade } from '../../lib/types'
import { DecisionBadge, GradeTag } from '../DecisionBadge'
import { ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react'

interface TradeJournalProps {
  trades: PaperTrade[]
  onSelectTrade?: (trade: PaperTrade) => void
  showClosed?: boolean
}

function PnLCell({ value, pct }: { value: number; pct: number }) {
  const isPos = value >= 0
  return (
    <div className={`text-right ${isPos ? 'text-signal-green' : 'text-signal-red'}`}>
      <p className="font-mono text-sm font-semibold">
        {isPos ? '+' : ''}{value.toFixed(2)}
      </p>
      <p className="font-mono text-xs opacity-70">
        {isPos ? '+' : ''}{pct.toFixed(2)}%
      </p>
    </div>
  )
}

function ExitReasonBadge({ reason }: { reason: string }) {
  const labels: Record<string, { label: string; color: string }> = {
    TARGET_HIT: { label: '✓ Target', color: 'text-signal-green' },
    TP1_PARTIAL: { label: '◐ Partial', color: 'text-signal-green' },
    STOP_LOSS_HIT: { label: '✕ Stop', color: 'text-signal-red' },
    TRAILING_STOP_HIT: { label: '↳ Trail', color: 'text-signal-amber' },
    MANUAL_EXIT: { label: '◉ Manual', color: 'text-signal-amber' },
    TIME_EXIT: { label: '⏱ Time', color: 'text-signal-blue' },
    AI_REVERSAL: { label: '⟳ AI Signal', color: 'text-purple-400' },
    MAX_DAILY_LOSS: { label: '⛔ Daily Loss', color: 'text-signal-red' },
  }
  const cfg = labels[reason] || { label: reason, color: 'text-slate-400' }
  return <span className={`text-xs font-mono ${cfg.color}`}>{cfg.label}</span>
}

export function TradeJournalTable({ trades, onSelectTrade, showClosed = false }: TradeJournalProps) {
  const filtered = showClosed 
    ? trades.filter(t => t.status === 'CLOSED')
    : trades.filter(t => t.status === 'OPEN')

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12 text-slate-600">
        <Clock size={32} className="mx-auto mb-3 opacity-40" />
        <p className="font-medium">{showClosed ? 'No closed trades yet' : 'No open trades'}</p>
        <p className="text-sm mt-1">Run the AI Committee to discover opportunities</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-terminal-border">
            {['Ticker', 'Entry', 'Size', 'Entry $', 'Stop', 'Target', 'Current', 'P&L', 
              showClosed ? 'Exit' : 'Hold Time', showClosed ? 'Grade' : 'Status'].map(h => (
              <th key={h} className="text-left py-2.5 px-3 text-xs text-slate-500 font-medium uppercase tracking-wide whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-terminal-border divide-opacity-50">
          {filtered.map(trade => {
            const pnl = trade.status === 'CLOSED' 
              ? (trade.pnl || 0)
              : (trade.latest_price - trade.entry_price) * trade.position_size
            const pct = trade.status === 'CLOSED'
              ? (trade.return_pct || 0)
              : ((trade.latest_price - trade.entry_price) / trade.entry_price) * 100
            const isProfit = pnl >= 0

            return (
              <tr
                key={trade.id}
                className="table-row-hover"
                onClick={() => onSelectTrade?.(trade)}
              >
                <td className="py-3 px-3">
                  <div>
                    <p className="font-mono font-bold text-white">{trade.ticker}</p>
                    <p className="text-xs text-slate-500 truncate max-w-24">{trade.company}</p>
                  </div>
                </td>
                <td className="py-3 px-3 text-xs text-slate-400 font-mono whitespace-nowrap">
                  {new Date(trade.entry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </td>
                <td className="py-3 px-3 font-mono text-slate-300">{trade.position_size}</td>
                <td className="py-3 px-3 font-mono text-slate-300">${trade.entry_price.toFixed(2)}</td>
                <td className="py-3 px-3 font-mono text-signal-red text-xs">${trade.stop_loss.toFixed(2)}</td>
                <td className="py-3 px-3 font-mono text-signal-green text-xs">${trade.take_profit_1.toFixed(2)}</td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-1">
                    <span className={`font-mono text-sm font-semibold ${isProfit ? 'text-signal-green' : 'text-signal-red'}`}>
                      ${trade.latest_price.toFixed(2)}
                    </span>
                    {isProfit 
                      ? <ArrowUpRight size={12} className="text-signal-green" />
                      : <ArrowDownRight size={12} className="text-signal-red" />
                    }
                  </div>
                </td>
                <td className="py-3 px-3">
                  <PnLCell value={pnl} pct={pct} />
                </td>
                <td className="py-3 px-3">
                  {showClosed && trade.exit_reason ? (
                    <ExitReasonBadge reason={trade.exit_reason} />
                  ) : (
                    <span className="text-xs text-slate-500 font-mono">
                      {trade.max_holding_period}
                    </span>
                  )}
                </td>
                <td className="py-3 px-3">
                  {showClosed && trade.grade ? (
                    <GradeTag grade={trade.grade} />
                  ) : (
                    <span className={`text-xs font-mono font-bold ${
                      trade.status === 'OPEN' ? 'text-signal-green' : 'text-slate-400'
                    }`}>
                      {trade.status}
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
