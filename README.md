# AI Momentum Trading Lab

A serious, AI-assisted **short-term momentum paper-trading research system**. Its purpose is not to look like a trading dashboard — it is to *prove, through paper-trading data, whether a 3-model AI committee has real edge* in intraday/multi-day momentum, net of realistic costs.

> **Paper trading only.** No real orders, no brokerage integration, no real money. Not financial advice.

---

## What it does

1. Pulls **real market data** (Polygon / Finnhub / Twelve Data) for the day's movers plus SPY/QQQ context, with **dynamic discovery** of movers (not a fixed watchlist).
2. Enriches every candidate with **true intraday microstructure** from 1-minute candles: VWAP + reclaim/rejection, opening range, pre-market high/low, RVOL-by-time-of-day, 5-min EMA(9), avg-daily-range exhaustion, halt risk, spread, and minutes-since-catalyst.
3. Runs a **3-AI committee** on each candidate (models configurable via env):
   - **Gemini** — Market Scanner
   - **GPT-4o** — Momentum Analyst
   - **Claude** — Risk Officer (default stance: *reject*)
4. Classifies into a **playbook**, including intraday setups: opening range breakout, VWAP reclaim, VWAP rejection, gap-and-go, pre-market high break, news spike continuation, failed breakout, parabolic exhaustion.
5. Applies a **strict rule engine** with explicit **"do not chase"** logic (rejects when price is too far above VWAP or the 5-min EMA, or has already used >70% of its average daily range, or has high halt risk).
6. Opens **paper trades with realistic frictions** under **risk controls**.
7. **Tracks every BUY / WATCH / REJECT** over 1/2/3/5 days and benchmarks committee BUYs against **buying the top 5 gainers at scan time**.
8. Produces a **strategy validation report** gated by hard evidence requirements.

### Configurable model names
`GEMINI_MODEL`, `OPENAI_MODEL`, `ANTHROPIC_MODEL` override the defaults without code changes.

### "Minimum evidence before real money" gate
The verdict can only become *ready* when **all** of these hold on non-demo trades:
100+ closed trades · positive expectancy after costs · profit factor > 1.3 · max drawdown < 10% · beats the top-5-gainers baseline. Otherwise it shows **Not ready for real money**.

---

## Demo mode is safe by design

With **no market-data key set**, the app runs in **DEMO MODE**:
- All data is **fixed, deterministic, clearly-labelled synthetic** (`DEMO-A` … `DEMO-E`). There is **no randomness anywhere** in the system.
- The committee will **never issue a BUY** and **never opens trades** from demo data.
- Every demo output is stamped `is_demo` and visibly marked in the UI.

This makes the plumbing fully testable without ever producing a fake "confident" signal.

---

## Architecture

```
pages/api/
  fetch-market-movers.ts   → movers + SPY/QQQ context (via lib/marketData)
  run-ai-committee.ts      → SSE orchestrator; rules + audit logging
  run-gemini-scanner.ts    → Gemini (scanner)   + audit entry
  run-gpt-analysis.ts      → GPT-4o (analyst)    + audit entry
  run-claude-review.ts     → Claude (risk)       + audit entry
  create-paper-trade.ts    → realism + risk gating (server-enforced)
  update-trade-prices.ts   → real prices → step trades through realism engine

lib/
  types.ts        → full type system (snapshots, playbooks, outcomes, realism)
  marketData.ts   → Polygon / Finnhub / Twelve Data + dynamic discovery + demo
  intraday.ts     → 1m/5m candles, VWAP reclaim/rejection, opening range, RVOL-by-ToD, EMA, ADR, halt risk
  aiPrompts.ts    → expert short-term-trader prompts + deterministic demo outputs
  tradeRules.ts   → strict hard-rule engine + playbook classifier + sizing/grading
  tradeEngine.ts  → slippage/spread/fees, partial TP, trailing stop, time exit, gating
  metrics.ts      → expectancy (R), profit factor, drawdown, fees/slippage totals
  validation.ts   → edge analysis vs benchmarks; "ready for real money?" verdict
```

### Hard rejection rules (a BUY must clear *all* of them)
Reward/risk ≥ 2:1 · confidence ≥ 70 · momentum ≥ 50 · liquidity ≥ 50 · catalyst clear **and fresh** · RVOL ≥ 1.5× · spread ≤ 1% · not > 7% extended above VWAP · stop ≤ 8% and below entry · a clear (non-negative) playbook detected · market not in a down-trend conflict · models not in major disagreement · pipeline did not fail.

---

## Environment & security

**All AI and market-data keys are server-side only.** They are read exclusively inside `pages/api/*` and `lib/marketData.ts`, and are verified absent from the client bundle. Only `NEXT_PUBLIC_*` vars (app URL, Supabase anon key) reach the browser.

Copy `.env.example` → `.env.local` and set **one** market-data provider and any AI keys you want:

```
POLYGON_API_KEY=        # or FINNHUB_API_KEY / TWELVEDATA_API_KEY
GEMINI_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

Any missing AI key falls back to that model's deterministic demo stand-in (never a confident BUY). Missing all market-data keys → full demo mode.

---

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in keys (optional; demo works with none)
npm run dev                  # http://localhost:3000
npm run build                # production build (type-checked, lint-clean)
```

## Deploy to Vercel

1. Push to GitHub and import the repo at vercel.com (framework auto-detected as Next.js).
2. In **Project → Settings → Environment Variables**, add your keys (server-side ones without the `NEXT_PUBLIC_` prefix stay private).
3. Set `NEXT_PUBLIC_APP_URL` to your production URL (used for internal server-to-server calls).
4. Deploy.

## Optional: Supabase persistence

Run `sql/schema.sql` in the Supabase SQL editor. It creates tables for candidates, analyses, paper trades, **decision outcomes**, **model audit logs**, and performance snapshots, all with row-level security. Without Supabase, the app persists locally in the browser.

---

## How to actually judge edge

Open the **Validation** tab. It answers, from your own paper-trading data:
- Profitable after slippage & fees? · Beats random top-gainer buying? · Beats QQQ/SPY? ·
- Best playbook · most accurate committee call · best confidence band · **ready for real money?**

Until you have 100+ real closed trades with positive net expectancy, it will say **not ready** — by design.
