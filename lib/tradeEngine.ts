// ============================================================================
// Paper-trade realism engine: slippage, spread cost, fees, partial profit,
// trailing stop, time-based exit, plus daily-risk gating (max daily loss,
// max trades/day, cooldown after losing streak).
// ============================================================================
import {
  PaperTrade, AIAnalysis, RealismConfig, DEFAULT_REALISM, ExitReason, MarketSnapshot,
} from './types'
import { calculatePositionSize, gradeTradeResult } from './tradeRules'

export interface TradeGateResult {
  allowed: boolean
  reason: string
}

// Decide whether a new trade may be opened today, given prior trades + config.
export function checkTradeGate(
  trades: PaperTrade[],
  accountBalance: number,
  cfg: RealismConfig = DEFAULT_REALISM,
  now: Date = new Date()
): TradeGateResult {
  const todayStr = now.toISOString().slice(0, 10)
  const todays = trades.filter(t => (t.entry_date || '').slice(0, 10) === todayStr)

  if (todays.length >= cfg.max_trades_per_day) {
    return { allowed: false, reason: `Max trades per day reached (${cfg.max_trades_per_day})` }
  }

  // Max daily loss: sum realized pnl of today's closed trades
  const realizedToday = todays
    .filter(t => t.status === 'CLOSED')
    .reduce((s, t) => s + (t.pnl || 0), 0)
  if (realizedToday < 0 && Math.abs(realizedToday) >= accountBalance * cfg.max_daily_loss_pct) {
    return { allowed: false, reason: `Max daily loss hit (${(cfg.max_daily_loss_pct * 100).toFixed(0)}% of account)` }
  }

  // Cooldown after N consecutive losses (across all closed trades, most recent first)
  const closed = trades
    .filter(t => t.status === 'CLOSED')
    .sort((a, b) => new Date(b.exit_date || 0).getTime() - new Date(a.exit_date || 0).getTime())
  let streak = 0
  for (const t of closed) {
    if ((t.pnl || 0) < 0) streak++
    else break
  }
  if (streak >= cfg.cooldown_losses) {
    // Block the next N trades after the streak: count trades opened since the streak began
    const lossesToConsider = closed.slice(0, streak)
    const lastLossTime = lossesToConsider.length
      ? new Date(lossesToConsider[0].exit_date || 0).getTime() : 0
    const tradesSince = trades.filter(t => new Date(t.entry_date).getTime() > lastLossTime).length
    if (tradesSince < cfg.cooldown_trades_blocked) {
      return {
        allowed: false,
        reason: `Cooldown active after ${streak} consecutive losses — pausing new entries`,
      }
    }
  }

  return { allowed: true, reason: '' }
}

// Open a paper trade from an approved analysis, applying entry slippage/spread/fees.
export function openPaperTrade(
  analysis: AIAnalysis,
  accountBalance: number,
  cfg: RealismConfig = DEFAULT_REALISM
): PaperTrade {
  const intended = analysis.entry_price
  const snap = analysis.snapshot
  // Slippage pushes entry up (worse) for a long
  const slipPerShare = intended * cfg.slippage_pct
  // Half-spread cost if available
  const spreadPerShare = cfg.use_spread_cost && snap?.spread_pct
    ? intended * (snap.spread_pct / 2) : 0
  const fill = +(intended + slipPerShare + spreadPerShare).toFixed(4)

  const { shares, amount } = calculatePositionSize(
    accountBalance, fill, analysis.stop_loss, cfg.risk_per_trade_pct
  )
  const feeFlat = cfg.fee_per_trade
  const feePct = amount * cfg.fee_pct
  const fees = +(feeFlat + feePct).toFixed(2)
  const slippage_cost = +(slipPerShare * shares).toFixed(2)
  const spread_cost = +(spreadPerShare * shares).toFixed(2)

  return {
    id: `trade_${Date.now()}_${analysis.ticker}`,
    ticker: analysis.ticker, company: analysis.company, playbook: analysis.playbook,
    entry_date: new Date().toISOString(),
    intended_entry: intended,
    entry_price: fill,
    slippage_cost, spread_cost, fees,
    position_size: shares, virtual_amount: +amount.toFixed(2),
    stop_loss: analysis.stop_loss, initial_stop_loss: analysis.stop_loss,
    trailing_stop: null,
    take_profit_1: analysis.take_profit_1, take_profit_2: analysis.take_profit_2,
    tp1_filled: false,
    latest_price: fill,
    status: 'OPEN',
    max_holding_period: analysis.max_holding_period,
    confidence_score: analysis.confidence_score,
    analysis_id: analysis.ticker + '_' + analysis.analyzed_at,
    analysis_data: analysis,
    is_demo: analysis.is_demo,
  }
}

// Step a trade forward with a new price. Handles partial TP1, trailing stop,
// stop/target hits, and time-based exit. Returns the (possibly) updated trade.
export function stepTrade(
  trade: PaperTrade,
  price: number,
  cfg: RealismConfig = DEFAULT_REALISM,
  now: Date = new Date()
): PaperTrade {
  if (trade.status === 'CLOSED') return trade
  const t: PaperTrade = { ...trade, latest_price: price }

  // Activate / advance trailing stop once price moves up enough
  if (price > t.entry_price * (1 + cfg.trailing_stop_pct)) {
    const newTrail = +(price * (1 - cfg.trailing_stop_pct)).toFixed(4)
    t.trailing_stop = t.trailing_stop != null ? Math.max(t.trailing_stop, newTrail) : newTrail
  }

  // Partial profit at TP1
  if (!t.tp1_filled && price >= t.take_profit_1 && t.take_profit_1 > 0) {
    const partShares = Math.floor(t.position_size * cfg.partial_tp1_fraction)
    if (partShares > 0) {
      t.tp1_filled = true
      t.tp1_exit_price = +(price * (1 - cfg.slippage_pct)).toFixed(4) // exit slippage hurts
      t.tp1_shares = partShares
      // Move stop to breakeven after taking partial
      t.stop_loss = Math.max(t.stop_loss, t.entry_price)
    }
  }

  const timeExitMs = cfg.time_exit_days * 24 * 3600 * 1000
  const heldMs = now.getTime() - new Date(t.entry_date).getTime()

  let exit: ExitReason | null = null
  let exitPrice = price

  if (price >= t.take_profit_2 && t.take_profit_2 > 0) {
    exit = 'TARGET_HIT'; exitPrice = t.take_profit_2
  } else if (t.trailing_stop != null && price <= t.trailing_stop) {
    exit = 'TRAILING_STOP_HIT'; exitPrice = t.trailing_stop
  } else if (price <= t.stop_loss) {
    exit = t.tp1_filled ? 'TRAILING_STOP_HIT' : 'STOP_LOSS_HIT'; exitPrice = t.stop_loss
  } else if (heldMs >= timeExitMs) {
    exit = 'TIME_EXIT'; exitPrice = price
  }

  if (exit) return closeTrade(t, exitPrice, exit, cfg, now)
  return t
}

export function closeTrade(
  trade: PaperTrade,
  rawExitPrice: number,
  reason: ExitReason,
  cfg: RealismConfig = DEFAULT_REALISM,
  now: Date = new Date()
): PaperTrade {
  const t: PaperTrade = { ...trade }
  // Exit slippage (price received is slightly worse for a long sell)
  const exitFill = +(rawExitPrice * (1 - cfg.slippage_pct)).toFixed(4)

  const remainingShares = t.tp1_filled && t.tp1_shares
    ? t.position_size - t.tp1_shares : t.position_size

  // Gross PnL = partial fill (if any) + remaining
  let gross = 0
  if (t.tp1_filled && t.tp1_shares && t.tp1_exit_price) {
    gross += (t.tp1_exit_price - t.entry_price) * t.tp1_shares
  }
  gross += (exitFill - t.entry_price) * remainingShares

  const exitFees = cfg.fee_per_trade + exitFill * remainingShares * cfg.fee_pct
  const totalFees = t.fees + exitFees
  const net = gross - exitFees   // entry fees already excluded from cost basis; subtract exit fees

  t.exit_date = now.toISOString()
  t.exit_price = exitFill
  t.exit_reason = reason
  t.gross_pnl = +gross.toFixed(2)
  t.pnl = +(net).toFixed(2)
  t.fees = +totalFees.toFixed(2)
  t.return_pct = t.virtual_amount > 0 ? +((net / t.virtual_amount) * 100).toFixed(2) : 0
  t.holding_hours = +(((now.getTime() - new Date(t.entry_date).getTime()) / 3600000)).toFixed(1)
  t.status = 'CLOSED'
  t.latest_price = exitFill

  const g = gradeTradeResult(
    t.entry_price, exitFill, t.initial_stop_loss, t.take_profit_1, t.confidence_score, reason
  )
  t.grade = g.grade
  return t
}
