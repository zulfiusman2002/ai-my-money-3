import { useState, useCallback, useEffect } from 'react'
import Head from 'next/head'
import {
  MarketSnapshot, MarketContext, AIAnalysis, PaperTrade, PerformanceMetrics,
  OutcomeRecord, ValidationReport, RealismConfig, DEFAULT_REALISM, PLAYBOOK_LABELS,
} from '../lib/types'
import { calculateMetrics } from '../lib/metrics'
import { buildValidationReport } from '../lib/validation'
import { DashboardMetrics } from '../components/dashboard/MetricCards'
import { TradeJournalTable } from '../components/trades/TradeJournalTable'
import { AICommitteePanel } from '../components/AICommitteePanel'
import { DecisionBadge } from '../components/DecisionBadge'
import { RedFlagList } from '../components/RedFlags'
import {
  EquityCurveChart, ReturnDistributionChart, DayReturnChart, DecisionAccuracyChart,
} from '../components/analytics/PerformanceCharts'
import { ScanTable } from '../components/trades/MarketMoversTable'
import { ValidationPanel } from '../components/strategy/ValidationPanel'
import { AuditLogView } from '../components/strategy/AuditLogView'
import { exportToCSV, exportToJSON, exportToExcel, exportToPDFReport } from '../lib/exportUtils'
import {
  Play, BarChart2, BookOpen, TrendingUp, RefreshCw, X, Shield,
  Activity, Brain, Download, AlertTriangle, FlaskConical,
} from 'lucide-react'

type Tab = 'dashboard' | 'scan' | 'trades' | 'analytics' | 'strategy'

const STORAGE = {
  trades: 'aiml_trades_v2',
  outcomes: 'aiml_outcomes_v2',
  config: 'aiml_config_v2',
}

const INITIAL_METRICS: PerformanceMetrics = {
  total_trades: 0, open_trades: 0, closed_trades: 0, win_rate: 0, avg_return: 0,
  expectancy: 0, expectancy_r: 0, profit_factor: 0, max_drawdown: 0, best_trade: 0,
  worst_trade: 0, consecutive_wins: 0, consecutive_losses: 0, daily_pnl: 0,
  weekly_pnl: 0, monthly_pnl: 0, virtual_balance: 100000, total_invested: 0,
  total_pnl: 0, total_fees: 0, total_slippage: 0,
}

export default function Home() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [isRunning, setIsRunning] = useState(false)
  const [runProgress, setRunProgress] = useState(0)
  const [runMessage, setRunMessage] = useState('')
  const [runLog, setRunLog] = useState<string[]>([])

  const [snapshots, setSnapshots] = useState<MarketSnapshot[]>([])
  const [market, setMarket] = useState<MarketContext | null>(null)
  const [analyses, setAnalyses] = useState<Record<string, AIAnalysis>>({})
  const [scanStatus, setScanStatus] = useState<Record<string, string>>({})
  const [trades, setTrades] = useState<PaperTrade[]>([])
  const [outcomes, setOutcomes] = useState<OutcomeRecord[]>([])
  const [metrics, setMetrics] = useState<PerformanceMetrics>(INITIAL_METRICS)
  const [config, setConfig] = useState<RealismConfig>(DEFAULT_REALISM)
  const [selectedAnalysis, setSelectedAnalysis] = useState<AIAnalysis | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [lastRunAt, setLastRunAt] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(true)
  const [dataSource, setDataSource] = useState('demo')
  const [dataStatus, setDataStatus] = useState<'LIVE' | 'DEGRADED' | 'DEMO'>('DEMO')
  const [dataError, setDataError] = useState<string | null>(null)

  // Load persisted state
  useEffect(() => {
    try {
      const t = localStorage.getItem(STORAGE.trades)
      if (t) { const pt = JSON.parse(t); setTrades(pt); setMetrics(calculateMetrics(pt)) }
      const o = localStorage.getItem(STORAGE.outcomes)
      if (o) setOutcomes(JSON.parse(o))
      const c = localStorage.getItem(STORAGE.config)
      if (c) setConfig({ ...DEFAULT_REALISM, ...JSON.parse(c) })
    } catch {}
  }, [])

  // Probe which market-data provider is active (before any scan runs).
  useEffect(() => {
    fetch('/api/provider-status')
      .then(r => r.json())
      .then(d => {
        if (d.provider && d.provider !== 'none') {
          setDataSource(d.provider)
          setIsDemo(false)
          setDataStatus('LIVE')
        } else {
          setDataSource('demo'); setIsDemo(true); setDataStatus('DEMO')
        }
      })
      .catch(() => {})
  }, [])

  const saveTrades = useCallback((next: PaperTrade[]) => {
    setTrades(next)
    setMetrics(calculateMetrics(next))
    try { localStorage.setItem(STORAGE.trades, JSON.stringify(next)) } catch {}
  }, [])

  const saveOutcomes = useCallback((next: OutcomeRecord[]) => {
    setOutcomes(next)
    try { localStorage.setItem(STORAGE.outcomes, JSON.stringify(next)) } catch {}
  }, [])

  const saveConfig = useCallback((next: RealismConfig) => {
    setConfig(next)
    try { localStorage.setItem(STORAGE.config, JSON.stringify(next)) } catch {}
  }, [])

  const recordOutcome = useCallback((a: AIAnalysis, changePctAtScan: number, isTop5: boolean) => {
    const rec: OutcomeRecord = {
      id: `${a.ticker}_${a.analyzed_at}`,
      ticker: a.ticker, company: a.company, decision: a.decision, playbook: a.playbook,
      confidence_score: a.confidence_score,
      entry_reference_price: a.snapshot?.price ?? a.entry_price,
      decided_at: a.analyzed_at,
      day1_price: null, day2_price: null, day3_price: null, day5_price: null,
      day1_return: null, day2_return: null, day3_return: null, day5_return: null,
      verdict_resolved: false, is_demo: a.is_demo,
      change_pct_at_scan: changePctAtScan,
      is_top5_gainer: isTop5,
    }
    setOutcomes(prev => {
      const next = [...prev.filter(o => o.id !== rec.id), rec]
      try { localStorage.setItem(STORAGE.outcomes, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const createPaperTrade = useCallback(async (analysis: AIAnalysis, currentTrades: PaperTrade[]) => {
    const res = await fetch('/api/create-paper-trade', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        analysis, account_balance: metrics.virtual_balance,
        existing_trades: currentTrades, config,
      }),
    })
    const data = await res.json()
    if (data.success && data.trade) {
      setRunLog(prev => [...prev, `✓ Opened ${analysis.ticker}: ${data.trade.position_size} sh @ $${data.trade.entry_price} (intended $${data.trade.intended_entry})`])
      return data.trade as PaperTrade
    }
    if (data.blocked) setRunLog(prev => [...prev, `⛔ ${analysis.ticker} blocked: ${data.reason}`])
    return null
  }, [metrics.virtual_balance, config])

  const runAICommittee = useCallback(async () => {
    if (isRunning) return
    setIsRunning(true); setRunProgress(0); setRunLog([]); setRunMessage('Initializing...')
    setSnapshots([]); setAnalyses({}); setScanStatus({}); setTab('scan')

    const collected: AIAnalysis[] = []
    let workingTrades = [...trades]

    try {
      const response = await fetch('/api/run-ai-committee', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      if (!response.body) throw new Error('No response body')
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const p = JSON.parse(line.slice(6))
            if (p.message) {
              setRunMessage(p.message)
              if (p.progress) setRunProgress(p.progress)
              setRunLog(prev => [...prev, p.message])
            }
            if (p.market) setMarket(p.market)
            if (p.movers) {
              setSnapshots(p.movers)
              setIsDemo(!!p.is_demo); setDataSource(p.source || 'demo')
              setDataStatus(p.status || (p.is_demo ? 'DEMO' : 'LIVE'))
              setDataError(p.error || null)
              p.movers.forEach((m: MarketSnapshot) =>
                setScanStatus(prev => ({ ...prev, [m.ticker]: 'PENDING' })))
            }
            if (p.message && /DEMO MODE/.test(p.message)) setRunLog(prev => [...prev, '⚠ ' + p.message])
            if (p.ticker && p.stage) {
              setScanStatus(prev => ({ ...prev, [p.ticker]: p.status || p.stage }))
            }
            if (p.analysis) {
              const a = p.analysis as AIAnalysis
              collected.push(a)
              setAnalyses(prev => ({ ...prev, [a.ticker]: a }))
              recordOutcome(a, p.change_pct_at_scan ?? (a.snapshot?.change_pct ?? 0), !!p.is_top5_gainer)
              if (a.decision === 'BUY' && !a.is_demo) {
                const t = await createPaperTrade(a, workingTrades)
                if (t) { workingTrades = [...workingTrades, t]; saveTrades(workingTrades) }
              }
            }
            if (p.summary) {
              setLastRunAt(p.timestamp)
              setRunLog(prev => [...prev, '',
                '━━━ Committee Complete ━━━',
                `Total ${p.summary.total} | BUY ${p.summary.buys} | WATCH ${p.summary.watches} | REJECT ${p.summary.rejects}`,
                p.is_demo ? '⚠ DEMO MODE — no trades opened (synthetic data)'
                  : p.summary.buys > 0 ? `Opened: ${p.summary.buy_tickers.join(', ')}`
                  : 'No trades qualified — capital preserved',
              ])
              setRunProgress(100); setRunMessage('Complete')
            }
          } catch {}
        }
      }
    } catch (err: any) {
      setRunLog(prev => [...prev, `Error: ${err.message}`])
      setRunMessage('Error')
    } finally {
      setIsRunning(false)
    }
  }, [isRunning, trades, createPaperTrade, recordOutcome, saveTrades])

  const updatePrices = useCallback(async () => {
    const open = trades.filter(t => t.status === 'OPEN')
    if (!open.length) { setRunLog(prev => [...prev, 'No open trades to update']); return }
    const res = await fetch('/api/update-trade-prices', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trades, config }),
    })
    const data = await res.json()
    if (data.trades) {
      saveTrades(data.trades)
      const closed = data.trades.filter((t: PaperTrade) => t.status === 'CLOSED').length
      setRunLog(prev => [...prev, `Updated prices — ${closed} closed`])
    }
  }, [trades, config, saveTrades])

  const closeAllTrades = useCallback(() => {
    const updated = trades.map(t => t.status === 'OPEN' ? {
      ...t, status: 'CLOSED' as const, exit_price: t.latest_price,
      exit_reason: 'MANUAL_EXIT' as const, exit_date: new Date().toISOString(),
      gross_pnl: (t.latest_price - t.entry_price) * t.position_size,
      pnl: (t.latest_price - t.entry_price) * t.position_size - t.fees,
      return_pct: t.virtual_amount > 0 ? ((t.latest_price - t.entry_price) * t.position_size - t.fees) / t.virtual_amount * 100 : 0,
      holding_hours: (Date.now() - new Date(t.entry_date).getTime()) / 3600000,
    } : t)
    saveTrades(updated)
  }, [trades, saveTrades])

  const clearAllData = useCallback(() => {
    if (confirm('Clear all trades, outcomes and reset account? This cannot be undone.')) {
      setTrades([]); setMetrics(INITIAL_METRICS); setAnalyses({}); setSnapshots([])
      setScanStatus({}); setLastRunAt(null); setOutcomes([])
      try {
        localStorage.removeItem(STORAGE.trades)
        localStorage.removeItem(STORAGE.outcomes)
      } catch {}
    }
  }, [])

  const validation: ValidationReport = buildValidationReport(trades, outcomes, null)

  const navItems: { id: Tab; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
    { id: 'scan', label: 'Market Scan', icon: Activity },
    { id: 'trades', label: 'Paper Trades', icon: BookOpen },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'strategy', label: 'Validation', icon: FlaskConical },
  ]

  const decisions = Object.values(analyses)
  const buyCount = decisions.filter(a => a.decision === 'BUY').length
  const watchCount = decisions.filter(a => a.decision === 'WATCH').length

  return (
    <>
      <Head>
        <title>AI Momentum Trading Lab</title>
        <meta name="description" content="AI-assisted momentum paper-trading research system" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📈</text></svg>" />
      </Head>

      <div className="min-h-screen bg-terminal-black text-slate-100">
        <header className="border-b border-terminal-border bg-terminal-dark bg-opacity-90 sticky top-0 z-40 backdrop-blur-sm">
          <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-signal-green bg-opacity-15 flex items-center justify-center border border-signal-green border-opacity-30">
                <Brain size={16} className="text-signal-green" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white tracking-tight">AI Momentum Lab</h1>
                <p className="text-xs text-slate-600 hidden sm:block">Momentum Research System</p>
              </div>
            </div>

            <nav className="flex items-center gap-1">
              {navItems.map(item => {
                const Icon = item.icon
                return (
                  <button key={item.id} onClick={() => setTab(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      tab === item.id
                        ? 'bg-signal-green bg-opacity-15 text-signal-green border border-signal-green border-opacity-30'
                        : 'text-slate-400 hover:text-white hover:bg-terminal-muted'}`}>
                    <Icon size={13} />
                    <span className="hidden md:inline">{item.label}</span>
                  </button>
                )
              })}
            </nav>

            <div className="flex items-center gap-2">
              <button onClick={updatePrices} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5" title="Fetch latest prices & step trades">
                <RefreshCw size={12} />
                <span className="hidden sm:inline">Update</span>
              </button>
              <button onClick={runAICommittee} disabled={isRunning}
                className="btn-primary text-sm py-2 px-5 flex items-center gap-2 glow-green">
                {isRunning ? <><RefreshCw size={14} className="animate-spin" />Running...</>
                  : <><Play size={14} />Run AI Committee</>}
              </button>
            </div>
          </div>
        </header>

        {isRunning && (
          <div className="fixed top-14 left-0 right-0 z-30">
            <div className="h-0.5 bg-terminal-border">
              <div className="h-full bg-signal-green transition-all duration-500" style={{ width: `${runProgress}%` }} />
            </div>
            <div className="bg-terminal-dark border-b border-terminal-border px-4 py-2">
              <div className="max-w-screen-2xl mx-auto flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-signal-green animate-pulse" />
                <p className="text-xs text-signal-green font-mono">{runMessage}</p>
                <span className="text-xs text-slate-600 ml-auto">{runProgress}%</span>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-screen-2xl mx-auto px-4 py-6">
          {/* Data-source banner: DEMO (amber) or DEGRADED (blue) */}
          {isDemo && (
            <div className="mb-5 flex items-start gap-2 p-3 rounded-lg bg-signal-amber bg-opacity-10 border border-signal-amber border-opacity-30">
              <AlertTriangle size={16} className="text-signal-amber shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300">
                <span className="font-bold text-signal-amber">DEMO MODE — synthetic data.</span>{' '}
                All tickers prefixed <span className="font-mono">DEMO-</span> are fake fixtures. The committee will <span className="font-bold">never issue a BUY</span> or open trades in this mode.
                {dataError && <span className="block mt-1 text-signal-amber">Reason: {dataError}</span>}
                <span className="block mt-1">Recommended for free tier: set <span className="font-mono">MARKET_DATA_PROVIDER=finnhub</span> with <span className="font-mono">FINNHUB_API_KEY</span>.</span>
              </div>
            </div>
          )}
          {!isDemo && dataStatus === 'DEGRADED' && (
            <div className="mb-5 flex items-start gap-2 p-3 rounded-lg bg-signal-blue bg-opacity-10 border border-signal-blue border-opacity-30">
              <AlertTriangle size={16} className="text-signal-blue shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300">
                <span className="font-bold text-signal-blue">DEGRADED — live data via fallback.</span>{' '}
                {dataError || 'The provider\'s top-movers endpoint was unavailable, so a liquid watchlist is being used.'} Data is real, but not a full market scan.
              </div>
            </div>
          )}

          {/* Status bar */}
          <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              {lastRunAt && <p className="text-xs text-slate-600">Last scan: {new Date(lastRunAt).toLocaleTimeString()}</p>}
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                dataStatus === 'LIVE' ? 'bg-signal-green bg-opacity-15 text-signal-green border-signal-green border-opacity-30'
                : dataStatus === 'DEGRADED' ? 'bg-signal-blue bg-opacity-15 text-signal-blue border-signal-blue border-opacity-30'
                : 'bg-signal-amber bg-opacity-15 text-signal-amber border-signal-amber border-opacity-30'}`}>
                {dataStatus}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-terminal-muted text-slate-300 font-mono">
                Provider: {dataSource === 'demo' ? 'Demo' : dataSource.charAt(0).toUpperCase() + dataSource.slice(1)}
              </span>
              {market && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-terminal-muted text-slate-400 font-mono">
                  SPY {market.spy_trend} · QQQ {market.qqq_trend}
                </span>
              )}
              {buyCount > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-signal-green bg-opacity-15 text-signal-green border border-signal-green border-opacity-30">{buyCount} BUY</span>}
              {watchCount > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-signal-amber bg-opacity-15 text-signal-amber border border-signal-amber border-opacity-30">{watchCount} WATCH</span>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => exportToCSV(trades)} className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"><Download size={11} /> CSV</button>
              <button onClick={() => exportToExcel(trades)} className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"><Download size={11} /> Excel</button>
              <button onClick={() => exportToJSON({ trades, metrics, analyses: Object.values(analyses), outcomes, validation })} className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"><Download size={11} /> JSON</button>
              <button onClick={() => exportToPDFReport(trades, metrics)} className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"><Download size={11} /> PDF</button>
            </div>
          </div>

          {/* ---- DASHBOARD ---- */}
          {tab === 'dashboard' && (
            <div className="space-y-6">
              <DashboardMetrics metrics={metrics} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                  <h3 className="text-sm font-bold text-white mb-3">Strategy Readiness</h3>
                  <ReadinessSummary validation={validation} />
                </div>
                <div className="card">
                  <h3 className="text-sm font-bold text-white mb-3">Run Log</h3>
                  <div className="bg-terminal-black rounded-lg p-3 h-56 overflow-y-auto font-mono text-xs space-y-1">
                    {runLog.length === 0
                      ? <p className="text-slate-600">No activity yet. Run the AI committee to begin.</p>
                      : runLog.map((l, i) => <p key={i} className="text-slate-400">{l}</p>)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ---- MARKET SCAN ---- */}
          {tab === 'scan' && (
            <div className="card">
              <ScanTable
                snapshots={snapshots} analyses={analyses} scanStatus={scanStatus}
                onSelect={(a) => { setSelectedAnalysis(a); setShowDetail(true) }}
              />
            </div>
          )}

          {/* ---- PAPER TRADES ---- */}
          {tab === 'trades' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white">Paper Trade Journal</h2>
                <div className="flex gap-2">
                  <button onClick={closeAllTrades} className="btn-secondary text-xs py-1.5 px-3">Close All Open</button>
                  <button onClick={clearAllData} className="text-xs py-1.5 px-3 rounded-lg border border-signal-red border-opacity-30 text-signal-red hover:bg-signal-red hover:bg-opacity-10">Reset Account</button>
                </div>
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Open Positions</h3>
                <TradeJournalTable trades={trades} showClosed={false} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 mt-4">Closed Trades</h3>
                <TradeJournalTable trades={trades} showClosed={true} />
              </div>
            </div>
          )}

          {/* ---- ANALYTICS ---- */}
          {tab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card"><h3 className="text-sm font-bold text-white mb-3">Equity Curve (net of costs)</h3><EquityCurveChart trades={trades} /></div>
                <div className="card"><h3 className="text-sm font-bold text-white mb-3">Return Distribution</h3><ReturnDistributionChart trades={trades} /></div>
                <div className="card"><h3 className="text-sm font-bold text-white mb-3">Forward Returns by Decision</h3><DecisionAccuracyChart outcomes={outcomes} /></div>
                <div className="card"><h3 className="text-sm font-bold text-white mb-3">Per-Trade P&L</h3><DayReturnChart trades={trades} /></div>
              </div>
            </div>
          )}

          {/* ---- VALIDATION ---- */}
          {tab === 'strategy' && (
            <div className="space-y-6">
              <ValidationPanel validation={validation} config={config} onConfigChange={saveConfig} />
              <AuditLogView analyses={Object.values(analyses)} />
            </div>
          )}
        </div>

        {/* Detail modal */}
        {showDetail && selectedAnalysis && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70 backdrop-blur-sm" onClick={() => setShowDetail(false)}>
            <div className="bg-terminal-dark border border-terminal-border rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-terminal-dark border-b border-terminal-border px-5 py-3 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-white text-lg">{selectedAnalysis.ticker}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-terminal-muted text-slate-300">{PLAYBOOK_LABELS[selectedAnalysis.playbook]}</span>
                  <DecisionBadge decision={selectedAnalysis.decision} size="md" />
                  {selectedAnalysis.is_demo && <span className="text-xs text-signal-amber">DEMO</span>}
                </div>
                <button onClick={() => setShowDetail(false)} className="text-slate-500 hover:text-white"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-5">
                {selectedAnalysis.snapshot && <SnapshotGrid snap={selectedAnalysis.snapshot} />}
                {selectedAnalysis.red_flags?.length > 0 && (
                  <div><h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Rule Engine Flags</h4><RedFlagList flags={selectedAnalysis.red_flags} /></div>
                )}
                {selectedAnalysis.decision === 'REJECT' && selectedAnalysis.rejection_reason && (
                  <div className="p-3 rounded-lg bg-signal-red bg-opacity-10 border border-signal-red border-opacity-25">
                    <p className="text-xs font-bold text-signal-red">Rejection Reason</p>
                    <p className="text-xs text-slate-300 mt-1">{selectedAnalysis.rejection_reason}</p>
                  </div>
                )}
                <div><h4 className="text-xs font-bold text-slate-400 uppercase mb-3">AI Committee</h4><AICommitteePanel analysis={selectedAnalysis} /></div>
              </div>
            </div>
          </div>
        )}

        <footer className="border-t border-terminal-border mt-10">
          <div className="max-w-screen-2xl mx-auto px-4 py-4 flex items-center gap-2 text-xs text-slate-600">
            <Shield size={12} />
            <p>Paper-trading research only. No real orders, no brokerage. Not financial advice. Past simulated performance does not predict future results.</p>
          </div>
        </footer>
      </div>
    </>
  )
}

function ReadinessSummary({ validation }: { validation: ValidationReport }) {
  return (
    <div className="space-y-3">
      <div className={`p-3 rounded-lg border ${validation.ready_for_real_money ? 'bg-signal-green bg-opacity-10 border-signal-green border-opacity-30' : 'bg-signal-red bg-opacity-10 border-signal-red border-opacity-30'}`}>
        <p className={`text-sm font-bold ${validation.ready_for_real_money ? 'text-signal-green' : 'text-signal-red'}`}>
          {validation.ready_for_real_money ? '✓ Cautiously testable' : '✕ Not ready for real money'}
        </p>
        <p className="text-xs text-slate-400 mt-1">{validation.verdict}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Stat label="Real closed trades" value={`${validation.closed_trades}/${validation.required_trades}`} />
        <Stat label="Net expectancy" value={`${validation.net_expectancy >= 0 ? '+' : ''}$${validation.net_expectancy.toFixed(2)}`} good={validation.net_expectancy > 0} />
      </div>
    </div>
  )
}

function Stat({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="p-2 rounded bg-terminal-muted">
      <p className="text-slate-500">{label}</p>
      <p className={`font-mono font-bold ${good === undefined ? 'text-white' : good ? 'text-signal-green' : 'text-signal-red'}`}>{value}</p>
    </div>
  )
}

function SnapshotGrid({ snap }: { snap: MarketSnapshot }) {
  const items: [string, string][] = [
    ['Price', `$${snap.price}`],
    ['Prev close', `$${snap.previous_close}`],
    ['Day change', `${snap.change_pct.toFixed(2)}%`],
    ['Pre-market', snap.premarket_change_pct != null ? `${snap.premarket_change_pct.toFixed(2)}%` : '—'],
    ['VWAP', snap.vwap != null ? `$${snap.vwap}` : '—'],
    ['Day H/L', `$${snap.day_high}/$${snap.day_low}`],
    ['RVOL', `${snap.relative_volume.toFixed(2)}x`],
    ['Volume', `${(snap.volume / 1e6).toFixed(1)}M`],
    ['Spread', snap.spread_pct != null ? `${(snap.spread_pct * 100).toFixed(2)}%` : '—'],
    ['Mkt cap', snap.market_cap ? `$${(snap.market_cap / 1e9).toFixed(2)}B` : '—'],
    ['Float', snap.float_shares != null ? `${(snap.float_shares / 1e6).toFixed(1)}M` : '—'],
    ['Sector', snap.sector],
  ]
  return (
    <div>
      <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Market Data <span className="text-slate-600 normal-case">({snap.data_source}{snap.is_demo ? ', synthetic' : ''})</span></h4>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {items.map(([k, v]) => (
          <div key={k} className="p-2 rounded bg-terminal-muted">
            <p className="text-xs text-slate-500">{k}</p>
            <p className="text-xs font-mono text-white truncate">{v}</p>
          </div>
        ))}
      </div>
      {snap.catalyst && (
        <p className="text-xs text-slate-400 mt-2">
          <span className="text-slate-500">Catalyst: </span>{snap.catalyst}
          {snap.catalyst_source_url && <a href={snap.catalyst_source_url} target="_blank" rel="noreferrer" className="text-signal-blue ml-1 underline">source</a>}
        </p>
      )}
      {snap.intraday && <IntradayGrid snap={snap} />}
    </div>
  )
}

function IntradayGrid({ snap }: { snap: MarketSnapshot }) {
  const i = snap.intraday!
  const pct = (v: number | null) => v != null ? `${(v * 100).toFixed(1)}%` : '—'
  const px = (v: number | null) => v != null ? `$${v.toFixed(2)}` : '—'
  const items: [string, string, string?][] = [
    ['Session', i.session],
    ['VWAP', px(i.vwap), i.vwap_reclaim ? 'reclaim' : i.vwap_rejection ? 'rejection' : ''],
    ['vs VWAP', pct(i.pct_from_vwap)],
    ['5m EMA(9)', px(i.ema5)],
    ['vs EMA5', pct(i.pct_from_ema5)],
    ['Opening range', `${px(i.opening_range_low)}/${px(i.opening_range_high)}`],
    ['Pre-mkt high', px(i.premarket_high)],
    ['RVOL (ToD)', i.rvol_time_of_day != null ? `${i.rvol_time_of_day.toFixed(2)}x` : '—'],
    ['ADR used', pct(i.range_used_pct)],
    ['Halt risk', i.halt_risk],
    ['Catalyst age', i.minutes_since_catalyst != null ? `${i.minutes_since_catalyst}m` : '—'],
  ]
  return (
    <div className="mt-4">
      <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Intraday Microstructure</h4>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {items.map(([k, v, tag]) => (
          <div key={k} className="p-2 rounded bg-terminal-muted">
            <p className="text-xs text-slate-500">{k}</p>
            <p className={`text-xs font-mono truncate ${
              k === 'Halt risk'
                ? (v === 'HIGH' ? 'text-signal-red' : v === 'MEDIUM' ? 'text-signal-amber' : 'text-signal-green')
                : 'text-white'}`}>{v}</p>
            {tag ? <p className={`text-xs ${tag === 'reclaim' ? 'text-signal-green' : tag === 'rejection' ? 'text-signal-red' : 'text-slate-600'}`}>{tag}</p> : null}
          </div>
        ))}
      </div>
    </div>
  )
}
