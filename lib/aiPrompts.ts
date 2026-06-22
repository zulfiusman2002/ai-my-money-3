// ============================================================================
// AI prompt construction + deterministic demo outputs.
//
// Demo outputs are computed from the (synthetic) market snapshot using the same
// deterministic logic for every run. They are stamped is_demo and are
// deliberately conservative: demo mode will NEVER manufacture a confident BUY.
// ============================================================================
import {
  MarketSnapshot, MarketContext, GeminiOutput, GPTOutput, ClaudeOutput, PlaybookType,
} from './types'
import { classifyPlaybook } from './tradeRules'

const PLAYBOOK_ENUM = `"GAP_AND_GO" | "BREAKOUT_CONTINUATION" | "NEWS_CATALYST_MOMENTUM" | "EARNINGS_MOMENTUM" | "ANALYST_UPGRADE_MOMENTUM" | "SECTOR_SYMPATHY" | "LOW_FLOAT_SQUEEZE" | "OVEREXTENDED_CHASE_RISK" | "FAILED_BREAKOUT" | "REVERSAL_FADE_RISK" | "NONE"`

function intradayBlock(s: MarketSnapshot): string {
  const i = s.intraday
  if (!i) return ''
  const pct = (v: number | null) => v != null ? `${(v * 100).toFixed(1)}%` : 'unknown'
  const px = (v: number | null) => v != null ? `$${v.toFixed(2)}` : 'unknown'
  return `
INTRADAY MICROSTRUCTURE (1m/5m candles):
- Session: ${i.session}
- VWAP: ${px(i.vwap)} | Price vs VWAP: ${pct(i.pct_from_vwap)} ${i.vwap_reclaim ? '(VWAP RECLAIM detected)' : ''}${i.vwap_rejection ? '(VWAP REJECTION detected)' : ''}
- 5-min EMA(9): ${px(i.ema5)} | Price vs EMA5: ${pct(i.pct_from_ema5)}
- Opening range: ${px(i.opening_range_low)} to ${px(i.opening_range_high)} ${i.in_opening_range ? '(still forming)' : ''}
- Pre-market high / low: ${px(i.premarket_high)} / ${px(i.premarket_low)}
- RVOL by time of day: ${i.rvol_time_of_day != null ? i.rvol_time_of_day.toFixed(2) + 'x' : 'unknown'}
- Avg daily range: ${px(i.avg_daily_range)} | Range used today: ${pct(i.range_used_pct)} ${i.range_used_pct != null && i.range_used_pct > 0.7 ? '(MOST OF ADR ALREADY USED)' : ''}
- Halt risk: ${i.halt_risk}${i.halt_risk_reason ? ' - ' + i.halt_risk_reason : ''}
- Time since catalyst: ${i.minutes_since_catalyst != null ? i.minutes_since_catalyst + ' min' : 'unknown'}`
}

function snapshotBlock(s: MarketSnapshot, m: MarketContext): string {
  return `MARKET DATA (real-time):
- Ticker: ${s.ticker} (${s.company})
- Last price: $${s.price}
- Previous close: $${s.previous_close}
- Open: $${s.open}
- Day high / low: $${s.day_high} / $${s.day_low}
- VWAP: ${s.vwap != null ? '$' + s.vwap : 'unknown'}
- Day change: ${s.change_pct.toFixed(2)}%
- Pre-market change: ${s.premarket_change_pct != null ? s.premarket_change_pct.toFixed(2) + '%' : 'unknown'}
- Volume: ${s.volume.toLocaleString()} | Avg volume: ${s.avg_volume.toLocaleString()}
- Relative volume (RVOL): ${s.relative_volume.toFixed(2)}x
- Bid/Ask: ${s.bid != null ? '$' + s.bid : '?'} / ${s.ask != null ? '$' + s.ask : '?'} | Spread: ${s.spread_pct != null ? (s.spread_pct * 100).toFixed(2) + '%' : 'unknown'}
- Market cap: $${(s.market_cap / 1e9).toFixed(2)}B | Float: ${s.float_shares != null ? (s.float_shares / 1e6).toFixed(1) + 'M shares' : 'unknown'}
- Sector: ${s.sector} | Sector perf today: ${s.sector_performance_pct != null ? s.sector_performance_pct.toFixed(2) + '%' : 'unknown'}
- Catalyst: ${s.catalyst}
- News timestamp: ${s.news_timestamp || 'unknown'}
- MARKET CONTEXT: SPY ${m.spy_trend} (${m.spy_change_pct.toFixed(2)}%), QQQ ${m.qqq_trend} (${m.qqq_change_pct.toFixed(2)}%)${intradayBlock(s)}
${s.is_demo ? '\n*** THIS IS SYNTHETIC DEMO DATA — NOT A REAL MARKET SIGNAL ***' : ''}`
}

// ----------------------------------------------------------------------------
// GEMINI — market scanner
// ----------------------------------------------------------------------------
export const GEMINI_SYSTEM = `You are an elite intraday momentum SCANNER for short-term trades (minutes to a few days), not a long-term investor. You judge whether a fast-moving stock is worth deeper analysis RIGHT NOW. You care about: volume confirmation (RVOL), price vs VWAP, catalyst freshness, gap behaviour, liquidity, and whether the move is early or already extended. You are skeptical of low-float hype and stale news. Return ONLY valid JSON, no prose, no markdown.`

export function buildGeminiPrompt(s: MarketSnapshot, m: MarketContext): string {
  return `${snapshotBlock(s, m)}

Classify the setup into exactly one playbook and score the opportunity for a SHORT-TERM long momentum trade.
Return ONLY this JSON:
{
  "ticker": "${s.ticker}",
  "company": "${s.company}",
  "playbook": ${PLAYBOOK_ENUM},
  "momentum_score": <0-100>,
  "catalyst_score": <0-100, how strong/clear the catalyst is>,
  "catalyst_freshness_score": <0-100, 100=just broke, 0=old/unknown>,
  "liquidity_score": <0-100, based on volume, RVOL, spread, market cap>,
  "continuation_probability": <0-100, odds the move continues intraday/next days>,
  "vwap_position": "ABOVE" | "BELOW" | "AT" | "UNKNOWN",
  "rvol_assessment": "STRONG" | "MODERATE" | "WEAK",
  "scanner_summary": "<2-3 sentences, trader voice>",
  "unusual_volume": <true|false>,
  "gap_direction": "UP" | "DOWN" | "NONE",
  "news_catalyst": "<brief>",
  "sector_strength": <0-100>,
  "breakout_level": <price or null>,
  "relative_strength": <0-100>
}`
}

// ----------------------------------------------------------------------------
// GPT — momentum analyst
// ----------------------------------------------------------------------------
export const GPT_SYSTEM = `You are an expert short-term MOMENTUM TRADER acting as the analyst on a committee. You think in terms of intraday/multi-day continuation, entry timing, volume confirmation, position relative to VWAP, spread/liquidity risk, and whether a move is already exhausted. You set realistic stops just below structure and realistic targets reachable within HOURS to a FEW DAYS — not long-term price targets. You never recommend chasing extended moves. Return ONLY valid JSON, no prose, no markdown.`

export function buildGPTPrompt(s: MarketSnapshot, m: MarketContext, gemini: GeminiOutput): string {
  return `${snapshotBlock(s, m)}

SCANNER (Gemini) FOUND:
- Playbook: ${gemini.playbook}
- Momentum ${gemini.momentum_score}, Catalyst ${gemini.catalyst_score}, Freshness ${gemini.catalyst_freshness_score}, Liquidity ${gemini.liquidity_score}
- VWAP position: ${gemini.vwap_position}, RVOL: ${gemini.rvol_assessment}
- Continuation probability: ${gemini.continuation_probability}%
- Summary: ${gemini.scanner_summary}

As a short-term momentum trader, produce a concrete trade thesis. Entry should reflect realistic timing (e.g. pullback to VWAP, break of day high). Stop must be tight and below structure. Targets must be realistic over ${'1-5 days'}.
Return ONLY this JSON:
{
  "ticker": "${s.ticker}",
  "playbook": ${PLAYBOOK_ENUM},
  "bull_case": "<short-term continuation thesis>",
  "bear_case": "<what kills the trade>",
  "risk_score": <0-100, higher = riskier>,
  "confidence_score": <0-100>,
  "suggested_entry": <price>,
  "suggested_stop_loss": <price below entry>,
  "suggested_target_1": <price>,
  "suggested_target_2": <price>,
  "risk_reward_ratio": <number, (target1-entry)/(entry-stop)>,
  "entry_timing": "<when/how to enter>",
  "volume_confirmation": "CONFIRMED" | "WEAK" | "ABSENT",
  "vwap_position": "ABOVE" | "BELOW" | "AT" | "UNKNOWN",
  "spread_risk": "LOW" | "MEDIUM" | "HIGH",
  "move_exhausted": <true|false>,
  "realistic_upside_pct": <expected % upside over holding window>,
  "expected_holding": "1D" | "2D" | "3D" | "5D",
  "analyst_summary": "<2-3 sentences>",
  "catalyst_quality": "HIGH" | "MEDIUM" | "LOW" | "NONE",
  "technical_setup": "<brief>",
  "trend_strength": <0-100>
}`
}

// ----------------------------------------------------------------------------
// CLAUDE — risk officer
// ----------------------------------------------------------------------------
export const CLAUDE_SYSTEM = `You are the RISK OFFICER on a short-term momentum trading committee. Your default stance is to REJECT. You only approve a BUY when volume confirms the move, the catalyst is fresh and clear, the stock is not overextended above VWAP, the spread is tight, the stop is realistic, reward/risk is at least 2:1, and the broad market does not conflict with a long. You challenge the analyst. You flag exhaustion, chasing, hype, stale news, and poor liquidity. Return ONLY valid JSON, no prose, no markdown.`

export function buildClaudePrompt(s: MarketSnapshot, m: MarketContext, gemini: GeminiOutput, gpt: GPTOutput): string {
  return `${snapshotBlock(s, m)}

ANALYST (GPT) PROPOSES:
- Playbook: ${gpt.playbook}
- Entry $${gpt.suggested_entry}, Stop $${gpt.suggested_stop_loss}, T1 $${gpt.suggested_target_1}, T2 $${gpt.suggested_target_2}
- R/R: ${gpt.risk_reward_ratio}, Confidence: ${gpt.confidence_score}, Risk: ${gpt.risk_score}
- Volume confirmation: ${gpt.volume_confirmation}, VWAP: ${gpt.vwap_position}, Spread risk: ${gpt.spread_risk}
- Move exhausted: ${gpt.move_exhausted}, Realistic upside: ${gpt.realistic_upside_pct}%
- Bull: ${gpt.bull_case}
- Bear: ${gpt.bear_case}

Challenge this trade. Approve ONLY if it clearly meets short-term momentum standards. Default to REJECT or WATCH when in doubt.
Return ONLY this JSON:
{
  "ticker": "${s.ticker}",
  "playbook": ${PLAYBOOK_ENUM},
  "decision": "BUY" | "WATCH" | "REJECT",
  "final_confidence_score": <0-100>,
  "key_risks": ["<risk>", "..."],
  "rejection_reason": "<why rejected, or empty if BUY>",
  "approved_trade_plan": {
    "entry_price": <price>,
    "stop_loss": <price>,
    "take_profit_1": <price>,
    "take_profit_2": <price>,
    "max_holding_period": "1D" | "2D" | "3D" | "5D",
    "position_sizing_note": "<note>"
  } | null,
  "final_notes": "<2-3 sentences>",
  "is_exhausted": <bool>,
  "is_extended": <bool>,
  "catalyst_weak": <bool>,
  "catalyst_stale": <bool>,
  "volume_fading": <bool>,
  "poor_liquidity": <bool>,
  "stop_too_wide": <bool>,
  "spread_too_wide": <bool>,
  "extended_above_vwap": <bool>,
  "market_conflict": <bool>,
  "hype_only": <bool>
}`
}

// ============================================================================
// DETERMINISTIC DEMO OUTPUTS (no randomness, never a confident BUY)
// ============================================================================
function clamp(n: number, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, Math.round(n))) }

export function demoGemini(s: MarketSnapshot): GeminiOutput {
  const playbook = classifyPlaybook(s)
  const aboveVwap = s.vwap ? s.price >= s.vwap : false
  const rvol = s.relative_volume
  const momentum = clamp(40 + s.change_pct * 1.5 + (rvol - 1) * 8)
  const liquidity = clamp(
    (s.market_cap > 2e9 ? 55 : 25) +
    (rvol > 2 ? 20 : rvol > 1.5 ? 10 : 0) -
    ((s.spread_pct ?? 0.01) > 0.01 ? 25 : 0)
  )
  const catalyst = /demo/i.test(s.catalyst) && /no clear/i.test(s.catalyst) ? 20 : 45
  return {
    ticker: s.ticker, company: s.company, playbook,
    momentum_score: momentum,
    catalyst_score: catalyst,
    catalyst_freshness_score: s.news_timestamp ? 60 : 35,
    liquidity_score: liquidity,
    continuation_probability: clamp(momentum * 0.6),
    vwap_position: s.vwap ? (aboveVwap ? 'ABOVE' : 'BELOW') : 'UNKNOWN',
    rvol_assessment: rvol > 2 ? 'STRONG' : rvol > 1.5 ? 'MODERATE' : 'WEAK',
    scanner_summary: `[DEMO] ${s.ticker} classified as ${playbook}. RVOL ${rvol.toFixed(2)}x, ${aboveVwap ? 'above' : 'below'} VWAP. Synthetic data — not a real signal.`,
    unusual_volume: rvol > 2,
    gap_direction: s.change_pct > 2 ? 'UP' : s.change_pct < -2 ? 'DOWN' : 'NONE',
    news_catalyst: s.catalyst,
    sector_strength: clamp(50 + (s.sector_performance_pct ?? 0) * 5),
    breakout_level: s.day_high || null,
    relative_strength: clamp(50 + s.change_pct),
    is_demo: true,
  }
}

export function demoGPT(s: MarketSnapshot, g: GeminiOutput): GPTOutput {
  const entry = s.price
  const stop = +(entry * 0.96).toFixed(2)         // 4% stop
  const t1 = +(entry * 1.05).toFixed(2)
  const t2 = +(entry * 1.10).toFixed(2)
  const rr = +(((t1 - entry) / (entry - stop))).toFixed(2)
  const exhausted = g.playbook === 'OVEREXTENDED_CHASE_RISK' || g.playbook === 'FAILED_BREAKOUT'
  return {
    ticker: s.ticker, playbook: g.playbook,
    bull_case: `[DEMO] If ${g.playbook} holds with volume, continuation toward $${t1} is plausible intraday.`,
    bear_case: `[DEMO] Loss of VWAP or fading RVOL invalidates the setup; synthetic data.`,
    risk_score: clamp(exhausted ? 75 : 45),
    confidence_score: clamp(g.momentum_score * 0.7),   // demo is deliberately muted
    suggested_entry: entry, suggested_stop_loss: stop,
    suggested_target_1: t1, suggested_target_2: t2,
    risk_reward_ratio: rr,
    entry_timing: '[DEMO] Pullback to VWAP or break of day high.',
    volume_confirmation: g.rvol_assessment === 'STRONG' ? 'CONFIRMED' : g.rvol_assessment === 'MODERATE' ? 'WEAK' : 'ABSENT',
    vwap_position: g.vwap_position,
    spread_risk: (s.spread_pct ?? 0) > 0.01 ? 'HIGH' : (s.spread_pct ?? 0) > 0.004 ? 'MEDIUM' : 'LOW',
    move_exhausted: exhausted,
    realistic_upside_pct: 5,
    expected_holding: '2D',
    analyst_summary: `[DEMO] ${s.ticker} ${g.playbook} thesis. Synthetic — for plumbing only.`,
    catalyst_quality: g.catalyst_score > 40 ? 'MEDIUM' : 'LOW',
    technical_setup: `[DEMO] ${g.playbook}`,
    trend_strength: clamp(g.momentum_score),
    is_demo: true,
  }
}

export function demoClaude(s: MarketSnapshot, g: GeminiOutput, p: GPTOutput): ClaudeOutput {
  // Demo risk officer is intentionally strict and defaults to WATCH/REJECT.
  // It will not emit a confident BUY from synthetic data.
  const extendedVwap = s.vwap ? (s.price - s.vwap) / s.vwap > 0.07 : false
  const wideSpread = (s.spread_pct ?? 0) > 0.01
  const weakVol = s.relative_volume < 1.5
  const reject = p.move_exhausted || extendedVwap || wideSpread || weakVol || p.risk_reward_ratio < 2
  return {
    ticker: s.ticker, playbook: g.playbook,
    decision: 'WATCH',  // demo never BUYs
    final_confidence_score: clamp(p.confidence_score * 0.7),
    key_risks: [
      'Synthetic demo data — not tradeable',
      ...(extendedVwap ? ['Extended above VWAP'] : []),
      ...(weakVol ? ['Weak relative volume'] : []),
      ...(wideSpread ? ['Wide spread'] : []),
    ],
    rejection_reason: reject
      ? '[DEMO] Setup does not meet standards (and demo data is never tradeable).'
      : '[DEMO] Demo mode does not issue BUY signals; set a real market-data API key.',
    approved_trade_plan: null,
    final_notes: '[DEMO] Demo mode is for testing the pipeline only. No real signal.',
    is_exhausted: p.move_exhausted,
    is_extended: extendedVwap,
    catalyst_weak: g.catalyst_score < 40,
    catalyst_stale: g.catalyst_freshness_score < 40,
    volume_fading: weakVol,
    poor_liquidity: g.liquidity_score < 50,
    stop_too_wide: false,
    spread_too_wide: wideSpread,
    extended_above_vwap: extendedVwap,
    market_conflict: false,
    hype_only: g.playbook === 'LOW_FLOAT_SQUEEZE',
    is_demo: true,
  }
}
