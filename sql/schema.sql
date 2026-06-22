-- AI Momentum Trading Lab — Supabase Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  virtual_balance DECIMAL DEFAULT 100000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Market candidates
CREATE TABLE IF NOT EXISTS public.market_candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  ticker TEXT NOT NULL,
  company TEXT,
  price DECIMAL,
  change_pct DECIMAL,
  volume BIGINT,
  avg_volume BIGINT,
  volume_ratio DECIMAL,
  sector TEXT,
  market_cap BIGINT,
  catalyst TEXT,
  ai_status TEXT DEFAULT 'PENDING',
  source TEXT DEFAULT 'demo',
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI analyses
CREATE TABLE IF NOT EXISTS public.ai_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  ticker TEXT NOT NULL,
  company TEXT,
  decision TEXT CHECK (decision IN ('BUY', 'WATCH', 'REJECT')),
  momentum_score INTEGER,
  catalyst_score INTEGER,
  liquidity_score INTEGER,
  risk_score INTEGER,
  confidence_score INTEGER,
  continuation_probability INTEGER,
  entry_price DECIMAL,
  stop_loss DECIMAL,
  take_profit_1 DECIMAL,
  take_profit_2 DECIMAL,
  risk_reward_ratio DECIMAL,
  max_holding_period TEXT,
  bull_case TEXT,
  bear_case TEXT,
  key_risks JSONB DEFAULT '[]',
  rejection_reason TEXT,
  reasoning TEXT,
  final_notes TEXT,
  gemini_output JSONB,
  gpt_output JSONB,
  claude_output JSONB,
  failed BOOLEAN DEFAULT FALSE,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Paper trades
CREATE TABLE IF NOT EXISTS public.paper_trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  ticker TEXT NOT NULL,
  company TEXT,
  entry_date TIMESTAMPTZ DEFAULT NOW(),
  entry_price DECIMAL NOT NULL,
  position_size INTEGER,
  virtual_amount DECIMAL,
  stop_loss DECIMAL,
  take_profit_1 DECIMAL,
  take_profit_2 DECIMAL,
  latest_price DECIMAL,
  exit_date TIMESTAMPTZ,
  exit_price DECIMAL,
  exit_reason TEXT CHECK (exit_reason IN ('TARGET_HIT', 'STOP_LOSS_HIT', 'MANUAL_EXIT', 'TIME_EXIT', 'AI_REVERSAL')),
  pnl DECIMAL,
  return_pct DECIMAL,
  holding_hours DECIMAL,
  status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  max_holding_period TEXT,
  grade TEXT CHECK (grade IN ('A+', 'A', 'B', 'C', 'D', 'F')),
  notes TEXT,
  lesson_learned TEXT,
  analysis_id UUID REFERENCES public.ai_analyses(id),
  analysis_data JSONB,
  day1_price DECIMAL,
  day2_price DECIMAL,
  day3_price DECIMAL,
  day5_price DECIMAL,
  day1_return DECIMAL,
  day2_return DECIMAL,
  day3_return DECIMAL,
  day5_return DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price updates log
CREATE TABLE IF NOT EXISTS public.price_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_id UUID REFERENCES public.paper_trades(id),
  ticker TEXT NOT NULL,
  price DECIMAL NOT NULL,
  change_pct DECIMAL,
  unrealized_pnl DECIMAL,
  unrealized_pct DECIMAL,
  stop_hit BOOLEAN DEFAULT FALSE,
  target_hit BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance metrics snapshots
CREATE TABLE IF NOT EXISTS public.performance_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  virtual_balance DECIMAL,
  total_pnl DECIMAL,
  daily_pnl DECIMAL,
  weekly_pnl DECIMAL,
  monthly_pnl DECIMAL,
  win_rate DECIMAL,
  profit_factor DECIMAL,
  max_drawdown DECIMAL,
  total_trades INTEGER,
  open_trades INTEGER,
  closed_trades INTEGER,
  snapshotted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only see their own data)
CREATE POLICY "Users see own profile" ON public.user_profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users see own candidates" ON public.market_candidates FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own analyses" ON public.ai_analyses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own trades" ON public.paper_trades FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own updates" ON public.price_updates FOR ALL USING (
  trade_id IN (SELECT id FROM public.paper_trades WHERE user_id = auth.uid())
);
CREATE POLICY "Users see own snapshots" ON public.performance_snapshots FOR ALL USING (auth.uid() = user_id);

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_paper_trades_user_status ON public.paper_trades(user_id, status);
CREATE INDEX IF NOT EXISTS idx_paper_trades_ticker ON public.paper_trades(ticker);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_ticker ON public.ai_analyses(ticker);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_decision ON public.ai_analyses(decision);
CREATE INDEX IF NOT EXISTS idx_market_candidates_session ON public.market_candidates(session_id);

-- ============================================================================
-- v2 UPGRADE: playbooks, realism costs, outcome tracking, audit logs
-- ============================================================================

-- Outcome tracking: forward returns for EVERY committee decision (BUY/WATCH/REJECT)
-- so the committee's accuracy can be judged over 1/2/3/5 days.
CREATE TABLE IF NOT EXISTS public.decision_outcomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  ticker TEXT NOT NULL,
  company TEXT,
  decision TEXT CHECK (decision IN ('BUY', 'WATCH', 'REJECT')),
  playbook TEXT,
  confidence_score INTEGER,
  entry_reference_price DECIMAL,
  decided_at TIMESTAMPTZ DEFAULT NOW(),
  day1_price DECIMAL, day2_price DECIMAL, day3_price DECIMAL, day5_price DECIMAL,
  day1_return DECIMAL, day2_return DECIMAL, day3_return DECIMAL, day5_return DECIMAL,
  verdict_resolved BOOLEAN DEFAULT FALSE,
  is_demo BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Model audit log: every AI input/output for full traceability.
CREATE TABLE IF NOT EXISTS public.model_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  analysis_ticker TEXT,
  model TEXT CHECK (model IN ('gemini', 'gpt', 'claude')),
  role TEXT,
  model_name TEXT,
  system_prompt TEXT,
  user_prompt TEXT,
  raw_response TEXT,
  parsed_ok BOOLEAN,
  parse_error TEXT,
  retries INTEGER DEFAULT 0,
  latency_ms INTEGER,
  is_demo BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extend ai_analyses with playbook + freshness + demo flag
ALTER TABLE public.ai_analyses ADD COLUMN IF NOT EXISTS playbook TEXT;
ALTER TABLE public.ai_analyses ADD COLUMN IF NOT EXISTS catalyst_freshness_score INTEGER;
ALTER TABLE public.ai_analyses ADD COLUMN IF NOT EXISTS realistic_upside_pct DECIMAL;
ALTER TABLE public.ai_analyses ADD COLUMN IF NOT EXISTS red_flags JSONB DEFAULT '[]';
ALTER TABLE public.ai_analyses ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;

-- Extend market_candidates with the rich snapshot fields
ALTER TABLE public.market_candidates ADD COLUMN IF NOT EXISTS previous_close DECIMAL;
ALTER TABLE public.market_candidates ADD COLUMN IF NOT EXISTS day_high DECIMAL;
ALTER TABLE public.market_candidates ADD COLUMN IF NOT EXISTS day_low DECIMAL;
ALTER TABLE public.market_candidates ADD COLUMN IF NOT EXISTS vwap DECIMAL;
ALTER TABLE public.market_candidates ADD COLUMN IF NOT EXISTS premarket_change_pct DECIMAL;
ALTER TABLE public.market_candidates ADD COLUMN IF NOT EXISTS relative_volume DECIMAL;
ALTER TABLE public.market_candidates ADD COLUMN IF NOT EXISTS bid DECIMAL;
ALTER TABLE public.market_candidates ADD COLUMN IF NOT EXISTS ask DECIMAL;
ALTER TABLE public.market_candidates ADD COLUMN IF NOT EXISTS spread_pct DECIMAL;
ALTER TABLE public.market_candidates ADD COLUMN IF NOT EXISTS float_shares BIGINT;
ALTER TABLE public.market_candidates ADD COLUMN IF NOT EXISTS catalyst_source_url TEXT;
ALTER TABLE public.market_candidates ADD COLUMN IF NOT EXISTS news_timestamp TIMESTAMPTZ;
ALTER TABLE public.market_candidates ADD COLUMN IF NOT EXISTS sector_performance_pct DECIMAL;
ALTER TABLE public.market_candidates ADD COLUMN IF NOT EXISTS playbook TEXT;
ALTER TABLE public.market_candidates ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;

-- Extend paper_trades with realism + playbook fields
ALTER TABLE public.paper_trades ADD COLUMN IF NOT EXISTS playbook TEXT;
ALTER TABLE public.paper_trades ADD COLUMN IF NOT EXISTS intended_entry DECIMAL;
ALTER TABLE public.paper_trades ADD COLUMN IF NOT EXISTS slippage_cost DECIMAL DEFAULT 0;
ALTER TABLE public.paper_trades ADD COLUMN IF NOT EXISTS spread_cost DECIMAL DEFAULT 0;
ALTER TABLE public.paper_trades ADD COLUMN IF NOT EXISTS fees DECIMAL DEFAULT 0;
ALTER TABLE public.paper_trades ADD COLUMN IF NOT EXISTS gross_pnl DECIMAL;
ALTER TABLE public.paper_trades ADD COLUMN IF NOT EXISTS initial_stop_loss DECIMAL;
ALTER TABLE public.paper_trades ADD COLUMN IF NOT EXISTS trailing_stop DECIMAL;
ALTER TABLE public.paper_trades ADD COLUMN IF NOT EXISTS tp1_filled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.paper_trades ADD COLUMN IF NOT EXISTS tp1_exit_price DECIMAL;
ALTER TABLE public.paper_trades ADD COLUMN IF NOT EXISTS tp1_shares INTEGER;
ALTER TABLE public.paper_trades ADD COLUMN IF NOT EXISTS confidence_score INTEGER;
ALTER TABLE public.paper_trades ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;

-- Allow the richer exit-reason set
ALTER TABLE public.paper_trades DROP CONSTRAINT IF EXISTS paper_trades_exit_reason_check;
ALTER TABLE public.paper_trades ADD CONSTRAINT paper_trades_exit_reason_check
  CHECK (exit_reason IN ('TARGET_HIT','TP1_PARTIAL','STOP_LOSS_HIT','TRAILING_STOP_HIT','MANUAL_EXIT','TIME_EXIT','AI_REVERSAL','MAX_DAILY_LOSS'));

-- RLS for new tables
ALTER TABLE public.decision_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own outcomes" ON public.decision_outcomes;
CREATE POLICY "Users see own outcomes" ON public.decision_outcomes FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users see own audit logs" ON public.model_audit_logs;
CREATE POLICY "Users see own audit logs" ON public.model_audit_logs FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_outcomes_decision ON public.decision_outcomes(decision);
CREATE INDEX IF NOT EXISTS idx_outcomes_playbook ON public.decision_outcomes(playbook);
CREATE INDEX IF NOT EXISTS idx_audit_ticker ON public.model_audit_logs(analysis_ticker);
CREATE INDEX IF NOT EXISTS idx_trades_playbook ON public.paper_trades(playbook);

-- ============================================================================
-- v3 UPGRADE: intraday microstructure, configurable models, benchmark fields
-- ============================================================================

-- Intraday metrics captured at scan time (JSON blob keeps schema flexible).
ALTER TABLE public.market_candidates ADD COLUMN IF NOT EXISTS intraday JSONB;
ALTER TABLE public.market_candidates ADD COLUMN IF NOT EXISTS opening_range_high DECIMAL;
ALTER TABLE public.market_candidates ADD COLUMN IF NOT EXISTS opening_range_low DECIMAL;
ALTER TABLE public.market_candidates ADD COLUMN IF NOT EXISTS premarket_high DECIMAL;
ALTER TABLE public.market_candidates ADD COLUMN IF NOT EXISTS halt_risk TEXT;
ALTER TABLE public.market_candidates ADD COLUMN IF NOT EXISTS minutes_since_catalyst INTEGER;

-- Benchmark support on outcomes (#6): top-5-gainer flag + % change at scan time.
ALTER TABLE public.decision_outcomes ADD COLUMN IF NOT EXISTS change_pct_at_scan DECIMAL;
ALTER TABLE public.decision_outcomes ADD COLUMN IF NOT EXISTS is_top5_gainer BOOLEAN DEFAULT FALSE;

-- Record which model name produced each audit entry (configurable via env).
ALTER TABLE public.model_audit_logs ADD COLUMN IF NOT EXISTS configured_model TEXT;

CREATE INDEX IF NOT EXISTS idx_outcomes_top5 ON public.decision_outcomes(is_top5_gainer);
