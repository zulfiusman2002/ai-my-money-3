import { PaperTrade, PerformanceMetrics } from './types'

const STARTING_BALANCE = 100000

export function calculateMetrics(trades: PaperTrade[]): PerformanceMetrics {
  const closed = trades.filter(t => t.status === 'CLOSED')
  const open = trades.filter(t => t.status === 'OPEN')

  const totalPnl = closed.reduce((s, t) => s + (t.pnl || 0), 0)
  const wins = closed.filter(t => (t.pnl || 0) > 0)
  const losses = closed.filter(t => (t.pnl || 0) <= 0)

  const grossGain = wins.reduce((s, t) => s + (t.pnl || 0), 0)
  const grossLoss = Math.abs(losses.reduce((s, t) => s + (t.pnl || 0), 0))

  const winRate = closed.length ? (wins.length / closed.length) * 100 : 0
  const avgReturn = closed.length
    ? closed.reduce((s, t) => s + (t.return_pct || 0), 0) / closed.length : 0
  const profitFactor = grossLoss > 0 ? grossGain / grossLoss : grossGain > 0 ? 999 : 0

  // Expectancy ($ per trade, net of costs)
  const expectancy = closed.length ? totalPnl / closed.length : 0

  // Expectancy in R multiples (pnl / initial risk per trade)
  const rMultiples = closed.map(t => {
    const risk = Math.abs(t.entry_price - t.initial_stop_loss) * t.position_size
    return risk > 0 ? (t.pnl || 0) / risk : 0
  })
  const expectancyR = rMultiples.length ? rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length : 0

  // Max drawdown over the closed-trade equity curve
  const ordered = [...closed].sort(
    (a, b) => new Date(a.exit_date || 0).getTime() - new Date(b.exit_date || 0).getTime()
  )
  let peak = STARTING_BALANCE, running = STARTING_BALANCE, maxDD = 0
  for (const t of ordered) {
    running += (t.pnl || 0)
    if (running > peak) peak = running
    const dd = ((running - peak) / peak) * 100
    if (dd < maxDD) maxDD = dd
  }

  const bestTrade = closed.length ? Math.max(...closed.map(t => t.pnl || 0)) : 0
  const worstTrade = closed.length ? Math.min(...closed.map(t => t.pnl || 0)) : 0

  let maxW = 0, maxL = 0, cw = 0, cl = 0
  for (const t of ordered) {
    if ((t.pnl || 0) > 0) { cw++; cl = 0; maxW = Math.max(maxW, cw) }
    else { cl++; cw = 0; maxL = Math.max(maxL, cl) }
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(today.getTime() - 7 * 86400000)
  const monthAgo = new Date(today.getTime() - 30 * 86400000)
  const sumSince = (d: Date) => closed
    .filter(t => t.exit_date && new Date(t.exit_date) >= d)
    .reduce((s, t) => s + (t.pnl || 0), 0)

  const totalFees = trades.reduce((s, t) => s + (t.fees || 0), 0)
  const totalSlippage = trades.reduce((s, t) => s + (t.slippage_cost || 0) + (t.spread_cost || 0), 0)
  const totalInvested = open.reduce((s, t) => s + t.virtual_amount, 0)

  return {
    total_trades: trades.length,
    open_trades: open.length,
    closed_trades: closed.length,
    win_rate: winRate,
    avg_return: avgReturn,
    expectancy,
    expectancy_r: expectancyR,
    profit_factor: profitFactor,
    max_drawdown: maxDD,
    best_trade: bestTrade,
    worst_trade: worstTrade,
    consecutive_wins: maxW,
    consecutive_losses: maxL,
    daily_pnl: sumSince(today),
    weekly_pnl: sumSince(weekAgo),
    monthly_pnl: sumSince(monthAgo),
    virtual_balance: STARTING_BALANCE + totalPnl,
    total_invested: totalInvested,
    total_pnl: totalPnl,
    total_fees: totalFees,
    total_slippage: totalSlippage,
  }
}
