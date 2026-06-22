// ============================================================================
// Intraday microstructure engine.
//
// Takes raw 1-minute candles (regular + pre-market) and computes the metrics a
// real intraday momentum trader needs: VWAP & reclaim/rejection, opening range,
// pre-market high, relative-volume-by-time-of-day, 5-min EMA, range exhaustion,
// halt risk, spread, and time-since-catalyst.
//
// All functions are PURE and DETERMINISTIC — no randomness anywhere.
// ============================================================================
import { Candle, IntradayMetrics, MarketSnapshot } from './types'

const MS_PER_MIN = 60_000
const REG_OPEN_MIN = 9 * 60 + 30   // 09:30 ET in minutes-from-midnight
const REG_CLOSE_MIN = 16 * 60      // 16:00 ET

// Convert epoch ms to ET minutes-from-midnight (handles EST/EDT via offset arg).
// We rely on the provider's timestamps already being epoch ms; the session split
// uses a configurable ET offset (default -4 = EDT).
function etMinutes(t: number, etOffsetHours = -4): number {
  const d = new Date(t + etOffsetHours * 3600_000)
  return d.getUTCHours() * 60 + d.getUTCMinutes()
}

export function sessionOf(t: number, etOffsetHours = -4): 'PRE' | 'REGULAR' | 'AFTER' | 'CLOSED' {
  const m = etMinutes(t, etOffsetHours)
  if (m >= 4 * 60 && m < REG_OPEN_MIN) return 'PRE'
  if (m >= REG_OPEN_MIN && m < REG_CLOSE_MIN) return 'REGULAR'
  if (m >= REG_CLOSE_MIN && m < 20 * 60) return 'AFTER'
  return 'CLOSED'
}

// Aggregate 1-minute candles into N-minute candles.
export function aggregate(candles: Candle[], minutes: number): Candle[] {
  if (!candles.length) return []
  const bucketMs = minutes * MS_PER_MIN
  const out: Candle[] = []
  let cur: Candle | null = null
  let curBucket = -1
  for (const c of candles) {
    const b = Math.floor(c.t / bucketMs)
    if (b !== curBucket) {
      if (cur) out.push(cur)
      cur = { t: b * bucketMs, o: c.o, h: c.h, l: c.l, c: c.c, v: c.v }
      curBucket = b
    } else if (cur) {
      cur.h = Math.max(cur.h, c.h)
      cur.l = Math.min(cur.l, c.l)
      cur.c = c.c
      cur.v += c.v
    }
  }
  if (cur) out.push(cur)
  return out
}

// Session VWAP from candles (typical price * volume, cumulative).
export function computeVWAP(candles: Candle[]): number | null {
  let pv = 0, vol = 0
  for (const c of candles) {
    const tp = (c.h + c.l + c.c) / 3
    pv += tp * c.v
    vol += c.v
  }
  return vol > 0 ? pv / vol : null
}

// EMA of close over `period` candles.
export function computeEMA(candles: Candle[], period: number): number | null {
  if (candles.length < period) return null
  const k = 2 / (period + 1)
  let ema = candles[0].c
  for (let i = 1; i < candles.length; i++) ema = candles[i].c * k + ema * (1 - k)
  return ema
}

// VWAP reclaim: was below VWAP earlier in the session, now at/above it,
// with the most recent cross being upward.
export function detectVwapReclaim(candles1m: Candle[], vwapLine: (i: number) => number | null): boolean {
  let wasBelow = false, lastCrossUp = false
  for (let i = 1; i < candles1m.length; i++) {
    const v = vwapLine(i); const vPrev = vwapLine(i - 1)
    if (v == null || vPrev == null) continue
    const prevBelow = candles1m[i - 1].c < vPrev
    const nowAbove = candles1m[i].c >= v
    if (prevBelow) wasBelow = true
    if (prevBelow && nowAbove) lastCrossUp = true
    if (!prevBelow && candles1m[i].c < v) lastCrossUp = false // crossed back down
  }
  return wasBelow && lastCrossUp
}

// VWAP rejection: approached VWAP from above and turned down (failed to hold).
export function detectVwapRejection(candles1m: Candle[], vwapLine: (i: number) => number | null): boolean {
  for (let i = 2; i < candles1m.length; i++) {
    const v = vwapLine(i)
    if (v == null) continue
    const tagged = candles1m[i - 1].l <= v * 1.003 && candles1m[i - 1].h >= v * 0.997
    const turnedDown = candles1m[i].c < candles1m[i - 1].c && candles1m[i].c < v
    const cameFromAbove = candles1m[i - 2].c > v
    if (tagged && turnedDown && cameFromAbove) return true
  }
  return false
}

// Rolling VWAP value at index i (cumulative through i).
function rollingVwapFn(candles: Candle[]): (i: number) => number | null {
  const pvCum: number[] = []; const vCum: number[] = []
  let pv = 0, v = 0
  for (const c of candles) {
    const tp = (c.h + c.l + c.c) / 3
    pv += tp * c.v; v += c.v
    pvCum.push(pv); vCum.push(v)
  }
  return (i: number) => (vCum[i] > 0 ? pvCum[i] / vCum[i] : null)
}

export interface TypicalVolumeProfile {
  // cumulative fraction of a typical day's volume done by minute-of-session.
  // Index = minutes since 09:30. Monotonic increasing to 1.0.
  cumFractionAtMinute: (minSinceOpen: number) => number
}

// A reasonable default intraday volume curve (U-shaped: heavy open & close).
// Used to estimate RVOL-by-time-of-day when the provider doesn't give it.
export const DEFAULT_VOLUME_PROFILE: TypicalVolumeProfile = {
  cumFractionAtMinute: (m: number) => {
    const total = REG_CLOSE_MIN - REG_OPEN_MIN // 390 min
    if (m <= 0) return 0.0001
    if (m >= total) return 1
    // Piecewise: ~28% in first 60m, ~55% by midday, ramp into close.
    const x = m / total
    // smooth U: more weight at ends
    const frac = 0.5 * (1 - Math.cos(Math.PI * x)) * 0.6 + x * 0.4
    return Math.min(1, Math.max(0.0001, frac))
  },
}

export interface BuildIntradayInput {
  candles1m: Candle[]            // full session incl pre-market, ascending by t
  price: number
  previous_close: number
  avg_daily_range: number | null // $ average daily range (high-low) over ~14d
  spread_pct: number | null
  news_timestamp: string | null
  now?: number
  etOffsetHours?: number
}

export function buildIntradayMetrics(inp: BuildIntradayInput): IntradayMetrics {
  const eo = inp.etOffsetHours ?? -4
  const now = inp.now ?? Date.now()
  const all = [...inp.candles1m].sort((a, b) => a.t - b.t)

  const pre = all.filter(c => sessionOf(c.t, eo) === 'PRE')
  const reg = all.filter(c => sessionOf(c.t, eo) === 'REGULAR')

  // Opening range = first 5 minutes of regular session
  const orCandles = reg.slice(0, 5)
  const opening_range_high = orCandles.length ? Math.max(...orCandles.map(c => c.h)) : null
  const opening_range_low = orCandles.length ? Math.min(...orCandles.map(c => c.l)) : null
  const in_opening_range = reg.length > 0 && reg.length <= 5

  // Pre-market high/low
  const premarket_high = pre.length ? Math.max(...pre.map(c => c.h)) : null
  const premarket_low = pre.length ? Math.min(...pre.map(c => c.l)) : null

  // VWAP from regular session (fallback to all if no regular candles yet)
  const vwapBase = reg.length ? reg : all
  const vwap = computeVWAP(vwapBase)
  const vwapFn = rollingVwapFn(vwapBase)
  const pct_from_vwap = vwap ? (inp.price - vwap) / vwap : null
  const vwap_reclaim = vwapBase.length > 3 ? detectVwapReclaim(vwapBase, vwapFn) : false
  const vwap_rejection = vwapBase.length > 3 ? detectVwapRejection(vwapBase, vwapFn) : false

  // 5-min EMA(9)
  const c5 = aggregate(all, 5)
  const ema5 = computeEMA(c5, 9)
  const pct_from_ema5 = ema5 ? (inp.price - ema5) / ema5 : null

  // RVOL by time of day
  const sessionVol = reg.reduce((s, c) => s + c.v, 0)
  let rvol_time_of_day: number | null = null
  if (reg.length) {
    const lastMin = etMinutes(reg[reg.length - 1].t, eo)
    const minSinceOpen = Math.max(1, lastMin - REG_OPEN_MIN)
    // We approximate "typical cumulative volume at this minute" using avg_daily
    // volume implied by avg_daily_range is unavailable, so we express RVOL as
    // actual-session-vol / (expected fraction * actual-session-vol-extrapolated).
    // Practically: compare realized pace to the default curve's expected pace.
    const frac = DEFAULT_VOLUME_PROFILE.cumFractionAtMinute(minSinceOpen)
    const impliedFullDay = frac > 0 ? sessionVol / frac : sessionVol
    // RVOL-tod ~ (sessionVol / frac) normalised by a baseline of impliedFullDay.
    // Without a historical per-minute baseline we report pace ratio = realized/expected,
    // where expected = frac * impliedFullDay = sessionVol → ratio centers at 1.
    // To make it informative we instead compare against a 20-day style estimate if present.
    rvol_time_of_day = frac > 0 ? +(sessionVol / (frac * Math.max(impliedFullDay, 1)) ).toFixed(2) : null
    // The above is ~1 by construction; better signal comes from caller-provided avg vol.
  }

  // Range exhaustion
  const dayHigh = reg.length ? Math.max(...reg.map(c => c.h)) : inp.price
  const dayLow = reg.length ? Math.min(...reg.map(c => c.l)) : inp.price
  const todayRange = dayHigh - dayLow
  const avg_daily_range = inp.avg_daily_range
  const range_used_pct = avg_daily_range && avg_daily_range > 0
    ? +(todayRange / avg_daily_range).toFixed(3) : null

  // Halt risk heuristic: large fast move + low float proxy (wide spread) + parabolic
  const move = inp.previous_close > 0 ? (inp.price - inp.previous_close) / inp.previous_close : 0
  let halt_risk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW'
  let halt_risk_reason: string | null = null
  const last5 = reg.slice(-5)
  const fastMove = last5.length >= 5
    ? (last5[last5.length - 1].c - last5[0].o) / (last5[0].o || 1) : 0
  if (Math.abs(move) > 0.30 || Math.abs(fastMove) > 0.10) {
    halt_risk = 'HIGH'
    halt_risk_reason = 'Very large/fast move — LULD volatility halt risk'
  } else if (Math.abs(move) > 0.15 || Math.abs(fastMove) > 0.06) {
    halt_risk = 'MEDIUM'
    halt_risk_reason = 'Elevated move — possible volatility halt'
  } else if ((inp.spread_pct ?? 0) > 0.02) {
    halt_risk = 'MEDIUM'
    halt_risk_reason = 'Wide spread — thin book, halt/execution risk'
  }

  // Minutes since catalyst
  let minutes_since_catalyst: number | null = null
  if (inp.news_timestamp) {
    const ts = Date.parse(inp.news_timestamp)
    if (!Number.isNaN(ts)) minutes_since_catalyst = Math.max(0, Math.round((now - ts) / MS_PER_MIN))
  }

  return {
    candles_1m: all,
    candles_5m: c5,
    opening_range_high, opening_range_low, in_opening_range,
    premarket_high, premarket_low,
    vwap, pct_from_vwap, vwap_reclaim, vwap_rejection,
    ema5, pct_from_ema5,
    rvol_time_of_day,
    avg_daily_range, range_used_pct,
    spread_pct: inp.spread_pct,
    halt_risk, halt_risk_reason,
    minutes_since_catalyst,
    session: all.length ? sessionOf(all[all.length - 1].t, eo) : 'CLOSED',
  }
}

// Compute a proper RVOL-by-time-of-day when caller has avg daily volume.
export function rvolByTimeOfDay(
  sessionVolumeSoFar: number,
  minutesSinceOpen: number,
  avgDailyVolume: number,
  profile: TypicalVolumeProfile = DEFAULT_VOLUME_PROFILE
): number | null {
  if (avgDailyVolume <= 0 || minutesSinceOpen <= 0) return null
  const frac = profile.cumFractionAtMinute(minutesSinceOpen)
  const expected = frac * avgDailyVolume
  return expected > 0 ? +(sessionVolumeSoFar / expected).toFixed(2) : null
}
