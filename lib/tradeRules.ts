import {
  AIAnalysis, RedFlag, RuleResult, MarketSnapshot, MarketContext,
  PlaybookType, NEGATIVE_PLAYBOOKS,
} from './types'

// ----------------------------------------------------------------------------
// Hard rule thresholds — a trade must clear ALL of these to become a BUY.
// These are intentionally strict: the goal is to reject most setups.
// ----------------------------------------------------------------------------
export const HARD_RULES = {
  MIN_RISK_REWARD: 2.0,
  MIN_CONFIDENCE_SCORE: 70,
  MIN_LIQUIDITY_SCORE: 50,
  MIN_CATALYST_SCORE: 40,
  MIN_CATALYST_FRESHNESS: 40,
  MIN_MOMENTUM_SCORE: 50,
  MIN_RELATIVE_VOLUME: 1.5,
  MAX_STOP_LOSS_PCT: 0.08,
  MAX_EXTENSION_ABOVE_VWAP_PCT: 0.07,   // price more than 7% over VWAP = chasing
  MAX_SPREAD_PCT: 0.01,                 // 1% spread is the ceiling for liquidity
  MAX_MODEL_DISAGREEMENT: 40,
  // "Do not chase" thresholds (#5)
  MAX_EXTENSION_ABOVE_EMA5_PCT: 0.05,   // > 5% above 5-min EMA(9) = extended
  MAX_RANGE_USED_PCT: 0.70,             // > 70% of avg daily range already used
  MAX_HALT_RISK: 'HIGH' as const,       // reject HIGH halt risk
  MAX_MINUTES_SINCE_CATALYST: 240,      // catalyst older than 4h intraday = stale
}

interface RuleContext {
  snapshot?: MarketSnapshot
  market?: MarketContext
}

export function applyHardRules(analysis: AIAnalysis, ctx: RuleContext = {}): RuleResult {
  const violations: string[] = []
  const red_flags: RedFlag[] = []
  const snap = ctx.snapshot || analysis.snapshot
  const market = ctx.market

  const flag = (type: string, message: string, severity: RedFlag['severity']) =>
    red_flags.push({ type, message, severity })

  // Rule: a clear, tradeable playbook must be detected
  if (!analysis.playbook || analysis.playbook === 'NONE') {
    violations.push('No clear momentum playbook detected')
    flag('NO_PLAYBOOK', 'No recognizable setup — nothing to trade', 'HIGH')
  } else if (NEGATIVE_PLAYBOOKS.includes(analysis.playbook)) {
    violations.push(`Playbook "${analysis.playbook}" is a disqualifying/short-side setup`)
    flag('NEGATIVE_PLAYBOOK', `Detected ${analysis.playbook} — not a long-momentum entry`, 'HIGH')
  }

  // Rule: reward/risk >= 2:1
  if (analysis.risk_reward_ratio < HARD_RULES.MIN_RISK_REWARD) {
    violations.push(`Reward/risk ${analysis.risk_reward_ratio.toFixed(2)} below 2:1`)
    flag('BAD_RISK_REWARD', `R/R ${analysis.risk_reward_ratio.toFixed(2)} — need >= 2.0`, 'HIGH')
  }

  // Rule: catalyst must be clear AND fresh
  if (analysis.catalyst_score < HARD_RULES.MIN_CATALYST_SCORE) {
    violations.push('Catalyst unclear or too weak')
    flag('WEAK_CATALYST', `Catalyst score ${analysis.catalyst_score} < ${HARD_RULES.MIN_CATALYST_SCORE}`, 'HIGH')
  }
  if (analysis.catalyst_freshness_score < HARD_RULES.MIN_CATALYST_FRESHNESS) {
    violations.push('Catalyst is stale — news is old')
    flag('STALE_CATALYST', `Catalyst freshness ${analysis.catalyst_freshness_score} — move may be late`, 'HIGH')
  }

  // Rule: liquidity
  if (analysis.liquidity_score < HARD_RULES.MIN_LIQUIDITY_SCORE) {
    violations.push('Poor liquidity')
    flag('POOR_LIQUIDITY', 'Liquidity too low for reliable execution', 'HIGH')
  }

  // Rule: relative volume must confirm the move
  if (snap && snap.relative_volume < HARD_RULES.MIN_RELATIVE_VOLUME) {
    violations.push(`Relative volume ${snap.relative_volume.toFixed(2)}x is weak (need >= ${HARD_RULES.MIN_RELATIVE_VOLUME}x)`)
    flag('WEAK_RVOL', `RVOL ${snap.relative_volume.toFixed(2)}x — move not confirmed by volume`, 'HIGH')
  }

  // Rule: spread must be tight
  if (snap && snap.spread_pct != null && snap.spread_pct > HARD_RULES.MAX_SPREAD_PCT) {
    violations.push(`Spread ${(snap.spread_pct * 100).toFixed(2)}% too wide`)
    flag('WIDE_SPREAD', `Spread ${(snap.spread_pct * 100).toFixed(2)}% — execution cost too high`, 'HIGH')
  }

  // Rule: not overextended above VWAP (chasing)
  if (snap && snap.vwap && snap.vwap > 0) {
    const extAbove = (analysis.entry_price - snap.vwap) / snap.vwap
    if (extAbove > HARD_RULES.MAX_EXTENSION_ABOVE_VWAP_PCT) {
      violations.push(`Entry ${(extAbove * 100).toFixed(1)}% above VWAP — chasing an extended move`)
      flag('EXTENDED_VWAP', `${(extAbove * 100).toFixed(1)}% above VWAP — overextended`, 'HIGH')
    }
  }

  // ---- "Do not chase" intraday rules (#5) ----
  const intr = snap?.intraday
  if (intr) {
    // Too far above 5-min EMA(9)
    if (intr.pct_from_ema5 != null && intr.pct_from_ema5 > HARD_RULES.MAX_EXTENSION_ABOVE_EMA5_PCT) {
      violations.push(`Price ${(intr.pct_from_ema5 * 100).toFixed(1)}% above 5-min EMA — too extended to chase`)
      flag('EXTENDED_EMA5', `${(intr.pct_from_ema5 * 100).toFixed(1)}% above 5m EMA(9)`, 'HIGH')
    }
    // Already used most of the average daily range
    if (intr.range_used_pct != null && intr.range_used_pct > HARD_RULES.MAX_RANGE_USED_PCT) {
      violations.push(`Used ${(intr.range_used_pct * 100).toFixed(0)}% of avg daily range — limited upside left`)
      flag('RANGE_EXHAUSTED', `${(intr.range_used_pct * 100).toFixed(0)}% of ADR used — exhausted`, 'HIGH')
    }
    // Halt risk
    if (intr.halt_risk === 'HIGH') {
      violations.push(`High halt risk — ${intr.halt_risk_reason || 'volatility halt likely'}`)
      flag('HALT_RISK', intr.halt_risk_reason || 'High halt risk', 'HIGH')
    } else if (intr.halt_risk === 'MEDIUM') {
      flag('HALT_RISK', intr.halt_risk_reason || 'Elevated halt risk', 'MEDIUM')
    }
    // VWAP rejection / parabolic exhaustion playbooks are non-tradeable longs
    if (intr.vwap_rejection) {
      flag('VWAP_REJECTION', 'Price rejected at VWAP from above', 'MEDIUM')
    }
    // Stale intraday catalyst
    if (intr.minutes_since_catalyst != null && intr.minutes_since_catalyst > HARD_RULES.MAX_MINUTES_SINCE_CATALYST) {
      violations.push(`Catalyst is ${intr.minutes_since_catalyst}m old — move likely already played out`)
      flag('STALE_INTRADAY_CATALYST', `Catalyst ${intr.minutes_since_catalyst}m old`, 'MEDIUM')
    }
  }

  // Rule: stop width realistic
  if (analysis.entry_price > 0 && analysis.stop_loss > 0) {
    const stopPct = Math.abs(analysis.entry_price - analysis.stop_loss) / analysis.entry_price
    if (stopPct > HARD_RULES.MAX_STOP_LOSS_PCT) {
      violations.push(`Stop ${(stopPct * 100).toFixed(1)}% too wide (max ${HARD_RULES.MAX_STOP_LOSS_PCT * 100}%)`)
      flag('WIDE_STOP', `Stop ${(stopPct * 100).toFixed(1)}% away — unrealistic risk`, 'HIGH')
    }
    if (analysis.stop_loss >= analysis.entry_price) {
      violations.push('Stop loss is not below entry — invalid stop placement')
      flag('INVALID_STOP', 'Stop not placed below entry', 'HIGH')
    }
  }

  // Rule: confidence
  if (analysis.confidence_score < HARD_RULES.MIN_CONFIDENCE_SCORE) {
    violations.push(`Confidence ${analysis.confidence_score} < ${HARD_RULES.MIN_CONFIDENCE_SCORE}`)
    flag('LOW_CONFIDENCE', `Committee confidence ${analysis.confidence_score}% below threshold`, 'HIGH')
  }

  // Rule: momentum present
  if (analysis.momentum_score < HARD_RULES.MIN_MOMENTUM_SCORE) {
    violations.push(`Momentum ${analysis.momentum_score} < ${HARD_RULES.MIN_MOMENTUM_SCORE}`)
    flag('WEAK_MOMENTUM', `Momentum score ${analysis.momentum_score} — move fading`, 'MEDIUM')
  }

  // Rule: valid price data
  if (!analysis.entry_price || analysis.entry_price <= 0) {
    violations.push('Missing valid entry price')
    flag('MISSING_DATA', 'No valid entry price', 'HIGH')
  }

  // Rule: market direction must not conflict with a long
  if (market) {
    const conflict = market.spy_trend === 'DOWN' && market.qqq_trend === 'DOWN'
    if (conflict) {
      violations.push('Market is in a downtrend (SPY & QQQ down) — conflicts with long momentum')
      flag('MARKET_CONFLICT', 'SPY and QQQ both trending down', 'HIGH')
    } else if (market.spy_trend === 'DOWN' || market.qqq_trend === 'DOWN') {
      flag('MARKET_HEADWIND', 'One major index trending down — reduced conviction', 'MEDIUM')
    }
  }

  // Rule: exhaustion
  if (analysis.claude_output?.is_exhausted) {
    violations.push('Move appears exhausted')
    flag('EXHAUSTED', 'Committee flags the move as already exhausted', 'HIGH')
  }

  // Rule: model disagreement
  if (analysis.gemini_output && analysis.gpt_output) {
    const gap = Math.abs(analysis.gemini_output.momentum_score - analysis.gpt_output.confidence_score)
    if (gap > HARD_RULES.MAX_MODEL_DISAGREEMENT) {
      violations.push('Models disagree significantly')
      flag('AI_DISAGREEMENT', `Gemini vs GPT differ by ${gap} points`, 'MEDIUM')
    }
  }

  // Rule: failed pipeline
  if (analysis.failed) {
    violations.push('AI pipeline failed — cannot approve')
    flag('PIPELINE_FAILED', analysis.failure_reason || 'A model failed to return valid output', 'HIGH')
  }

  // Non-blocking informational flags
  if (analysis.claude_output?.is_extended)
    flag('OVEREXTENDED', 'Stock appears overextended — chase risk', 'MEDIUM')
  if (analysis.claude_output?.hype_only)
    flag('HYPE_ONLY', 'Move appears hype-driven', 'MEDIUM')
  if (analysis.claude_output?.volume_fading)
    flag('FADING_VOLUME', 'Volume declining — momentum may be ending', 'MEDIUM')

  return { passed: violations.length === 0, violations, red_flags }
}

// ----------------------------------------------------------------------------
// Position sizing — risk a fixed % of account on the stop distance.
// ----------------------------------------------------------------------------
export function calculatePositionSize(
  accountBalance: number,
  entryPrice: number,
  stopLoss: number,
  riskPct = 0.02
): { shares: number; amount: number; max_loss: number } {
  const risk_amount = accountBalance * riskPct
  const stop_distance = Math.abs(entryPrice - stopLoss)
  if (stop_distance <= 0 || entryPrice <= 0) return { shares: 0, amount: 0, max_loss: 0 }
  let shares = Math.floor(risk_amount / stop_distance)
  // Never allocate more than 25% of the account to a single position
  const maxByCapital = Math.floor((accountBalance * 0.25) / entryPrice)
  shares = Math.min(shares, maxByCapital)
  const amount = shares * entryPrice
  const max_loss = shares * stop_distance
  return { shares, amount, max_loss }
}

// ----------------------------------------------------------------------------
// Trade grading
// ----------------------------------------------------------------------------
export function gradeTradeResult(
  entry_price: number,
  exit_price: number,
  stop_loss: number,
  take_profit_1: number,
  confidence_score: number,
  exit_reason: string
): { grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'; score: number; breakdown: Record<string, number> } {
  const breakdown: Record<string, number> = {}
  const return_pct = entry_price > 0 ? (exit_price - entry_price) / entry_price * 100 : 0

  if (return_pct > 10) breakdown.profitability = 40
  else if (return_pct > 5) breakdown.profitability = 35
  else if (return_pct > 2) breakdown.profitability = 25
  else if (return_pct > 0) breakdown.profitability = 15
  else if (return_pct > -2) breakdown.profitability = 5
  else breakdown.profitability = 0

  if (exit_reason === 'TARGET_HIT') breakdown.risk_management = 20
  else if (exit_reason === 'STOP_LOSS_HIT' || exit_reason === 'TRAILING_STOP_HIT') breakdown.risk_management = 15
  else if ((exit_reason === 'MANUAL_EXIT' || exit_reason === 'TIME_EXIT') && return_pct > 0) breakdown.risk_management = 12
  else breakdown.risk_management = 5

  if (exit_reason === 'TARGET_HIT') breakdown.exit_quality = 20
  else if (exit_reason === 'TP1_PARTIAL') breakdown.exit_quality = 18
  else if (exit_reason === 'TRAILING_STOP_HIT') breakdown.exit_quality = 16
  else if (exit_reason === 'AI_REVERSAL') breakdown.exit_quality = 15
  else if (exit_reason === 'STOP_LOSS_HIT') breakdown.exit_quality = 12
  else breakdown.exit_quality = 8

  const ai_right = return_pct > 0
  if (ai_right && confidence_score >= 80) breakdown.ai_accuracy = 20
  else if (ai_right && confidence_score >= 70) breakdown.ai_accuracy = 15
  else if (!ai_right && confidence_score < 70) breakdown.ai_accuracy = 10
  else breakdown.ai_accuracy = 5

  const score = Object.values(breakdown).reduce((a, b) => a + b, 0)
  let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'
  if (score >= 90) grade = 'A+'
  else if (score >= 80) grade = 'A'
  else if (score >= 70) grade = 'B'
  else if (score >= 55) grade = 'C'
  else if (score >= 40) grade = 'D'
  else grade = 'F'
  return { grade, score, breakdown }
}

// ----------------------------------------------------------------------------
// Deterministic playbook classifier from real market data (no AI, no random).
// Used as a baseline/fallback and to cross-check the AI's classification.
// ----------------------------------------------------------------------------
export function classifyPlaybook(snap: MarketSnapshot): PlaybookType {
  const { change_pct, premarket_change_pct, relative_volume, vwap, price,
          previous_close, day_high, float_shares, catalyst } = snap
  const cat = (catalyst || '').toLowerCase()
  const aboveVwap = vwap ? price >= vwap : true
  const extendedAboveVwap = vwap ? (price - vwap) / vwap > 0.07 : false
  const nearHigh = day_high > 0 ? price >= day_high * 0.985 : false
  const gapPct = previous_close > 0 ? (snap.open - previous_close) / previous_close : 0

  // ---- Intraday playbooks take priority when candle data is available (#4) ----
  const intr = snap.intraday
  if (intr) {
    // Parabolic exhaustion: extended above EMA5 and most of ADR used
    if ((intr.pct_from_ema5 != null && intr.pct_from_ema5 > 0.06) &&
        (intr.range_used_pct != null && intr.range_used_pct > 0.8))
      return 'PARABOLIC_EXHAUSTION'

    // VWAP rejection: failed at VWAP from above
    if (intr.vwap_rejection && !intr.vwap_reclaim)
      return 'VWAP_REJECTION'

    // VWAP reclaim: crossed back above VWAP, not overextended
    if (intr.vwap_reclaim && intr.pct_from_vwap != null &&
        intr.pct_from_vwap >= 0 && intr.pct_from_vwap < 0.04)
      return 'VWAP_RECLAIM'

    // Pre-market high break
    if (intr.premarket_high != null && price >= intr.premarket_high &&
        previous_close > 0 && (price - previous_close) / previous_close > 0.02)
      return 'PREMARKET_HIGH_BREAK'

    // Opening range breakout: broke OR high while still early in the session
    if (intr.opening_range_high != null && price >= intr.opening_range_high &&
        aboveVwap && relative_volume > 1.5)
      return 'OPENING_RANGE_BREAKOUT'

    // News spike continuation: fresh catalyst, above VWAP, strong RVOL, not exhausted
    if (intr.minutes_since_catalyst != null && intr.minutes_since_catalyst < 120 &&
        aboveVwap && relative_volume > 2 &&
        (intr.range_used_pct == null || intr.range_used_pct < 0.7))
      return 'NEWS_SPIKE_CONTINUATION'

    // Failed breakout: lost VWAP after being up
    if (vwap && price < vwap && day_high > 0 && price < day_high * 0.95 && change_pct > 0)
      return 'FAILED_BREAKOUT'
  }

  // Overextended chase risk dominates
  if (extendedAboveVwap && change_pct > 12) return 'OVEREXTENDED_CHASE_RISK'

  // Failed breakout: was up, now below VWAP and well off highs
  if (vwap && price < vwap && day_high > 0 && price < day_high * 0.95 && change_pct > 0)
    return 'FAILED_BREAKOUT'

  // Reversal/fade: red on day but elevated volume
  if (change_pct < -2 && relative_volume > 1.5) return 'REVERSAL_FADE_RISK'

  if (cat.includes('earnings')) return 'EARNINGS_MOMENTUM'
  if (cat.includes('upgrade') || cat.includes('analyst') || cat.includes('price target'))
    return 'ANALYST_UPGRADE_MOMENTUM'

  // Low float squeeze
  if (float_shares != null && float_shares < 20_000_000 && relative_volume > 3 && change_pct > 8)
    return 'LOW_FLOAT_SQUEEZE'

  // Gap and go
  if ((premarket_change_pct != null && premarket_change_pct > 3) || gapPct > 0.03) {
    if (aboveVwap && nearHigh) return 'GAP_AND_GO'
  }

  // News catalyst momentum
  if (cat && cat !== 'high volume momentum' && cat !== 'none' && relative_volume > 1.5 && aboveVwap)
    return 'NEWS_CATALYST_MOMENTUM'

  // Breakout continuation
  if (nearHigh && aboveVwap && relative_volume > 1.5 && change_pct > 2)
    return 'BREAKOUT_CONTINUATION'

  // Sector sympathy
  if (snap.sector_performance_pct != null && snap.sector_performance_pct > 2 && change_pct > 2)
    return 'SECTOR_SYMPATHY'

  return 'NONE'
}
