// ============================================================================
// Strategy validation: the system's honest self-assessment of whether the
// committee has real, tradeable edge — net of costs, vs benchmarks.
//
// DEFAULT VERDICT: "Not ready for real money" unless >= 100 closed paper trades
// show positive expectancy after all costs.
// ============================================================================
import {
  PaperTrade, OutcomeRecord, ValidationReport, PlaybookStat, ModelAccuracyStat,
  ScoreBandStat, PlaybookType, PLAYBOOK_LABELS, GateCheck, TopGainersBaseline,
} from './types'

// ---- "Minimum evidence before real money" gate (#7) ----
export const MIN_TRADES_FOR_REAL_MONEY = 100
export const MIN_PROFIT_FACTOR = 1.3
export const MAX_DRAWDOWN_LIMIT = 10   // percent (absolute)
const STARTING_BALANCE = 100000

function expectancy(trades: PaperTrade[]): number {
  if (!trades.length) return 0
  return trades.reduce((s, t) => s + (t.pnl || 0), 0) / trades.length
}

function winRate(trades: PaperTrade[]): number {
  if (!trades.length) return 0
  return trades.filter(t => (t.pnl || 0) > 0).length / trades.length * 100
}

function profitFactor(trades: PaperTrade[]): number {
  const gain = trades.filter(t => (t.pnl || 0) > 0).reduce((s, t) => s + (t.pnl || 0), 0)
  const loss = Math.abs(trades.filter(t => (t.pnl || 0) < 0).reduce((s, t) => s + (t.pnl || 0), 0))
  if (loss === 0) return gain > 0 ? 999 : 0
  return gain / loss
}

// Max drawdown (%) over the closed-trade equity curve.
function maxDrawdownPct(trades: PaperTrade[]): number {
  const ordered = [...trades].sort(
    (a, b) => new Date(a.exit_date || 0).getTime() - new Date(b.exit_date || 0).getTime()
  )
  let peak = STARTING_BALANCE, running = STARTING_BALANCE, maxDD = 0
  for (const t of ordered) {
    running += (t.pnl || 0)
    if (running > peak) peak = running
    const dd = ((running - peak) / peak) * 100
    if (dd < maxDD) maxDD = dd
  }
  return maxDD
}

export function buildValidationReport(
  trades: PaperTrade[],
  outcomes: OutcomeRecord[],
  qqqBuyHoldReturnPct: number | null = null
): ValidationReport {
  const closed = trades.filter(t => t.status === 'CLOSED')
  const realTrades = closed.filter(t => !t.is_demo)

  const grossExp = realTrades.length
    ? realTrades.reduce((s, t) => s + (t.gross_pnl ?? (t.pnl || 0)), 0) / realTrades.length : 0
  const netExp = expectancy(realTrades)

  // Playbook breakdown
  const byPlaybook = new Map<PlaybookType, PaperTrade[]>()
  for (const t of realTrades) {
    const arr = byPlaybook.get(t.playbook) || []
    arr.push(t); byPlaybook.set(t.playbook, arr)
  }
  const playbook_breakdown: PlaybookStat[] = Array.from(byPlaybook.entries()).map(([pb, ts]) => ({
    playbook: pb,
    trades: ts.length,
    win_rate: winRate(ts),
    expectancy: expectancy(ts),
    total_pnl: ts.reduce((s, t) => s + (t.pnl || 0), 0),
  })).sort((a, b) => b.expectancy - a.expectancy)

  const eligiblePlaybooks = playbook_breakdown.filter(p => p.trades >= 5)
  const best_playbook = eligiblePlaybooks.length
    ? { playbook: eligiblePlaybooks[0].playbook, expectancy: eligiblePlaybooks[0].expectancy, trades: eligiblePlaybooks[0].trades }
    : null
  const worst_playbook = eligiblePlaybooks.length
    ? { playbook: eligiblePlaybooks[eligiblePlaybooks.length - 1].playbook, expectancy: eligiblePlaybooks[eligiblePlaybooks.length - 1].expectancy, trades: eligiblePlaybooks[eligiblePlaybooks.length - 1].trades }
    : null

  // Model accuracy from outcome records (judge BUY/WATCH/REJECT correctness)
  const model_accuracy = computeModelAccuracy(outcomes)
  const best_model = model_accuracy.length
    ? [...model_accuracy].sort((a, b) => b.accuracy - a.accuracy)[0] : null

  // Score bands (confidence) — which score range actually makes money
  const bands: { band: string; min: number; max: number }[] = [
    { band: '70-79', min: 70, max: 79 },
    { band: '80-89', min: 80, max: 89 },
    { band: '90-100', min: 90, max: 100 },
  ]
  const score_bands: ScoreBandStat[] = bands.map(b => {
    const ts = realTrades.filter(t => t.confidence_score >= b.min && t.confidence_score <= b.max)
    return { band: b.band, min: b.min, max: b.max, trades: ts.length, win_rate: winRate(ts), expectancy: expectancy(ts) }
  })
  const eligibleBands = score_bands.filter(b => b.trades >= 5)
  const best_score_band = eligibleBands.length
    ? [...eligibleBands].sort((a, b) => b.expectancy - a.expectancy)[0] : null

  // ---- Top-5-gainers benchmark (#6) ----
  // "Buy the top 5 gainers at scan time" vs the committee's BUYs, on day-2 fwd return.
  const decidedWithFwd = outcomes.filter(o => !o.is_demo && o.day2_return != null)
  const top5 = decidedWithFwd.filter(o => o.is_top5_gainer)
  const buyOutcomes = decidedWithFwd.filter(o => o.decision === 'BUY')

  const baselineAvg = top5.length
    ? top5.reduce((s, o) => s + (o.day2_return || 0), 0) / top5.length : null
  const strategyFwd = buyOutcomes.length
    ? buyOutcomes.reduce((s, o) => s + (o.day2_return || 0), 0) / buyOutcomes.length : null

  let topgainers_baseline: TopGainersBaseline | null = null
  if (baselineAvg != null && strategyFwd != null) {
    topgainers_baseline = {
      baseline_avg_return: baselineAvg,
      baseline_n: top5.length,
      strategy_avg_return: strategyFwd,
      strategy_n: buyOutcomes.length,
      edge: strategyFwd - baselineAvg,
      beats: strategyFwd > baselineAvg,
    }
  }
  const beats_random_gainers = topgainers_baseline ? topgainers_baseline.beats : null
  const randomGainersExp = baselineAvg

  // Strategy total return vs QQQ buy/hold
  const strategyReturn = realTrades.length
    ? realTrades.reduce((s, t) => s + (t.pnl || 0), 0) / STARTING_BALANCE * 100 : null
  const beats_qqq = (strategyReturn != null && qqqBuyHoldReturnPct != null)
    ? strategyReturn > qqqBuyHoldReturnPct : null

  // ---- Gate criteria (#7) ----
  const pf = profitFactor(realTrades)
  const dd = maxDrawdownPct(realTrades)
  const enoughTrades = realTrades.length >= MIN_TRADES_FOR_REAL_MONEY
  const positiveAfterCosts = netExp > 0
  const pfOk = pf >= MIN_PROFIT_FACTOR
  const ddOk = Math.abs(dd) < MAX_DRAWDOWN_LIMIT
  const beatsBaseline = beats_random_gainers === true

  const gate_checklist: GateCheck[] = [
    { label: `100+ non-demo closed trades`, passed: enoughTrades, detail: `${realTrades.length} / ${MIN_TRADES_FOR_REAL_MONEY}` },
    { label: `Positive expectancy after costs`, passed: positiveAfterCosts, detail: `${netExp >= 0 ? '+' : ''}$${netExp.toFixed(2)} / trade` },
    { label: `Profit factor > ${MIN_PROFIT_FACTOR}`, passed: pfOk, detail: pf >= 999 ? 'no losses yet' : pf.toFixed(2) },
    { label: `Max drawdown < ${MAX_DRAWDOWN_LIMIT}%`, passed: ddOk, detail: `${dd.toFixed(1)}%` },
    { label: `Beats top-gainers baseline`, passed: beatsBaseline, detail: topgainers_baseline ? `${topgainers_baseline.edge >= 0 ? '+' : ''}${topgainers_baseline.edge.toFixed(2)}% edge` : 'insufficient data' },
  ]

  const ready = enoughTrades && positiveAfterCosts && pfOk && ddOk && beatsBaseline

  const reasons: string[] = []
  if (!enoughTrades) reasons.push(`Only ${realTrades.length}/${MIN_TRADES_FOR_REAL_MONEY} real closed trades — insufficient sample.`)
  if (!positiveAfterCosts) reasons.push(`Net expectancy after costs is ${netExp >= 0 ? '+' : ''}$${netExp.toFixed(2)} — not positive.`)
  if (!pfOk) reasons.push(`Profit factor ${pf >= 999 ? '(n/a)' : pf.toFixed(2)} is below the ${MIN_PROFIT_FACTOR} minimum.`)
  if (!ddOk) reasons.push(`Max drawdown ${dd.toFixed(1)}% exceeds the ${MAX_DRAWDOWN_LIMIT}% limit.`)
  if (!beatsBaseline) reasons.push('Does not (yet) beat the top-5-gainers baseline.')
  if (realTrades.length === 0) reasons.push('No real (non-demo) trades recorded yet.')

  const verdict = ready
    ? 'All evidence gates passed: 100+ trades, positive expectancy, PF > 1.3, drawdown < 10%, and beats the top-gainers baseline. Cautiously consider small real-money testing.'
    : 'NOT READY FOR REAL MONEY.'

  return {
    ready_for_real_money: ready,
    verdict,
    closed_trades: realTrades.length,
    required_trades: MIN_TRADES_FOR_REAL_MONEY,
    net_expectancy: netExp,
    gross_expectancy: grossExp,
    expectancy_after_costs_positive: positiveAfterCosts,
    profit_factor: pf,
    profit_factor_ok: pfOk,
    max_drawdown_pct: dd,
    max_drawdown_ok: ddOk,
    beats_random_gainers,
    random_gainers_expectancy: randomGainersExp,
    beats_qqq,
    qqq_buyhold_return: qqqBuyHoldReturnPct,
    strategy_return: strategyReturn,
    topgainers_baseline,
    best_playbook,
    worst_playbook,
    best_model,
    best_score_band: best_score_band
      ? { band: best_score_band.band, expectancy: best_score_band.expectancy, trades: best_score_band.trades }
      : null,
    playbook_breakdown,
    model_accuracy,
    score_bands,
    gate_checklist,
    reasons: reasons.length ? reasons : ['All validation gates passed.'],
  }
}

// A committee decision is "correct" if:
//  - BUY and the stock rose over the horizon (day2_return > 0)
//  - REJECT and it fell or was flat (day2_return <= 0)
//  - WATCH is excluded from accuracy (no committed view)
export function computeModelAccuracy(outcomes: OutcomeRecord[]): ModelAccuracyStat[] {
  const real = outcomes.filter(o => !o.is_demo && o.day2_return != null && o.decision !== 'WATCH')
  // The committee acts as one unit; we report a combined "committee" accuracy,
  // plus per-decision-type breakdown encoded as pseudo-models for the UI.
  function acc(list: OutcomeRecord[]): { decisions: number; correct: number; accuracy: number } {
    const decisions = list.length
    const correct = list.filter(o => {
      const up = (o.day2_return || 0) > 0
      return (o.decision === 'BUY' && up) || (o.decision === 'REJECT' && !up)
    }).length
    return { decisions, correct, accuracy: decisions ? correct / decisions * 100 : 0 }
  }
  const committee = acc(real)
  const buys = acc(real.filter(o => o.decision === 'BUY'))
  const rejects = acc(real.filter(o => o.decision === 'REJECT'))
  return [
    { model: 'Committee (overall)', ...committee },
    { model: 'BUY calls', ...buys },
    { model: 'REJECT calls', ...rejects },
  ]
}

export function playbookLabel(pb: PlaybookType): string {
  return PLAYBOOK_LABELS[pb] || pb
}
