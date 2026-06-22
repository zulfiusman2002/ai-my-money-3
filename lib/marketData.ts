// ============================================================================
// Market data layer — real providers (Finnhub / Polygon / Twelve Data) with a
// DETERMINISTIC, clearly-labelled demo fallback.
//
// Demo data is fixed and obviously synthetic. It never produces randomised
// "confident" numbers, and every demo snapshot is stamped is_demo = true so the
// AI layer and UI can refuse to treat it as a real signal.
// ============================================================================
import { MarketSnapshot, MarketContext, Candle, IndexTrend } from './types'
import { buildIntradayMetrics, sessionOf, rvolByTimeOfDay } from './intraday'

type Provider = 'polygon' | 'finnhub' | 'twelvedata' | 'none'

// Liquid watchlist used as a free-tier fallback when a provider's "top movers"
// endpoint is unavailable (e.g. Polygon gainers 403 on the free plan).
// Override via MARKET_WATCHLIST="NVDA,TSLA,..." if desired.
const DEFAULT_WATCHLIST = [
  'NVDA', 'TSLA', 'AMD', 'PLTR', 'AAPL', 'MSFT', 'META',
  'GOOGL', 'AMZN', 'COIN', 'MSTR', 'SOFI', 'SMCI',
]

function watchlist(): string[] {
  const env = (process.env.MARKET_WATCHLIST || '').trim()
  if (env) return env.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
  return DEFAULT_WATCHLIST
}

// Resolve the active provider.
// Priority:
//   1. Explicit selection via MARKET_DATA_PROVIDER / NEXT_PUBLIC_MARKET_DATA_PROVIDER
//      (only honored if the matching API key is present).
//   2. Auto-detect by key presence, in order: Finnhub > Twelve Data > Polygon.
//      (Finnhub first because it works on the free tier; Polygon's gainers
//      endpoint requires a paid plan and 403s otherwise.)
export function activeProvider(): Provider {
  const explicit = (process.env.MARKET_DATA_PROVIDER || process.env.NEXT_PUBLIC_MARKET_DATA_PROVIDER || '')
    .trim().toLowerCase()

  const hasPolygon = !!process.env.POLYGON_API_KEY
  const hasFinnhub = !!process.env.FINNHUB_API_KEY
  const hasTwelve = !!process.env.TWELVEDATA_API_KEY

  let provider: Provider = 'none'

  if (explicit === 'polygon' && hasPolygon) provider = 'polygon'
  else if (explicit === 'finnhub' && hasFinnhub) provider = 'finnhub'
  else if ((explicit === 'twelvedata' || explicit === 'twelve_data' || explicit === 'twelve') && hasTwelve) provider = 'twelvedata'
  else if (explicit && explicit !== 'demo') {
    // An explicit provider was named but its key is missing — log and auto-detect.
    console.warn(`Selected provider "${explicit}" but its API key is not set; auto-detecting instead.`)
    provider = autoDetect(hasFinnhub, hasTwelve, hasPolygon)
  } else if (explicit === 'demo') {
    provider = 'none'
  } else {
    provider = autoDetect(hasFinnhub, hasTwelve, hasPolygon)
  }

  console.log('Selected market data provider:', provider, explicit ? `(requested: ${explicit})` : '(auto-detected)')
  return provider
}

// Auto-detect order: Finnhub > Twelve Data > Polygon (free-tier friendly first).
function autoDetect(hasFinnhub: boolean, hasTwelve: boolean, hasPolygon: boolean): Provider {
  if (hasFinnhub) return 'finnhub'
  if (hasTwelve) return 'twelvedata'
  if (hasPolygon) return 'polygon'
  return 'none'
}

export function isDemoMode(): boolean {
  return activeProvider() === 'none'
}

// ----------------------------------------------------------------------------
// Fixed demo universe — static, hand-set values. Clearly synthetic.
// These are NOT randomised. They are a stable fixture for UI/plumbing testing.
// ----------------------------------------------------------------------------
const DEMO_UNIVERSE: MarketSnapshot[] = [
  {
    ticker: 'DEMO-A', company: 'Demo Alpha Corp (SYNTHETIC)', price: 52.40,
    previous_close: 48.10, open: 50.20, day_high: 53.10, day_low: 49.80, vwap: 51.30,
    change_pct: 8.94, premarket_change_pct: 4.2, volume: 18_400_000, avg_volume: 6_100_000,
    relative_volume: 3.02, bid: 52.38, ask: 52.42, spread_pct: 0.00076,
    market_cap: 4.2e9, float_shares: 38_000_000, sector: 'Technology',
    catalyst: 'Reported earnings beat before open (DEMO)',
    catalyst_source_url: null, news_timestamp: null,
    sector_performance_pct: 1.4, data_source: 'demo', is_demo: true,
    fetched_at: new Date().toISOString(),
  },
  {
    ticker: 'DEMO-B', company: 'Demo Beta Inc (SYNTHETIC)', price: 14.85,
    previous_close: 14.60, open: 14.70, day_high: 15.05, day_low: 14.40, vwap: 14.95,
    change_pct: 1.71, premarket_change_pct: 0.4, volume: 2_100_000, avg_volume: 3_800_000,
    relative_volume: 0.55, bid: 14.80, ask: 14.92, spread_pct: 0.0081,
    market_cap: 9.0e8, float_shares: 120_000_000, sector: 'Industrials',
    catalyst: 'No clear catalyst (DEMO)',
    catalyst_source_url: null, news_timestamp: null,
    sector_performance_pct: -0.3, data_source: 'demo', is_demo: true,
    fetched_at: new Date().toISOString(),
  },
  {
    ticker: 'DEMO-C', company: 'Demo Gamma Ltd (SYNTHETIC)', price: 7.10,
    previous_close: 5.95, open: 6.40, day_high: 7.80, day_low: 6.30, vwap: 6.55,
    change_pct: 19.33, premarket_change_pct: 11.0, volume: 41_000_000, avg_volume: 4_200_000,
    relative_volume: 9.76, bid: 7.02, ask: 7.18, spread_pct: 0.0226,
    market_cap: 3.1e8, float_shares: 12_000_000, sector: 'Biotechnology',
    catalyst: 'Low-float spike, unverified chatter (DEMO)',
    catalyst_source_url: null, news_timestamp: null,
    sector_performance_pct: 0.6, data_source: 'demo', is_demo: true,
    fetched_at: new Date().toISOString(),
  },
  {
    ticker: 'DEMO-D', company: 'Demo Delta Co (SYNTHETIC)', price: 188.20,
    previous_close: 181.00, open: 184.10, day_high: 189.40, day_low: 183.50, vwap: 186.10,
    change_pct: 3.98, premarket_change_pct: 1.9, volume: 9_800_000, avg_volume: 5_500_000,
    relative_volume: 1.78, bid: 188.16, ask: 188.24, spread_pct: 0.00043,
    market_cap: 2.6e10, float_shares: 140_000_000, sector: 'Technology',
    catalyst: 'Analyst upgrade to Buy, raised target (DEMO)',
    catalyst_source_url: null, news_timestamp: null,
    sector_performance_pct: 1.4, data_source: 'demo', is_demo: true,
    fetched_at: new Date().toISOString(),
  },
  {
    ticker: 'DEMO-E', company: 'Demo Epsilon SA (SYNTHETIC)', price: 33.90,
    previous_close: 35.10, open: 34.80, day_high: 35.00, day_low: 33.40, vwap: 34.20,
    change_pct: -3.42, premarket_change_pct: -1.2, volume: 7_400_000, avg_volume: 4_000_000,
    relative_volume: 1.85, bid: 33.86, ask: 33.94, spread_pct: 0.00236,
    market_cap: 5.4e9, float_shares: 90_000_000, sector: 'Consumer Discretionary',
    catalyst: 'Faded from morning highs (DEMO)',
    catalyst_source_url: null, news_timestamp: null,
    sector_performance_pct: -0.8, data_source: 'demo', is_demo: true,
    fetched_at: new Date().toISOString(),
  },
]

function demoSnapshots(): MarketSnapshot[] {
  const now = Date.now()
  const nowIso = new Date(now).toISOString()
  return DEMO_UNIVERSE.map(s => {
    // Build deterministic synthetic 1-minute candles for the regular session so
    // demo mode exercises the full intraday pipeline (no randomness).
    const candles1m = buildDemoCandles(s, now)
    const intraday = buildIntradayMetrics({
      candles1m,
      price: s.price,
      previous_close: s.previous_close,
      avg_daily_range: Math.max(0.01, (s.day_high - s.day_low) * 1.4),
      spread_pct: s.spread_pct,
      news_timestamp: s.news_timestamp,
      now,
    })
    return { ...s, fetched_at: nowIso, intraday, intraday_candles: intraday.candles_5m }
  })
}

// Deterministic candle generator for demo tickers — a smooth, fixed path from
// open to current price. No Math.random anywhere.
function buildDemoCandles(s: MarketSnapshot, now: number): Candle[] {
  const candles: Candle[] = []
  // Anchor the session to a fixed 09:30 ET base today.
  const base = new Date(now)
  base.setUTCHours(13, 30, 0, 0) // ~09:30 EDT
  const openMs = base.getTime()
  const N = 60 // first 60 minutes of trading
  const span = s.price - s.open
  for (let i = 0; i < N; i++) {
    const frac = i / (N - 1)
    // ease-in-out interpolation open -> price
    const ease = frac < 0.5 ? 2 * frac * frac : 1 - Math.pow(-2 * frac + 2, 2) / 2
    const c = s.open + span * ease
    const o = i === 0 ? s.open : candles[i - 1].c
    const h = Math.max(o, c) * 1.001
    const l = Math.min(o, c) * 0.999
    const v = Math.round(s.volume / N)
    candles.push({ t: openMs + i * 60_000, o, h, l, c, v })
  }
  return candles
}

function trendFromPct(pct: number): IndexTrend {
  if (pct > 0.25) return 'UP'
  if (pct < -0.25) return 'DOWN'
  return 'FLAT'
}

// ----------------------------------------------------------------------------
// FINNHUB
// ----------------------------------------------------------------------------
async function finnhubQuote(symbol: string, key: string) {
  const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${key}`)
  if (!r.ok) throw new Error(`Finnhub quote ${r.status}`)
  return r.json() as Promise<{ c: number; d: number; dp: number; h: number; l: number; o: number; pc: number }>
}

async function finnhubProfile(symbol: string, key: string) {
  try {
    const r = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${key}`)
    if (!r.ok) return null
    return r.json() as Promise<any>
  } catch { return null }
}

// Finnhub dynamic universe cache (symbols change rarely; cache for the process).
let finnhubUniverseCache: { symbols: string[]; at: number } | null = null

async function finnhubUniverse(key: string): Promise<string[]> {
  // Cache for 6 hours
  if (finnhubUniverseCache && Date.now() - finnhubUniverseCache.at < 6 * 3600_000) {
    return finnhubUniverseCache.symbols
  }
  try {
    const r = await fetch(`https://finnhub.io/api/v1/stock/symbol?exchange=US&token=${key}`)
    if (!r.ok) throw new Error(`symbol list ${r.status}`)
    const arr = (await r.json()) as Array<{ symbol: string; type: string; mic?: string }>
    // Common stocks only, primary listing exchanges, no warrants/units/odd tickers
    const symbols = arr
      .filter(s => s.type === 'Common Stock')
      .filter(s => /^[A-Z]{1,5}$/.test(s.symbol))
      .map(s => s.symbol)
    finnhubUniverseCache = { symbols, at: Date.now() }
    return symbols
  } catch (e) {
    console.error('Finnhub universe fetch failed:', e)
    return []
  }
}

async function fetchFinnhubMovers(key: string): Promise<MarketSnapshot[]> {
  // DYNAMIC DISCOVERY (#3): pull the live US common-stock universe, then scan a
  // capped rotating sample by quote to find the day's real movers. Finnhub has
  // no single "top movers" endpoint, so we discover rather than hardcode.
  // The scan cap keeps us within rate limits; the sample rotates by the minute
  // so repeated runs cover different parts of the universe.
  const SCAN_CAP = parseInt(process.env.FINNHUB_SCAN_CAP || '60', 10)
  const universe = await finnhubUniverse(key)

  // Seed liquid large-caps that are always worth checking, then add a rotating
  // slice of the broader universe for genuine discovery.
  const seeds = ['NVDA', 'AMD', 'TSLA', 'META', 'PLTR', 'SMCI', 'COIN', 'AMZN', 'AAPL', 'MSFT', 'MARA', 'SOFI']
  let pool: string[]
  if (universe.length) {
    const rotate = Math.floor(Date.now() / 60_000) % Math.max(1, universe.length)
    const rotated = universe.slice(rotate).concat(universe.slice(0, rotate))
    const seedSet = new Set(seeds)
    pool = [...seeds, ...rotated.filter(s => !seedSet.has(s))].slice(0, SCAN_CAP)
  } else {
    pool = seeds // graceful fallback if the universe endpoint is unavailable
  }

  const out: MarketSnapshot[] = []
  for (const sym of pool) {
    try {
      const q = await finnhubQuote(sym, key)
      if (!q || !q.c || !q.pc) continue
      const change_pct = q.pc > 0 ? (q.c - q.pc) / q.pc * 100 : 0
      // Only enrich (profile call) the genuine movers to conserve rate limit.
      if (Math.abs(change_pct) < 3) {
        out.push(quickFinnhubSnapshot(sym, sym, q, change_pct))
        continue
      }
      const prof = await finnhubProfile(sym, key)
      out.push({
        ...quickFinnhubSnapshot(sym, prof?.name || sym, q, change_pct),
        market_cap: prof?.marketCapitalization ? prof.marketCapitalization * 1e6 : 0,
        float_shares: prof?.shareOutstanding ? prof.shareOutstanding * 1e6 : null,
        sector: prof?.finnhubIndustry || 'Unknown',
      })
    } catch { /* skip symbol */ }
  }
  return out
    .filter(s => Math.abs(s.change_pct) >= 1)
    .sort((a, b) => Math.abs(b.change_pct) - Math.abs(a.change_pct))
    .slice(0, 8)
}

function quickFinnhubSnapshot(ticker: string, company: string, q: any, change_pct: number): MarketSnapshot {
  return {
    ticker, company,
    price: q.c, previous_close: q.pc, open: q.o, day_high: q.h, day_low: q.l,
    vwap: null, change_pct, premarket_change_pct: null,
    volume: 0, avg_volume: 0, relative_volume: 0,
    bid: null, ask: null, spread_pct: null,
    market_cap: 0, float_shares: null, sector: 'Unknown',
    catalyst: 'Discovered mover (Finnhub dynamic scan)',
    catalyst_source_url: null, news_timestamp: null,
    sector_performance_pct: null,
    data_source: 'finnhub', is_demo: false,
    fetched_at: new Date().toISOString(),
  }
}

// ----------------------------------------------------------------------------
// POLYGON
// ----------------------------------------------------------------------------
async function fetchPolygonMovers(key: string): Promise<MarketSnapshot[]> {
  // Try the gainers snapshot first (paid tier). On 403/anything, fall back to a
  // liquid watchlist using the free "previous close" aggregates endpoint.
  const r = await fetch(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/gainers?apiKey=${key}`)
  if (!r.ok) {
    if (r.status === 403 || r.status === 401) {
      console.warn(`Polygon gainers ${r.status} (likely free-tier restriction) — using watchlist via free endpoints.`)
      const wl = await fetchPolygonWatchlist(key)
      if (wl.length) return wl
    }
    throw new Error(`Polygon gainers ${r.status}`)
  }
  const data = await r.json()
  const tickers = (data.tickers || []).slice(0, 8)
  if (!tickers.length) {
    // Empty (e.g. market closed) — try the watchlist so we still return live data.
    const wl = await fetchPolygonWatchlist(key)
    if (wl.length) return wl
  }
  return tickers.map((t: any): MarketSnapshot => {
    const day = t.day || {}
    const prevDay = t.prevDay || {}
    const min = t.min || {}
    const change_pct = t.todaysChangePerc ?? 0
    const price = day.c || min.c || t.lastTrade?.p || prevDay.c || 0
    const vwap = day.vw || min.vw || null
    const prevClose = prevDay.c || 0
    return {
      ticker: t.ticker,
      company: t.ticker,
      price, previous_close: prevClose,
      open: day.o || 0, day_high: day.h || 0, day_low: day.l || 0,
      vwap,
      change_pct,
      premarket_change_pct: null,
      volume: day.v || 0,
      avg_volume: prevDay.v || 0,
      relative_volume: prevDay.v ? (day.v || 0) / prevDay.v : 0,
      bid: t.lastQuote?.p || null,
      ask: t.lastQuote?.P || null,
      spread_pct: t.lastQuote?.p && t.lastQuote?.P
        ? (t.lastQuote.P - t.lastQuote.p) / t.lastQuote.p : null,
      market_cap: 0,
      float_shares: null,
      sector: 'Unknown',
      catalyst: 'Top gainer (Polygon snapshot)',
      catalyst_source_url: null, news_timestamp: null,
      sector_performance_pct: null,
      data_source: 'polygon', is_demo: false,
      fetched_at: new Date().toISOString(),
    }
  })
}

// Free-tier Polygon path: pull previous-day aggregates for each watchlist symbol
// (the /v2/aggs/ticker/{sym}/prev endpoint is available on the free plan).
async function fetchPolygonWatchlist(key: string): Promise<MarketSnapshot[]> {
  const syms = watchlist()
  const out: MarketSnapshot[] = []
  for (const sym of syms) {
    try {
      const r = await fetch(`https://api.polygon.io/v2/aggs/ticker/${sym}/prev?adjusted=true&apiKey=${key}`)
      if (!r.ok) continue
      const d = await r.json()
      const res = d.results?.[0]
      if (!res) continue
      // prev endpoint returns the prior session: o/h/l/c/v and vw (VWAP).
      const price = res.c || 0
      const open = res.o || 0
      const change_pct = open > 0 ? (price - open) / open * 100 : 0
      out.push({
        ticker: sym, company: sym,
        price, previous_close: open,
        open, day_high: res.h || 0, day_low: res.l || 0,
        vwap: res.vw || null,
        change_pct,
        premarket_change_pct: null,
        volume: res.v || 0, avg_volume: 0, relative_volume: 0,
        bid: null, ask: null, spread_pct: null,
        market_cap: 0, float_shares: null, sector: 'Unknown',
        catalyst: 'Watchlist (Polygon free-tier aggregates)',
        catalyst_source_url: null, news_timestamp: null,
        sector_performance_pct: null,
        data_source: 'polygon', is_demo: false,
        fetched_at: new Date().toISOString(),
      })
    } catch { /* skip symbol */ }
  }
  return out
    .sort((a, b) => Math.abs(b.change_pct) - Math.abs(a.change_pct))
    .slice(0, 8)
}

// ----------------------------------------------------------------------------
// TWELVE DATA
// ----------------------------------------------------------------------------
async function fetchTwelveDataMovers(key: string): Promise<MarketSnapshot[]> {
  // DYNAMIC DISCOVERY (#3): try Twelve Data's market_movers endpoint first
  // (available on supported plans). Fall back to a quote scan if unavailable.
  try {
    const r = await fetch(`https://api.twelvedata.com/market_movers/stocks?direction=gainers&outputsize=8&apikey=${key}`)
    if (r.ok) {
      const data = await r.json()
      const values = data?.values || data?.gainers
      if (Array.isArray(values) && values.length) {
        const out: MarketSnapshot[] = values.slice(0, 8).map((m: any): MarketSnapshot => {
          const price = parseFloat(m.last ?? m.price ?? m.close)
          const change_pct = parseFloat(m.percent_change ?? m.change_percent ?? 0)
          const prevClose = change_pct !== 0 ? price / (1 + change_pct / 100) : price
          return {
            ticker: m.symbol, company: m.name || m.symbol,
            price, previous_close: prevClose,
            open: parseFloat(m.open) || 0, day_high: parseFloat(m.high) || 0, day_low: parseFloat(m.low) || 0,
            vwap: null, change_pct, premarket_change_pct: null,
            volume: parseInt(m.volume) || 0, avg_volume: 0, relative_volume: 0,
            bid: null, ask: null, spread_pct: null,
            market_cap: 0, float_shares: null, sector: 'Unknown',
            catalyst: 'Top gainer (Twelve Data movers)',
            catalyst_source_url: null, news_timestamp: null,
            sector_performance_pct: null,
            data_source: 'twelvedata', is_demo: false,
            fetched_at: new Date().toISOString(),
          }
        })
        if (out.length) return out
      }
    }
  } catch { /* fall through to quote scan */ }

  // Fallback: quote-scan a liquid seed list (used when movers endpoint is not on the plan).
  const watch = ['NVDA', 'AMD', 'TSLA', 'META', 'PLTR', 'SMCI', 'COIN', 'AMZN']
  const out: MarketSnapshot[] = []
  for (const sym of watch) {
    try {
      const r = await fetch(`https://api.twelvedata.com/quote?symbol=${sym}&apikey=${key}`)
      if (!r.ok) continue
      const q = await r.json()
      if (q.status === 'error' || !q.close) continue
      const price = parseFloat(q.close)
      const prevClose = parseFloat(q.previous_close)
      const change_pct = prevClose > 0 ? (price - prevClose) / prevClose * 100 : 0
      out.push({
        ticker: sym,
        company: q.name || sym,
        price, previous_close: prevClose,
        open: parseFloat(q.open) || 0,
        day_high: parseFloat(q.high) || 0,
        day_low: parseFloat(q.low) || 0,
        vwap: null,
        change_pct,
        premarket_change_pct: null,
        volume: parseInt(q.volume) || 0,
        avg_volume: parseInt(q.average_volume) || 0,
        relative_volume: q.average_volume ? (parseInt(q.volume) || 0) / parseInt(q.average_volume) : 0,
        bid: null, ask: null, spread_pct: null,
        market_cap: 0, float_shares: null,
        sector: 'Unknown',
        catalyst: 'Quote-derived mover',
        catalyst_source_url: null, news_timestamp: null,
        sector_performance_pct: null,
        data_source: 'twelvedata', is_demo: false,
        fetched_at: new Date().toISOString(),
      })
    } catch { /* skip */ }
  }
  return out
    .filter(s => Math.abs(s.change_pct) >= 1)
    .sort((a, b) => Math.abs(b.change_pct) - Math.abs(a.change_pct))
    .slice(0, 8)
}

// ----------------------------------------------------------------------------
// Public: fetch movers
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// Intraday candle fetching (1-minute) per provider, plus ADR.
// ----------------------------------------------------------------------------
async function fetchCandles1mPolygon(symbol: string, key: string): Promise<Candle[]> {
  // Today's 1-minute aggregates (includes pre-market with the right params).
  const day = new Date().toISOString().slice(0, 10)
  const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/minute/${day}/${day}?adjusted=true&sort=asc&limit=50000&apiKey=${key}`
  const r = await fetch(url)
  if (!r.ok) throw new Error(`polygon candles ${r.status}`)
  const d = await r.json()
  return (d.results || []).map((c: any): Candle => ({ t: c.t, o: c.o, h: c.h, l: c.l, c: c.c, v: c.v }))
}

async function fetchCandles1mTwelve(symbol: string, key: string): Promise<Candle[]> {
  const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1min&outputsize=390&apikey=${key}`
  const r = await fetch(url)
  if (!r.ok) throw new Error(`twelvedata candles ${r.status}`)
  const d = await r.json()
  if (d.status === 'error' || !Array.isArray(d.values)) return []
  return d.values.map((v: any): Candle => ({
    t: Date.parse(v.datetime), o: +v.open, h: +v.high, l: +v.low, c: +v.close, v: +v.volume || 0,
  })).sort((a: Candle, b: Candle) => a.t - b.t)
}

async function fetchCandles1mFinnhub(symbol: string, key: string): Promise<Candle[]> {
  const to = Math.floor(Date.now() / 1000)
  const from = to - 24 * 3600
  const url = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=1&from=${from}&to=${to}&token=${key}`
  const r = await fetch(url)
  if (!r.ok) throw new Error(`finnhub candles ${r.status}`)
  const d = await r.json()
  if (d.s !== 'ok' || !Array.isArray(d.t)) return []
  return d.t.map((t: number, i: number): Candle => ({
    t: t * 1000, o: d.o[i], h: d.h[i], l: d.l[i], c: d.c[i], v: d.v[i],
  }))
}

async function fetchCandles1m(symbol: string): Promise<Candle[]> {
  const provider = activeProvider()
  try {
    if (provider === 'polygon') return await fetchCandles1mPolygon(symbol, process.env.POLYGON_API_KEY!)
    if (provider === 'twelvedata') return await fetchCandles1mTwelve(symbol, process.env.TWELVEDATA_API_KEY!)
    if (provider === 'finnhub') return await fetchCandles1mFinnhub(symbol, process.env.FINNHUB_API_KEY!)
  } catch (e) {
    console.error(`candle fetch failed for ${symbol}:`, e)
  }
  return []
}

// Average daily range ($) over ~14 prior days (Polygon daily aggs; best-effort).
async function fetchAvgDailyRange(symbol: string): Promise<number | null> {
  const provider = activeProvider()
  try {
    if (provider === 'polygon') {
      const to = new Date().toISOString().slice(0, 10)
      const from = new Date(Date.now() - 25 * 86400_000).toISOString().slice(0, 10)
      const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${from}/${to}?adjusted=true&sort=desc&limit=14&apiKey=${process.env.POLYGON_API_KEY}`
      const r = await fetch(url)
      if (!r.ok) return null
      const d = await r.json()
      const rows = (d.results || []).slice(0, 14)
      if (!rows.length) return null
      const avg = rows.reduce((s: number, c: any) => s + (c.h - c.l), 0) / rows.length
      return avg || null
    }
    if (provider === 'twelvedata') {
      const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1day&outputsize=14&apikey=${process.env.TWELVEDATA_API_KEY}`
      const r = await fetch(url)
      if (!r.ok) return null
      const d = await r.json()
      if (!Array.isArray(d.values) || !d.values.length) return null
      const avg = d.values.reduce((s: number, v: any) => s + (+v.high - +v.low), 0) / d.values.length
      return avg || null
    }
  } catch { /* ignore */ }
  return null
}

// Enrich a snapshot with full intraday metrics from real candles.
export async function enrichWithIntraday(snap: MarketSnapshot): Promise<MarketSnapshot> {
  if (snap.is_demo) return snap // demo snapshots get synthetic intraday separately
  const [candles1m, adr] = await Promise.all([
    fetchCandles1m(snap.ticker),
    fetchAvgDailyRange(snap.ticker),
  ])
  if (!candles1m.length) return snap

  const intraday = buildIntradayMetrics({
    candles1m,
    price: snap.price,
    previous_close: snap.previous_close,
    avg_daily_range: adr,
    spread_pct: snap.spread_pct,
    news_timestamp: snap.news_timestamp,
  })

  // Backfill VWAP and a proper RVOL-by-time-of-day when we can.
  const vwap = intraday.vwap ?? snap.vwap
  let relative_volume = snap.relative_volume
  if (snap.avg_volume > 0 && intraday.session === 'REGULAR') {
    const reg = candles1m.filter(c => sessionOf(c.t) === 'REGULAR')
    const sessVol = reg.reduce((s, c) => s + c.v, 0)
    if (reg.length) {
      const last = reg[reg.length - 1]
      const minSinceOpen = Math.max(1, Math.round((last.t - reg[0].t) / 60000) + 1)
      const rv = rvolByTimeOfDay(sessVol, minSinceOpen, snap.avg_volume)
      if (rv != null) {
        relative_volume = rv
        intraday.rvol_time_of_day = rv
      }
    }
  }

  // Pre-market change from pre-market candles if available
  let premarket_change_pct = snap.premarket_change_pct
  if (premarket_change_pct == null && snap.previous_close > 0) {
    const pre = candles1m.filter(c => sessionOf(c.t) === 'PRE')
    if (pre.length) {
      const lastPre = pre[pre.length - 1].c
      premarket_change_pct = (lastPre - snap.previous_close) / snap.previous_close * 100
    }
  }

  return {
    ...snap,
    vwap,
    relative_volume,
    premarket_change_pct,
    intraday_candles: intraday.candles_5m,
    intraday,
  }
}

export interface MoversResult {
  movers: MarketSnapshot[]
  is_demo: boolean
  source: string
  status: 'LIVE' | 'DEGRADED' | 'DEMO'
  error: string | null
  provider_requested: string
}

export async function fetchMovers(): Promise<MoversResult> {
  const provider = activeProvider()
  const requested = (process.env.MARKET_DATA_PROVIDER || process.env.NEXT_PUBLIC_MARKET_DATA_PROVIDER || 'auto').toLowerCase()

  if (provider === 'none') {
    return {
      movers: demoSnapshots(), is_demo: true, source: 'demo', status: 'DEMO',
      error: 'No market-data API key configured', provider_requested: requested,
    }
  }

  let error: string | null = null
  try {
    let base: MarketSnapshot[] = []
    let source = ''
    if (provider === 'polygon') { base = await fetchPolygonMovers(process.env.POLYGON_API_KEY!); source = 'polygon' }
    else if (provider === 'finnhub') { base = await fetchFinnhubMovers(process.env.FINNHUB_API_KEY!); source = 'finnhub' }
    else if (provider === 'twelvedata') { base = await fetchTwelveDataMovers(process.env.TWELVEDATA_API_KEY!); source = 'twelvedata' }

    if (base.length) {
      // A watchlist fallback inside the provider still counts as live data, but
      // we mark it DEGRADED if the catalyst indicates the fallback path was used.
      const usedFallback = base.some(s => /watchlist/i.test(s.catalyst))
      const enriched: MarketSnapshot[] = []
      for (const s of base) enriched.push(await enrichWithIntraday(s))
      return {
        movers: enriched, is_demo: false, source,
        status: usedFallback ? 'DEGRADED' : 'LIVE',
        error: usedFallback ? `${provider} top-movers endpoint unavailable; using liquid watchlist` : null,
        provider_requested: requested,
      }
    }
    error = `Live data for ${provider} returned no results`
  } catch (e: any) {
    // Surface the specific provider + status, e.g. "Live data failed for Polygon: 403"
    const niceProvider = provider.charAt(0).toUpperCase() + provider.slice(1)
    error = `Live data failed for ${niceProvider}: ${e.message?.replace(/^.*?(\d{3}).*$/, '$1') || e.message}`
    console.error(error, e)
  }

  return {
    movers: demoSnapshots(), is_demo: true, source: 'demo', status: 'DEMO',
    error: error || 'Live market data unavailable', provider_requested: requested,
  }
}

// ----------------------------------------------------------------------------
// Public: market context (SPY / QQQ)
// ----------------------------------------------------------------------------
export async function fetchMarketContext(): Promise<MarketContext> {
  const provider = activeProvider()
  const now = new Date().toISOString()

  async function indexChange(sym: string): Promise<number | null> {
    try {
      if (provider === 'finnhub') {
        const q = await finnhubQuote(sym, process.env.FINNHUB_API_KEY!)
        return q.pc > 0 ? (q.c - q.pc) / q.pc * 100 : null
      }
      if (provider === 'twelvedata') {
        const r = await fetch(`https://api.twelvedata.com/quote?symbol=${sym}&apikey=${process.env.TWELVEDATA_API_KEY}`)
        const q = await r.json()
        const price = parseFloat(q.close), pc = parseFloat(q.previous_close)
        return pc > 0 ? (price - pc) / pc * 100 : null
      }
      if (provider === 'polygon') {
        const r = await fetch(`https://api.polygon.io/v2/aggs/ticker/${sym}/prev?apiKey=${process.env.POLYGON_API_KEY}`)
        const d = await r.json()
        const res = d.results?.[0]
        return res && res.o ? (res.c - res.o) / res.o * 100 : null
      }
    } catch { /* fall through */ }
    return null
  }

  if (provider === 'none') {
    // Deterministic demo context — clearly flat/neutral, never a fake signal.
    return {
      spy_trend: 'FLAT', qqq_trend: 'FLAT',
      spy_change_pct: 0, qqq_change_pct: 0,
      market_open: false, session: 'CLOSED',
      data_source: 'demo', is_demo: true, fetched_at: now,
    }
  }

  const spy = (await indexChange('SPY')) ?? 0
  const qqq = (await indexChange('QQQ')) ?? 0
  return {
    spy_trend: trendFromPct(spy),
    qqq_trend: trendFromPct(qqq),
    spy_change_pct: spy, qqq_change_pct: qqq,
    market_open: true, session: 'REGULAR',
    data_source: provider, is_demo: false, fetched_at: now,
  }
}

// ----------------------------------------------------------------------------
// Public: latest price for a single symbol (for trade price updates)
// ----------------------------------------------------------------------------
export async function fetchLatestPrice(symbol: string): Promise<{ price: number; is_demo: boolean } | null> {
  const provider = activeProvider()
  try {
    if (provider === 'finnhub') {
      const q = await finnhubQuote(symbol, process.env.FINNHUB_API_KEY!)
      return q?.c ? { price: q.c, is_demo: false } : null
    }
    if (provider === 'twelvedata') {
      const r = await fetch(`https://api.twelvedata.com/price?symbol=${symbol}&apikey=${process.env.TWELVEDATA_API_KEY}`)
      const d = await r.json()
      return d?.price ? { price: parseFloat(d.price), is_demo: false } : null
    }
    if (provider === 'polygon') {
      const r = await fetch(`https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?apiKey=${process.env.POLYGON_API_KEY}`)
      const d = await r.json()
      const res = d.results?.[0]
      return res?.c ? { price: res.c, is_demo: false } : null
    }
  } catch (e) {
    console.error('fetchLatestPrice failed:', e)
  }
  // Demo: return the fixed snapshot price if known
  const demo = DEMO_UNIVERSE.find(d => d.ticker === symbol)
  return demo ? { price: demo.price, is_demo: true } : null
}

export { demoSnapshots }
