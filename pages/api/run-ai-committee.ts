import { NextApiRequest, NextApiResponse } from 'next'
import {
  MarketSnapshot, MarketContext, AIAnalysis, GeminiOutput, GPTOutput, ClaudeOutput,
  ModelAuditEntry, PlaybookType,
} from '../../lib/types'
import { applyHardRules, classifyPlaybook } from '../../lib/tradeRules'
import { fetchMovers, fetchMarketContext } from '../../lib/marketData'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

async function postJSON(path: string, body: any) {
  const r = await fetch(`${BASE_URL}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  return r.json()
}

function failedAnalysis(
  snap: MarketSnapshot, stage: string, audit: ModelAuditEntry[],
  partial: Partial<AIAnalysis> = {}
): AIAnalysis {
  return {
    ticker: snap.ticker, company: snap.company, decision: 'REJECT',
    playbook: (partial.playbook as PlaybookType) || 'NONE',
    momentum_score: partial.momentum_score ?? 0,
    catalyst_score: partial.catalyst_score ?? 0,
    liquidity_score: partial.liquidity_score ?? 0,
    catalyst_freshness_score: partial.catalyst_freshness_score ?? 0,
    risk_score: 100, confidence_score: 0, continuation_probability: 0,
    entry_price: snap.price, stop_loss: 0, take_profit_1: 0, take_profit_2: 0,
    risk_reward_ratio: 0, realistic_upside_pct: 0, max_holding_period: '1D',
    bull_case: '', bear_case: '', key_risks: [`${stage} failed`], red_flags: [],
    rejection_reason: `${stage} failed — cannot complete committee review`,
    reasoning: `Pipeline failed at ${stage}`, final_notes: '',
    snapshot: snap, audit_log: audit, is_demo: snap.is_demo,
    failed: true, failure_reason: `${stage} failure`,
    analyzed_at: new Date().toISOString(),
    ...partial,
  }
}

async function analyzeCandidate(snap: MarketSnapshot, market: MarketContext): Promise<AIAnalysis> {
  const audit: ModelAuditEntry[] = []

  // Stage 1: Gemini
  const gRes = await postJSON('/api/run-gemini-scanner', { snapshot: snap, market })
  if (gRes.audit) audit.push(gRes.audit)
  if (gRes.failed || !gRes.result) return failedAnalysis(snap, 'Gemini scanner', audit)
  const gemini = gRes.result as GeminiOutput

  // Stage 2: GPT
  const pRes = await postJSON('/api/run-gpt-analysis', { snapshot: snap, market, gemini_output: gemini })
  if (pRes.audit) audit.push(pRes.audit)
  if (pRes.failed || !pRes.result) {
    return failedAnalysis(snap, 'GPT analyst', audit, {
      playbook: gemini.playbook, momentum_score: gemini.momentum_score,
      catalyst_score: gemini.catalyst_score, liquidity_score: gemini.liquidity_score,
      catalyst_freshness_score: gemini.catalyst_freshness_score,
      gemini_output: gemini,
    })
  }
  const gpt = pRes.result as GPTOutput

  // Stage 3: Claude
  const cRes = await postJSON('/api/run-claude-review', { snapshot: snap, market, gemini_output: gemini, gpt_output: gpt })
  if (cRes.audit) audit.push(cRes.audit)
  const claude: ClaudeOutput | null = cRes.failed ? null : cRes.result

  const plan = claude?.approved_trade_plan
  // Cross-check playbook: AI's vs deterministic. If AI says NONE, trust deterministic.
  const detPlaybook = classifyPlaybook(snap)
  const playbook: PlaybookType = (claude?.playbook && claude.playbook !== 'NONE')
    ? claude.playbook
    : (gpt.playbook && gpt.playbook !== 'NONE') ? gpt.playbook : detPlaybook

  const analysis: AIAnalysis = {
    ticker: snap.ticker, company: snap.company,
    decision: 'REJECT', // set after rules
    playbook,
    momentum_score: gemini.momentum_score,
    catalyst_score: gemini.catalyst_score,
    liquidity_score: gemini.liquidity_score,
    catalyst_freshness_score: gemini.catalyst_freshness_score,
    risk_score: gpt.risk_score,
    confidence_score: claude?.final_confidence_score ?? gpt.confidence_score,
    continuation_probability: gemini.continuation_probability,
    entry_price: plan?.entry_price ?? gpt.suggested_entry,
    stop_loss: plan?.stop_loss ?? gpt.suggested_stop_loss,
    take_profit_1: plan?.take_profit_1 ?? gpt.suggested_target_1,
    take_profit_2: plan?.take_profit_2 ?? gpt.suggested_target_2,
    risk_reward_ratio: gpt.risk_reward_ratio,
    realistic_upside_pct: gpt.realistic_upside_pct,
    max_holding_period: (plan?.max_holding_period as any) || gpt.expected_holding || '2D',
    bull_case: gpt.bull_case, bear_case: gpt.bear_case,
    key_risks: claude?.key_risks || [],
    red_flags: [],
    rejection_reason: '',
    reasoning: `Gemini: ${gemini.scanner_summary} | GPT: ${gpt.analyst_summary}`,
    final_notes: claude?.final_notes || '',
    snapshot: snap, gemini_output: gemini, gpt_output: gpt, claude_output: claude || undefined,
    audit_log: audit, is_demo: snap.is_demo, failed: !claude,
    analyzed_at: new Date().toISOString(),
  }

  // Apply the stricter hard-rule engine
  const { passed, violations, red_flags } = applyHardRules(analysis, { snapshot: snap, market })
  analysis.red_flags = red_flags

  if (snap.is_demo) {
    // Demo data can never produce a BUY.
    analysis.decision = 'WATCH'
    analysis.rejection_reason = '[DEMO] Synthetic data is never tradeable — set a real market-data key.'
  } else if (!passed) {
    analysis.decision = 'REJECT'
    analysis.rejection_reason = violations[0]
  } else if (claude) {
    analysis.decision = claude.decision
    analysis.rejection_reason = claude.decision === 'REJECT' ? (claude.rejection_reason || violations[0] || '') : ''
  } else {
    analysis.decision = 'REJECT'
    analysis.rejection_reason = 'Claude risk review failed — cannot approve'
  }

  return analysis
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const send = (event: string, data: any) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)

  try {
    send('status', { message: 'Fetching market context (SPY/QQQ)...', step: 1, total: 5 })
    const market = await fetchMarketContext()
    send('market', { market })

    send('status', { message: 'Fetching market movers...', step: 2, total: 5 })
    const { movers, is_demo, source, status, error, provider_requested } = await fetchMovers()
    send('movers', { movers, count: movers.length, is_demo, source, status, error, provider_requested })

    if (error) {
      send('warning', { message: error })
    }
    if (is_demo) {
      send('warning', { message: 'DEMO MODE: synthetic data. No BUY signals will be issued. Configure a market-data provider (MARKET_DATA_PROVIDER=finnhub recommended for free tier).' })
    } else if (status === 'DEGRADED') {
      send('warning', { message: `Live data is DEGRADED: ${error || 'using watchlist fallback'}` })
    }

    // Top-5 gainers at scan time (#6 benchmark): rank by % change, take top 5 positive movers.
    const top5Tickers = new Set(
      [...movers]
        .filter(m => m.change_pct > 0)
        .sort((a, b) => b.change_pct - a.change_pct)
        .slice(0, 5)
        .map(m => m.ticker)
    )

    const results: AIAnalysis[] = []
    for (let i = 0; i < movers.length; i++) {
      const snap = movers[i]
      send('status', {
        message: `AI committee on ${snap.ticker} (${i + 1}/${movers.length})...`,
        ticker: snap.ticker, step: 3, total: 5,
        progress: Math.round(((i + 1) / movers.length) * 100),
      })
      send('analyzing', { ticker: snap.ticker, stage: 'gemini', status: 'SCANNING' })
      const analysis = await analyzeCandidate(snap, market)
      send('analyzing', { ticker: snap.ticker, stage: 'complete', status: analysis.decision })
      send('analysis', {
        analysis,
        change_pct_at_scan: snap.change_pct,
        is_top5_gainer: top5Tickers.has(snap.ticker),
      })
      results.push(analysis)
      await new Promise(r => setTimeout(r, 300))
    }

    send('status', { message: 'Finalizing...', step: 4, total: 5 })
    const buys = results.filter(r => r.decision === 'BUY')
    const watches = results.filter(r => r.decision === 'WATCH')
    const rejects = results.filter(r => r.decision === 'REJECT')

    send('status', { message: 'Committee complete', step: 5, total: 5 })
    send('complete', {
      results, market, is_demo, source, status,
      summary: {
        total: results.length, buys: buys.length, watches: watches.length, rejects: rejects.length,
        buy_tickers: buys.map(r => r.ticker),
      },
      timestamp: new Date().toISOString(),
    })
    res.end()
  } catch (error: any) {
    send('error', { message: error.message })
    res.end()
  }
}
