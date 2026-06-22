import { PerformanceMetrics } from '../../lib/types'
import { TrendingUp, TrendingDown, DollarSign, Target, AlertTriangle, Award } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string | number
  sub?: string
  positive?: boolean
  negative?: boolean
  icon?: React.ReactNode
  highlight?: boolean
}

export function MetricCard({ label, value, sub, positive, negative, icon, highlight }: MetricCardProps) {
  const valueColor = positive ? 'text-signal-green' : negative ? 'text-signal-red' : 'text-white'
  
  return (
    <div className={`card-sm flex flex-col justify-between ${highlight ? 'border-signal-green border-opacity-30' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
        {icon && <div className="text-slate-600">{icon}</div>}
      </div>
      <div>
        <p className={`text-2xl font-mono font-bold ${valueColor}`}>{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

interface DashboardMetricsProps {
  metrics: PerformanceMetrics
}

export function DashboardMetrics({ metrics }: DashboardMetricsProps) {
  const fmtCurrency = (n: number) => {
    const abs = Math.abs(n)
    const sign = n < 0 ? '-' : n > 0 ? '+' : ''
    return `${sign}$${abs.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  }

  const fmtPct = (n: number) => {
    const sign = n < 0 ? '' : n > 0 ? '+' : ''
    return `${sign}${n.toFixed(1)}%`
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
      <MetricCard
        label="Virtual Balance"
        value={`$${metrics.virtual_balance.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
        sub="Starting: $100,000"
        icon={<DollarSign size={16} />}
        highlight={metrics.virtual_balance > 100000}
      />
      <MetricCard
        label="Daily P&L"
        value={fmtCurrency(metrics.daily_pnl)}
        sub={fmtPct(metrics.daily_pnl / 1000)}
        positive={metrics.daily_pnl > 0}
        negative={metrics.daily_pnl < 0}
        icon={metrics.daily_pnl >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
      />
      <MetricCard
        label="Weekly P&L"
        value={fmtCurrency(metrics.weekly_pnl)}
        sub={fmtPct(metrics.weekly_pnl / 1000)}
        positive={metrics.weekly_pnl > 0}
        negative={metrics.weekly_pnl < 0}
      />
      <MetricCard
        label="Monthly P&L"
        value={fmtCurrency(metrics.monthly_pnl)}
        sub={fmtPct(metrics.monthly_pnl / 1000)}
        positive={metrics.monthly_pnl > 0}
        negative={metrics.monthly_pnl < 0}
      />
      <MetricCard
        label="Win Rate"
        value={`${metrics.win_rate.toFixed(0)}%`}
        sub={`${metrics.closed_trades} closed trades`}
        positive={metrics.win_rate >= 55}
        negative={metrics.win_rate < 40}
        icon={<Target size={16} />}
      />
      <MetricCard
        label="Profit Factor"
        value={metrics.profit_factor.toFixed(2)}
        sub="Gross gain / gross loss"
        positive={metrics.profit_factor >= 1.5}
        negative={metrics.profit_factor < 1}
      />
      <MetricCard
        label="Open Trades"
        value={metrics.open_trades}
        sub={`${metrics.total_trades} total`}
      />
      <MetricCard
        label="Avg Return"
        value={fmtPct(metrics.avg_return)}
        sub="Per closed trade"
        positive={metrics.avg_return > 0}
        negative={metrics.avg_return < 0}
      />
      <MetricCard
        label="Max Drawdown"
        value={fmtPct(metrics.max_drawdown)}
        sub="Peak to trough"
        negative={metrics.max_drawdown < -10}
      />
      <MetricCard
        label="Best Trade"
        value={fmtCurrency(metrics.best_trade)}
        positive={metrics.best_trade > 0}
        icon={<Award size={16} />}
      />
      <MetricCard
        label="Worst Trade"
        value={fmtCurrency(metrics.worst_trade)}
        negative={metrics.worst_trade < 0}
        icon={<AlertTriangle size={16} />}
      />
      <MetricCard
        label="Win Streak"
        value={metrics.consecutive_wins}
        sub={`Loss streak: ${metrics.consecutive_losses}`}
        positive={metrics.consecutive_wins >= 3}
      />
    </div>
  )
}
