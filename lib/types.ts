// ============================================================================
// AI Momentum Trading Lab — Core Type System
// ============================================================================

// ----------------------------------------------------------------------------
// Playbook setup classification
// ----------------------------------------------------------------------------
export type PlaybookType =
  | 'GAP_AND_GO'
  | 'BREAKOUT_CONTINUATION'
  | 'NEWS_CATALYST_MOMENTUM'
  | 'EARNINGS_MOMENTUM'
  | 'ANALYST_UPGRADE_MOMENTUM'
  | 'SECTOR_SYMPATHY'
  | 'LOW_FLOAT_SQUEEZE'
  | 'OVEREXTENDED_CHASE_RISK'
  | 'FAILED_BREAKOUT'
  | 'REVERSAL_FADE_RISK'
  // Intraday playbooks
  | 'OPENING_RANGE_BREAKOUT'
  | 'VWAP_RECLAIM'
  | 'VWAP_REJECTION'
  | 'PREMARKET_HIGH_BREAK'
  | 'NEWS_SPIKE_CONTINUATION'
  | 'PARABOLIC_EXHAUSTION'
  | 'NONE'

export const PLAYBOOK_LABELS: Record<PlaybookType, string> = {
  GAP_AND_GO: 'Gap and Go',
  BREAKOUT_CONTINUATION: 'Breakout Continuation',
  NEWS_CATALYST_MOMENTUM: 'News Catalyst Momentum',
  EARNINGS_MOMENTUM: 'Earnings Momentum',
  ANALYST_UPGRADE_MOMENTUM: 'Analyst Upgrade Momentum',
  SECTOR_SYMPATHY: 'Sector Sympathy Move',
  LOW_FLOAT_SQUEEZE: 'Low-Float Squeeze',
  OVEREXTENDED_CHASE_RISK: 'Overextended Chase Risk',
  FAILED_BREAKOUT: 'Failed Breakout',
  REVERSAL_FADE_RISK: 'Reversal / Fade Risk',
  OPENING_RANGE_BREAKOUT: 'Opening Range Breakout',
  VWAP_RECLAIM: 'VWAP Reclaim',
  VWAP_REJECTION: 'VWAP Rejection',
  PREMARKET_HIGH_BREAK: 'Pre-market High Break',
  NEWS_SPIKE_CONTINUATION: 'News Spike Continuation',
  PARABOLIC_EXHAUSTION: 'Parabolic Exhaustion',
  NONE: 'No Clear Playbook',
}

// Playbooks that are inherently bearish / disqualifying for a long momentum trade
export const NEGATIVE_PLAYBOOKS: PlaybookType[] = [
  'OVEREXTENDED_CHASE_RISK',
  'FAILED_BREAKOUT',
  'REVERSAL_FADE_RISK',
  'VWAP_REJECTION',
  'PARABOLIC_EXHAUSTION',
  'NONE',
]

export type IndexTrend = 'UP' | 'DOWN' | 'FLAT'

// ----------------------------------------------------------------------------
// Market data snapshot (rich, from real provider)
// ----------------------------------------------------------------------------
export interface MarketSnapshot {
  ticker: string
  company: string
  // Pricing
  price: number               // real-time / last
  previous_close: number
  open: number
  day_high: number
  day_low: number
  vwap: number | null
  // Changes
  change_pct: number          // vs previous close
  premarket_change_pct: number | null
  // Volume
  volume: number
  avg_volume: number          // typically 30d avg
  relative_volume: number     // volume vs avg at this time of day (RVOL)
  // Spread / liquidity
  bid: number | null
  ask: number | null
  spread_pct: number | null
  // Fundamentals
  market_cap: number
  float_shares: number | null
  sector: string
  // Catalyst
  catalyst: string
  catalyst_source_url: string | null
  news_timestamp: string | null   // ISO; when the catalyst news broke
  // Context
  sector_performance_pct: number | null
  intraday_candles?: Candle[]
  // Intraday microstructure (computed from 1m/5m candles + session data)
  intraday?: IntradayMetrics
  // Meta
  data_source: 'polygon' | 'finnhub' | 'twelvedata' | 'alphavantage' | 'demo'
  is_demo: boolean
  fetched_at: string
}

export interface IntradayMetrics {
  candles_1m: Candle[]
  candles_5m: Candle[]
  // Opening range (first 5 minutes of the regular session)
  opening_range_high: number | null
  opening_range_low: number | null
  in_opening_range: boolean         // still within the first 5 min
  // Pre-market high
  premarket_high: number | null
  premarket_low: number | null
  // VWAP relationship
  vwap: number | null
  pct_from_vwap: number | null      // (price - vwap) / vwap
  vwap_reclaim: boolean             // price crossed back above VWAP after being below
  vwap_rejection: boolean           // price tagged VWAP from above and turned down
  // 5-min EMA(9)
  ema5: number | null
  pct_from_ema5: number | null
  // Relative volume by time of day
  rvol_time_of_day: number | null   // cumulative session vol / typical cumulative vol at this minute
  // Range exhaustion
  avg_daily_range: number | null    // ATR-style average daily $ range
  range_used_pct: number | null     // today's range as a fraction of avg daily range
  // Liquidity / halt risk
  spread_pct: number | null
  halt_risk: 'LOW' | 'MEDIUM' | 'HIGH'
  halt_risk_reason: string | null
  // Catalyst timing
  minutes_since_catalyst: number | null
  // Computed session
  session: 'PRE' | 'REGULAR' | 'AFTER' | 'CLOSED'
}

export interface Candle {
  t: number   // epoch ms
  o: number
  h: number
  l: number
  c: number
  v: number
}

export interface MarketContext {
  spy_trend: IndexTrend
  qqq_trend: IndexTrend
  spy_change_pct: number
  qqq_change_pct: number
  market_open: boolean
  session: 'PRE' | 'REGULAR' | 'AFTER' | 'CLOSED'
  data_source: string
  is_demo: boolean
  fetched_at: string
}

// Legacy alias retained for components still referencing MarketMover.
export interface MarketMover {
  id?: string
  ticker: string
  company: string
  price: number
  change_pct: number
  volume: number
  avg_volume: number
  volume_ratio: number
  sector: string
  market_cap: number
  catalyst: string
  // enriched
  snapshot?: MarketSnapshot
  playbook?: PlaybookType
  is_demo?: boolean
  momentum_score?: number
  catalyst_score?: number
  ai_status?: 'PENDING' | 'SCANNING' | 'ANALYZING' | 'REVIEWING' | 'COMPLETE' | 'FAILED'
  analysis?: AIAnalysis
  fetched_at?: string
}

// ----------------------------------------------------------------------------
// AI model audit logging
// ----------------------------------------------------------------------------
export interface ModelAuditEntry {
  model: 'gemini' | 'gpt' | 'claude'
  role: string
  system_prompt: string
  user_prompt: string
  raw_response: string
  parsed_ok: boolean
  parse_error?: string
  retries: number
  latency_ms: number
  is_demo: boolean
  model_name: string
  timestamp: string
}

// ----------------------------------------------------------------------------
// Per-model structured outputs
// ----------------------------------------------------------------------------
export interface GeminiOutput {
  ticker: string
  company: string
  playbook: PlaybookType
  momentum_score: number
  catalyst_score: number
  liquidity_score: number
  catalyst_freshness_score: number    // how fresh is the news (0-100)
  continuation_probability: number
  vwap_position: 'ABOVE' | 'BELOW' | 'AT' | 'UNKNOWN'
  rvol_assessment: 'STRONG' | 'MODERATE' | 'WEAK'
  scanner_summary: string
  unusual_volume: boolean
  gap_direction: 'UP' | 'DOWN' | 'NONE'
  news_catalyst: string
  sector_strength: number
  breakout_level: number | null
  relative_strength: number
  is_demo?: boolean
}

export interface GPTOutput {
  ticker: string
  playbook: PlaybookType
  bull_case: string
  bear_case: string
  risk_score: number
  confidence_score: number
  suggested_entry: number
  suggested_stop_loss: number
  suggested_target_1: number
  suggested_target_2: number
  risk_reward_ratio: number
  entry_timing: string                // when/how to enter
  volume_confirmation: 'CONFIRMED' | 'WEAK' | 'ABSENT'
  vwap_position: 'ABOVE' | 'BELOW' | 'AT' | 'UNKNOWN'
  spread_risk: 'LOW' | 'MEDIUM' | 'HIGH'
  move_exhausted: boolean
  realistic_upside_pct: number         // expected upside over the holding window
  expected_holding: '1D' | '2D' | '3D' | '5D'
  analyst_summary: string
  catalyst_quality: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'
  technical_setup: string
  trend_strength: number
  is_demo?: boolean
}

export interface ApprovedTradePlan {
  entry_price: number
  stop_loss: number
  take_profit_1: number
  take_profit_2: number
  max_holding_period: string
  position_sizing_note: string
}

export interface ClaudeOutput {
  ticker: string
  playbook: PlaybookType
  decision: 'BUY' | 'WATCH' | 'REJECT'
  final_confidence_score: number
  key_risks: string[]
  rejection_reason: string
  approved_trade_plan: ApprovedTradePlan | null
  final_notes: string
  // risk flags
  is_exhausted: boolean
  is_extended: boolean
  catalyst_weak: boolean
  catalyst_stale: boolean
  volume_fading: boolean
  poor_liquidity: boolean
  stop_too_wide: boolean
  spread_too_wide: boolean
  extended_above_vwap: boolean
  market_conflict: boolean
  hype_only: boolean
  is_demo?: boolean
}

// ----------------------------------------------------------------------------
// Combined analysis
// ----------------------------------------------------------------------------
export interface AIAnalysis {
  ticker: string
  company: string
  decision: 'BUY' | 'WATCH' | 'REJECT'
  playbook: PlaybookType
  momentum_score: number
  catalyst_score: number
  liquidity_score: number
  catalyst_freshness_score: number
  risk_score: number
  confidence_score: number
  continuation_probability: number
  entry_price: number
  stop_loss: number
  take_profit_1: number
  take_profit_2: number
  risk_reward_ratio: number
  realistic_upside_pct: number
  max_holding_period: '1D' | '2D' | '3D' | '5D'
  bull_case: string
  bear_case: string
  key_risks: string[]
  red_flags: RedFlag[]
  rejection_reason: string
  reasoning: string
  final_notes: string
  // provenance
  snapshot?: MarketSnapshot
  gemini_output?: GeminiOutput
  gpt_output?: GPTOutput
  claude_output?: ClaudeOutput
  audit_log: ModelAuditEntry[]
  is_demo: boolean
  failed?: boolean
  failure_reason?: string
  analyzed_at: string
}

// ----------------------------------------------------------------------------
// Outcome tracking (for BUY / WATCH / REJECT — judge committee accuracy)
// ----------------------------------------------------------------------------
export interface OutcomeRecord {
  id: string
  ticker: string
  company: string
  decision: 'BUY' | 'WATCH' | 'REJECT'
  playbook: PlaybookType
  confidence_score: number
  entry_reference_price: number    // price at time of decision
  decided_at: string
  // forward returns (null until measured)
  day1_price: number | null
  day2_price: number | null
  day3_price: number | null
  day5_price: number | null
  day1_return: number | null
  day2_return: number | null
  day3_return: number | null
  day5_return: number | null
  // was the committee "correct"? (BUY that went up = correct, REJECT that went down = correct)
  verdict_resolved: boolean
  is_demo: boolean
  // Benchmark support (#6): rank among scanned movers by % change at scan time
  change_pct_at_scan: number
  is_top5_gainer: boolean
}

// ----------------------------------------------------------------------------
// Paper trade with realism
// ----------------------------------------------------------------------------
export interface PaperTrade {
  id: string
  ticker: string
  company: string
  playbook: PlaybookType
  entry_date: string
  // intended vs filled (slippage + spread)
  intended_entry: number
  entry_price: number          // actual fill after slippage/spread
  slippage_cost: number
  spread_cost: number
  fees: number
  position_size: number
  virtual_amount: number
  stop_loss: number
  initial_stop_loss: number
  trailing_stop: number | null
  take_profit_1: number
  take_profit_2: number
  tp1_filled: boolean          // partial profit taken
  tp1_exit_price?: number
  tp1_shares?: number
  latest_price: number
  exit_date?: string
  exit_price?: number
  exit_reason?: ExitReason
  pnl?: number                 // net of all costs
  gross_pnl?: number
  return_pct?: number
  holding_hours?: number
  notes?: string
  lesson_learned?: string
  status: 'OPEN' | 'CLOSED'
  max_holding_period: string
  confidence_score: number
  analysis_id?: string
  analysis_data?: AIAnalysis
  grade?: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'
  is_demo: boolean
  day1_price?: number
  day2_price?: number
  day3_price?: number
  day5_price?: number
  day1_return?: number
  day2_return?: number
  day3_return?: number
  day5_return?: number
}

export type ExitReason =
  | 'TARGET_HIT'
  | 'TP1_PARTIAL'
  | 'STOP_LOSS_HIT'
  | 'TRAILING_STOP_HIT'
  | 'MANUAL_EXIT'
  | 'TIME_EXIT'
  | 'AI_REVERSAL'
  | 'MAX_DAILY_LOSS'

// ----------------------------------------------------------------------------
// Realism / risk-control configuration
// ----------------------------------------------------------------------------
export interface RealismConfig {
  slippage_pct: number          // e.g. 0.001 = 0.1% slippage on entry & exit
  fee_per_trade: number         // flat $ per fill
  fee_pct: number               // % of notional
  use_spread_cost: boolean
  partial_tp1_fraction: number  // fraction of position taken at TP1 (e.g. 0.5)
  trailing_stop_pct: number     // trailing stop distance once in profit
  time_exit_days: number        // force exit after N days
  max_daily_loss_pct: number    // % of account; halt trading for the day if exceeded
  max_trades_per_day: number
  cooldown_losses: number       // consecutive losses that trigger cooldown
  cooldown_trades_blocked: number
  risk_per_trade_pct: number
}

export const DEFAULT_REALISM: RealismConfig = {
  slippage_pct: 0.0015,
  fee_per_trade: 1.0,
  fee_pct: 0.0,
  use_spread_cost: true,
  partial_tp1_fraction: 0.5,
  trailing_stop_pct: 0.04,
  time_exit_days: 3,
  max_daily_loss_pct: 0.06,
  max_trades_per_day: 5,
  cooldown_losses: 3,
  cooldown_trades_blocked: 3,
  risk_per_trade_pct: 0.02,
}

// ----------------------------------------------------------------------------
// Performance + validation
// ----------------------------------------------------------------------------
export interface PerformanceMetrics {
  total_trades: number
  open_trades: number
  closed_trades: number
  win_rate: number
  avg_return: number
  expectancy: number            // avg $ per trade (net)
  expectancy_r: number          // avg R multiple
  profit_factor: number
  max_drawdown: number
  best_trade: number
  worst_trade: number
  consecutive_wins: number
  consecutive_losses: number
  daily_pnl: number
  weekly_pnl: number
  monthly_pnl: number
  virtual_balance: number
  total_invested: number
  total_pnl: number
  total_fees: number
  total_slippage: number
}

export interface ValidationReport {
  ready_for_real_money: boolean
  verdict: string
  closed_trades: number
  required_trades: number
  net_expectancy: number
  gross_expectancy: number
  expectancy_after_costs_positive: boolean
  // Gate criteria (#7)
  profit_factor: number
  profit_factor_ok: boolean          // > 1.3
  max_drawdown_pct: number           // negative number, e.g. -8.2
  max_drawdown_ok: boolean           // |dd| < 10%
  beats_random_gainers: boolean | null
  random_gainers_expectancy: number | null
  beats_qqq: boolean | null
  qqq_buyhold_return: number | null
  strategy_return: number | null
  // Top-gainers benchmark (#6)
  topgainers_baseline: TopGainersBaseline | null
  best_playbook: { playbook: PlaybookType; expectancy: number; trades: number } | null
  worst_playbook: { playbook: PlaybookType; expectancy: number; trades: number } | null
  best_model: { model: string; accuracy: number; decisions: number } | null
  best_score_band: { band: string; expectancy: number; trades: number } | null
  playbook_breakdown: PlaybookStat[]
  model_accuracy: ModelAccuracyStat[]
  score_bands: ScoreBandStat[]
  gate_checklist: GateCheck[]
  reasons: string[]
}

export interface GateCheck {
  label: string
  passed: boolean
  detail: string
}

export interface TopGainersBaseline {
  // "Buy the top 5 gainers at scan time" vs the committee's BUYs, on day-2 fwd return
  baseline_avg_return: number
  baseline_n: number
  strategy_avg_return: number
  strategy_n: number
  edge: number                       // strategy - baseline
  beats: boolean
}

export interface PlaybookStat {
  playbook: PlaybookType
  trades: number
  win_rate: number
  expectancy: number
  total_pnl: number
}

export interface ModelAccuracyStat {
  model: string
  decisions: number
  correct: number
  accuracy: number
}

export interface ScoreBandStat {
  band: string
  min: number
  max: number
  trades: number
  win_rate: number
  expectancy: number
}

// ----------------------------------------------------------------------------
// Misc
// ----------------------------------------------------------------------------
export interface RedFlag {
  type: string
  message: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
}

export interface TradeGrade {
  overall: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'
  entry_quality: number
  exit_quality: number
  risk_management: number
  ai_accuracy: number
  profitability: number
  discipline: number
  notes: string
}

export interface RuleResult {
  passed: boolean
  violations: string[]
  red_flags: RedFlag[]
}
