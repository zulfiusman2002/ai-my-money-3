import { useState } from 'react'
import { ValidationReport, RealismConfig, PLAYBOOK_LABELS } from '../../lib/types'
import { CheckCircle, XCircle, Settings2, ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  validation: ValidationReport
  config: RealismConfig
  onConfigChange: (c: RealismConfig) => void
}

function YesNo({ value }: { value: boolean | null }) {
  if (value === null) return <span className="text-slate-500 text-xs">insufficient data</span>
  return value
    ? <span className="text-signal-green text-xs font-bold flex items-center gap-1"><CheckCircle size={12} /> Yes</span>
    : <span className="text-signal-red text-xs font-bold flex items-center gap-1"><XCircle size={12} /> No</span>
}

export function ValidationPanel({ validation: v, config, onConfigChange }: Props) {
  const [showConfig, setShowConfig] = useState(false)

  const questions: { q: string; a: React.ReactNode }[] = [
    { q: 'Is this strategy profitable after slippage & fees?', a: <YesNo value={v.expectancy_after_costs_positive} /> },
    { q: 'Is it better than random buying of top gainers?', a: <YesNo value={v.beats_random_gainers} /> },
    { q: 'Is it better than simply buying QQQ/SPY?', a: <YesNo value={v.beats_qqq} /> },
    {
      q: 'Which setup type works best?',
      a: v.best_playbook
        ? <span className="text-xs text-white">{PLAYBOOK_LABELS[v.best_playbook.playbook]} <span className="text-slate-500">(+${v.best_playbook.expectancy.toFixed(0)}/trade, n={v.best_playbook.trades})</span></span>
        : <span className="text-slate-500 text-xs">need ≥5 trades per playbook</span>,
    },
    {
      q: 'Which committee call is most accurate?',
      a: v.best_model
        ? <span className="text-xs text-white">{v.best_model.model} <span className="text-slate-500">({v.best_model.accuracy.toFixed(0)}%, n={v.best_model.decisions})</span></span>
        : <span className="text-slate-500 text-xs">need resolved outcomes</span>,
    },
    {
      q: 'Which score range actually makes money?',
      a: v.best_score_band
        ? <span className="text-xs text-white">{v.best_score_band.band} <span className="text-slate-500">(+${v.best_score_band.expectancy.toFixed(0)}/trade, n={v.best_score_band.trades})</span></span>
        : <span className="text-slate-500 text-xs">need ≥5 trades per band</span>,
    },
    { q: 'Is it ready for real-money testing?', a: <YesNo value={v.ready_for_real_money} /> },
  ]

  return (
    <div className="space-y-5">
      {/* Verdict banner */}
      <div className={`card border-2 ${v.ready_for_real_money ? 'border-signal-green border-opacity-40' : 'border-signal-red border-opacity-40'}`}>
        <div className="flex items-start gap-3">
          {v.ready_for_real_money
            ? <CheckCircle size={24} className="text-signal-green shrink-0" />
            : <XCircle size={24} className="text-signal-red shrink-0" />}
          <div className="flex-1">
            <p className={`text-lg font-bold ${v.ready_for_real_money ? 'text-signal-green' : 'text-signal-red'}`}>
              {v.ready_for_real_money ? 'Cautiously testable with small size' : 'NOT READY FOR REAL MONEY'}
            </p>
            <p className="text-sm text-slate-400 mt-1">{v.verdict}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              <span className="text-slate-500">Real closed trades: <span className="font-mono text-white">{v.closed_trades}/{v.required_trades}</span></span>
              <span className="text-slate-500">Net expectancy: <span className={`font-mono ${v.net_expectancy > 0 ? 'text-signal-green' : 'text-signal-red'}`}>{v.net_expectancy >= 0 ? '+' : ''}${v.net_expectancy.toFixed(2)}</span></span>
              <span className="text-slate-500">Profit factor: <span className={`font-mono ${v.profit_factor_ok ? 'text-signal-green' : 'text-signal-red'}`}>{v.profit_factor >= 999 ? 'n/a' : v.profit_factor.toFixed(2)}</span></span>
              <span className="text-slate-500">Max DD: <span className={`font-mono ${v.max_drawdown_ok ? 'text-signal-green' : 'text-signal-red'}`}>{v.max_drawdown_pct.toFixed(1)}%</span></span>
            </div>
            {v.reasons.length > 0 && (
              <ul className="mt-3 space-y-1">
                {v.reasons.map((r, i) => (
                  <li key={i} className="text-xs text-slate-400 flex gap-1.5"><span className="text-slate-600">•</span>{r}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Real-money evidence gate (#7) */}
      <div className="card">
        <h3 className="text-sm font-bold text-white mb-1">Minimum Evidence Gate</h3>
        <p className="text-xs text-slate-500 mb-3">All five must pass before "ready for real money" can ever show.</p>
        <div className="space-y-2">
          {v.gate_checklist.map((g, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded bg-terminal-muted">
              <div className="flex items-center gap-2">
                {g.passed
                  ? <CheckCircle size={14} className="text-signal-green shrink-0" />
                  : <XCircle size={14} className="text-signal-red shrink-0" />}
                <span className="text-xs text-slate-300">{g.label}</span>
              </div>
              <span className={`text-xs font-mono ${g.passed ? 'text-signal-green' : 'text-slate-400'}`}>{g.detail}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top-gainers benchmark (#6) */}
      {v.topgainers_baseline && (
        <div className="card">
          <h3 className="text-sm font-bold text-white mb-1">Edge vs Top-5 Gainers Baseline</h3>
          <p className="text-xs text-slate-500 mb-3">Committee BUYs vs simply buying the top 5 gainers at scan time (day-2 forward return).</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-lg bg-terminal-muted">
              <p className="text-xs text-slate-500">Committee BUYs</p>
              <p className={`text-lg font-mono font-bold ${v.topgainers_baseline.strategy_avg_return >= 0 ? 'text-signal-green' : 'text-signal-red'}`}>
                {v.topgainers_baseline.strategy_avg_return >= 0 ? '+' : ''}{v.topgainers_baseline.strategy_avg_return.toFixed(2)}%
              </p>
              <p className="text-xs text-slate-600">n={v.topgainers_baseline.strategy_n}</p>
            </div>
            <div className="p-3 rounded-lg bg-terminal-muted">
              <p className="text-xs text-slate-500">Top-5 baseline</p>
              <p className={`text-lg font-mono font-bold ${v.topgainers_baseline.baseline_avg_return >= 0 ? 'text-slate-300' : 'text-signal-red'}`}>
                {v.topgainers_baseline.baseline_avg_return >= 0 ? '+' : ''}{v.topgainers_baseline.baseline_avg_return.toFixed(2)}%
              </p>
              <p className="text-xs text-slate-600">n={v.topgainers_baseline.baseline_n}</p>
            </div>
            <div className={`p-3 rounded-lg border ${v.topgainers_baseline.beats ? 'bg-signal-green bg-opacity-10 border-signal-green border-opacity-30' : 'bg-signal-red bg-opacity-10 border-signal-red border-opacity-30'}`}>
              <p className="text-xs text-slate-500">Edge</p>
              <p className={`text-lg font-mono font-bold ${v.topgainers_baseline.beats ? 'text-signal-green' : 'text-signal-red'}`}>
                {v.topgainers_baseline.edge >= 0 ? '+' : ''}{v.topgainers_baseline.edge.toFixed(2)}%
              </p>
              <p className="text-xs text-slate-600">{v.topgainers_baseline.beats ? 'beats baseline' : 'no edge'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Key questions */}
      <div className="card">
        <h3 className="text-sm font-bold text-white mb-3">Does it have edge?</h3>
        <div className="divide-y divide-terminal-border divide-opacity-50">
          {questions.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 gap-4">
              <span className="text-xs text-slate-300">{item.q}</span>
              <div className="shrink-0">{item.a}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Playbook breakdown */}
      {v.playbook_breakdown.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-bold text-white mb-3">Performance by Playbook</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-terminal-border text-slate-500">
                  <th className="text-left py-2 px-2">Playbook</th>
                  <th className="text-right py-2 px-2">Trades</th>
                  <th className="text-right py-2 px-2">Win %</th>
                  <th className="text-right py-2 px-2">Expectancy</th>
                  <th className="text-right py-2 px-2">Total P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-terminal-border divide-opacity-40">
                {v.playbook_breakdown.map(p => (
                  <tr key={p.playbook}>
                    <td className="py-2 px-2 text-slate-300">{PLAYBOOK_LABELS[p.playbook]}</td>
                    <td className="py-2 px-2 text-right font-mono text-slate-400">{p.trades}</td>
                    <td className="py-2 px-2 text-right font-mono text-slate-400">{p.win_rate.toFixed(0)}%</td>
                    <td className={`py-2 px-2 text-right font-mono ${p.expectancy >= 0 ? 'text-signal-green' : 'text-signal-red'}`}>{p.expectancy >= 0 ? '+' : ''}${p.expectancy.toFixed(0)}</td>
                    <td className={`py-2 px-2 text-right font-mono ${p.total_pnl >= 0 ? 'text-signal-green' : 'text-signal-red'}`}>{p.total_pnl >= 0 ? '+' : ''}${p.total_pnl.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Score bands */}
      <div className="card">
        <h3 className="text-sm font-bold text-white mb-3">Performance by Confidence Band</h3>
        <div className="grid grid-cols-3 gap-3">
          {v.score_bands.map(b => (
            <div key={b.band} className="p-3 rounded-lg bg-terminal-muted text-center">
              <p className="text-xs text-slate-500">{b.band}</p>
              <p className={`text-lg font-mono font-bold ${b.expectancy >= 0 ? 'text-signal-green' : 'text-signal-red'}`}>
                {b.trades > 0 ? `${b.expectancy >= 0 ? '+' : ''}$${b.expectancy.toFixed(0)}` : '—'}
              </p>
              <p className="text-xs text-slate-600">{b.trades} trades · {b.win_rate.toFixed(0)}% win</p>
            </div>
          ))}
        </div>
      </div>

      {/* Realism config */}
      <div className="card">
        <button onClick={() => setShowConfig(!showConfig)} className="w-full flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-bold text-white"><Settings2 size={14} /> Realism & Risk Controls</span>
          {showConfig ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
        </button>
        {showConfig && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
            <NumField label="Slippage %" value={config.slippage_pct * 100} step={0.05} onChange={v => onConfigChange({ ...config, slippage_pct: v / 100 })} />
            <NumField label="Fee / trade ($)" value={config.fee_per_trade} step={0.5} onChange={v => onConfigChange({ ...config, fee_per_trade: v })} />
            <NumField label="Risk / trade %" value={config.risk_per_trade_pct * 100} step={0.5} onChange={v => onConfigChange({ ...config, risk_per_trade_pct: v / 100 })} />
            <NumField label="Partial TP1 frac" value={config.partial_tp1_fraction} step={0.1} onChange={v => onConfigChange({ ...config, partial_tp1_fraction: v })} />
            <NumField label="Trailing stop %" value={config.trailing_stop_pct * 100} step={0.5} onChange={v => onConfigChange({ ...config, trailing_stop_pct: v / 100 })} />
            <NumField label="Time exit (days)" value={config.time_exit_days} step={1} onChange={v => onConfigChange({ ...config, time_exit_days: v })} />
            <NumField label="Max daily loss %" value={config.max_daily_loss_pct * 100} step={1} onChange={v => onConfigChange({ ...config, max_daily_loss_pct: v / 100 })} />
            <NumField label="Max trades / day" value={config.max_trades_per_day} step={1} onChange={v => onConfigChange({ ...config, max_trades_per_day: v })} />
            <NumField label="Cooldown losses" value={config.cooldown_losses} step={1} onChange={v => onConfigChange({ ...config, cooldown_losses: v })} />
          </div>
        )}
      </div>
    </div>
  )
}

function NumField({ label, value, step, onChange }: { label: string; value: number; step: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="text-xs text-slate-500 block mb-1">{label}</label>
      <input
        type="number" value={Number.isFinite(value) ? +value.toFixed(3) : 0} step={step}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-full bg-terminal-black border border-terminal-border rounded px-2 py-1 text-xs font-mono text-white focus:border-signal-green focus:outline-none"
      />
    </div>
  )
}
