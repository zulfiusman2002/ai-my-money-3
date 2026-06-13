// netlify/functions/_lib/core.mjs
// Shared backend utilities + the Connected Wealth Intelligence context builder.
// ANTHROPIC_API_KEY and the service role key exist ONLY here.

import { createClient } from '@supabase/supabase-js';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

export function admin() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

export async function requireUser(event) {
  const token = (event.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) throw httpError(401, 'Missing auth token');
  const db = admin();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) throw httpError(401, 'Invalid or expired session');
  return { user: data.user, db };
}

export function httpError(status, message) { const e = new Error(message); e.status = status; return e; }
export function json(status, body) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
export function handler(fn) {
  return async (event) => {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204 };
    if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });
    try { return await fn(event); }
    catch (e) { console.error(e); return json(e.status || 500, { error: e.message || 'Server error' }); }
  };
}

export async function callClaude({ system, messages, maxTokens = 2000 }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw httpError(502, `AI service error (${res.status}): ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
}

export function parseClaudeJson(text) {
  const cleaned = text.replace(/```json|```/g, '').trim();
  const a = cleaned.indexOf('{'); const b = cleaned.lastIndexOf('}');
  const a2 = cleaned.indexOf('['); const b2 = cleaned.lastIndexOf(']');
  // support top-level object or array
  let slice;
  if (a !== -1 && (a2 === -1 || a < a2)) slice = cleaned.slice(a, b + 1);
  else if (a2 !== -1) slice = cleaned.slice(a2, b2 + 1);
  else throw httpError(502, 'AI returned non-JSON output');
  return JSON.parse(slice);
}

export const DISCLAIMER =
  'This is educational guidance based on your data, not regulated financial advice. ' +
  'Please consult a qualified financial advisor before making investment decisions.';

export const ADVISOR_SYSTEM = `You are the AI Advisor inside "AI My Money", a connected wealth operating system.
Rules you must always follow:
- Base every number on the FINANCIAL INTELLIGENCE CONTEXT provided. Never invent values.
- If data needed for an answer is missing, say: "I don't have enough data for that yet. Please update your portfolio or budget first."
- Never give regulated financial advice. Never say "buy X" or "sell X" as a directive. Use "consider", "review", "watch".
- NEVER invent analyst ratings, price targets, or consensus views (e.g. "strong buy", "hold", "sell"). You have no market data feed. If asked for analyst consensus, say it is unavailable in this app unless it appears in the user's own uploaded screenshot data.
- Acknowledge uncertainty. If the context flags stale snapshots, warn the user. You do not have live market prices — say so when relevant.
- Think cross-module: connect budget behaviour to goals, portfolio risk to learning, net worth to projections. The user values seeing how one area affects another.
- Be specific, use the user's actual numbers and base currency, and be warm but direct.
- End every response with this exact line: "${DISCLAIMER}"`;

// ============================================================
// INTELLIGENCE COMPUTATION — deterministic, shared by context
// builder, monthly snapshot sync, insights and learning triggers
// ============================================================

const monthStr = (d = new Date()) => d.toISOString().slice(0, 7);
const prevMonthStr = () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return monthStr(d); };
const LIQUID = new Set(['cash', 'gold']);
const SEMI = new Set(['etf', 'uk_stocks', 'us_stocks', 'indian_stocks', 'mutual_funds', 'crypto', 'bonds']);

export async function computeIntelligence(db, userId) {
  const month = monthStr();
  const [profile, incomeRec, incomeStd, expenses, savingsAlloc, goals, liabilities, snaps, assets, progress, streak, prevSnap, modules] =
    await Promise.all([
      db.from('user_profiles').select('*').eq('user_id', userId).maybeSingle(),
      db.from('income_records').select('*').eq('user_id', userId).eq('month', month),
      db.from('income_sources').select('*').eq('user_id', userId).eq('is_active', true),
      db.from('expenses').select('*').eq('user_id', userId).eq('month', month),
      db.from('savings_allocations').select('*').eq('user_id', userId).eq('month', month),
      db.from('goals').select('*').eq('user_id', userId).eq('status', 'active'),
      db.from('liabilities').select('*').eq('user_id', userId),
      db.from('investment_snapshots').select('*, investment_holdings(*)')
        .eq('user_id', userId).order('snapshot_date', { ascending: false }).limit(60),
      db.from('assets').select('*').eq('user_id', userId).eq('is_active', true),
      db.from('user_learning_progress').select('lesson_id, quiz_correct, xp_earned, completed_at').eq('user_id', userId),
      db.from('user_streaks').select('*').eq('user_id', userId).maybeSingle(),
      db.from('monthly_snapshots').select('*').eq('user_id', userId).eq('month', prevMonthStr()).maybeSingle(),
      db.from('learn_modules').select('id, title'),
    ]);

  // Month-aware income: this month's records win; standard income is the fallback.
  const income = { data: (incomeRec.data?.length ? incomeRec.data : incomeStd.data) || [] };
  const p = profile.data || {};
  const base = p.currency || 'GBP';
  const sym = { GBP: '£', USD: '$', EUR: '€', INR: '₹' }[base] || base + ' ';
  const f = (n) => `${sym}${Number(n || 0).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;

  // ---- budget behaviour ----
  const totalIncome = (income.data || []).reduce((a, i) => a + Number(i.amount || 0), 0);
  const exps = expenses.data || [];
  const byType = { fixed: 0, variable: 0, 'one-time': 0 };
  for (const e of exps) byType[e.type] = (byType[e.type] || 0) + Number(e.amount || 0);
  const totalExpenses = byType.fixed + byType.variable + byType['one-time'];
  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : null;
  const fixedRatio = totalIncome > 0 ? (byType.fixed / totalIncome) * 100 : null;
  const topExpenses = [...exps].sort((a, b) => b.amount - a.amount).slice(0, 5);

  // ---- portfolio: latest snapshot per asset_type, staleness ----
  const latest = {};
  for (const s of snaps.data || []) if (!latest[s.asset_type]) latest[s.asset_type] = s;
  const today = Date.now();
  const portfolio = Object.values(latest).map((s) => {
    const value = Number(s.converted_total ?? s.total_value ?? 0);
    const ageDays = Math.floor((today - new Date(s.snapshot_date)) / 86400000);
    return { type: s.asset_type, value, currency: s.currency, date: s.snapshot_date, ageDays,
      stale: ageDays > 45, holdings: s.investment_holdings || [] };
  }).filter((x) => x.value > 0 || x.holdings.length);
  const totalInvested = portfolio.reduce((a, x) => a + x.value, 0);
  const staleClasses = portfolio.filter((x) => x.stale);

  // concentration: largest single holding & largest asset class
  const allHoldings = portfolio.flatMap((x) => x.holdings.map((h) => ({
    ...h, klass: x.type, value: Number(h.converted_value ?? h.current_value ?? 0) })));
  const topHolding = [...allHoldings].sort((a, b) => b.value - a.value)[0] || null;
  const classMix = portfolio.map((x) => ({ type: x.type, pct: totalInvested > 0 ? (x.value / totalInvested) * 100 : 0 }))
    .sort((a, b) => b.pct - a.pct);
  const cryptoPct = classMix.find((c) => c.type === 'crypto')?.pct || 0;

  // ---- assets (non-broker) + liquidity ----
  const assetRows = assets.data || [];
  const totalAssets = assetRows.reduce((a, x) => a + Number(x.converted_value || 0), 0);
  let liquid = assetRows.filter((a) => a.liquidity === 'liquid').reduce((s, a) => s + Number(a.converted_value), 0);
  let semi = assetRows.filter((a) => a.liquidity === 'semi_liquid').reduce((s, a) => s + Number(a.converted_value), 0);
  for (const x of portfolio) {
    if (LIQUID.has(x.type)) liquid += x.value;
    else if (SEMI.has(x.type)) semi += x.value;
  }
  const illiquid = totalAssets + totalInvested - liquid - semi;
  const emergencyFund = assetRows.filter((a) => a.asset_class === 'cash').reduce((s, a) => s + Number(a.converted_value), 0)
    || (latest['cash'] ? Number(latest['cash'].converted_total ?? latest['cash'].total_value) : 0);
  const emergencyMonths = totalExpenses > 0 && emergencyFund > 0 ? emergencyFund / totalExpenses : null;

  // ---- liabilities + net worth ----
  const totalLiabilities = (liabilities.data || []).reduce((a, l) => a + Number(l.amount || 0), 0);
  const netWorth = totalInvested + totalAssets - totalLiabilities;

  // ---- goals trajectory ----
  const goalStates = (goals.data || []).map((g) => {
    const target = Number(g.target_amount), current = Number(g.current_amount), mc = Number(g.monthly_contribution || 0);
    const pct = target > 0 ? (current / target) * 100 : 0;
    let monthsNeeded = null, monthsAvailable = null, onTrack = null;
    if (mc > 0 && target > current) monthsNeeded = Math.ceil((target - current) / mc);
    if (g.target_date) monthsAvailable = Math.max(0, Math.round((new Date(g.target_date) - today) / 2629800000));
    if (monthsNeeded != null && monthsAvailable != null) onTrack = monthsNeeded <= monthsAvailable;
    return { id: g.id, name: g.goal_name, target, current, pct, monthly: mc, targetDate: g.target_date,
      monthsNeeded, monthsAvailable, onTrack };
  });
  const behindGoals = goalStates.filter((g) => g.onTrack === false);

  // ---- learning ----
  const lessonsDone = (progress.data || []).length;
  const quizAccuracy = lessonsDone
    ? Math.round(100 * (progress.data.filter((x) => x.quiz_correct).length / lessonsDone)) : null;
  const st = streak.data || { current_streak: 0, longest_streak: 0, total_xp: 0 };

  // ---- behaviour triggers (drive Learn personalisation + insights) ----
  const triggers = [];
  if (savingsRate != null && savingsRate < 10) triggers.push({ code: 'low_savings_rate', module: 2, why: `savings rate ${savingsRate.toFixed(1)}%` });
  if (cryptoPct > 20) triggers.push({ code: 'crypto_concentration', module: 6, why: `crypto is ${cryptoPct.toFixed(0)}% of portfolio` });
  if (topHolding && totalInvested > 0 && topHolding.value / totalInvested > 0.35)
    triggers.push({ code: 'single_holding_concentration', module: 6, why: `${topHolding.asset_name} is ${(100 * topHolding.value / totalInvested).toFixed(0)}% of investments` });
  if (totalIncome > 0 && netWorth < totalIncome * 6 && savingsRate != null && savingsRate < 20)
    triggers.push({ code: 'high_income_low_wealth', module: 9, why: `income ${f(totalIncome)}/mo but net worth ${f(netWorth)}` });
  if (behindGoals.length) triggers.push({ code: 'goals_behind', module: 7, why: `${behindGoals.map((g) => g.name).join(', ')} behind schedule` });
  if (emergencyMonths != null && emergencyMonths < 3) triggers.push({ code: 'thin_emergency_fund', module: 2, why: `emergency fund covers ${emergencyMonths.toFixed(1)} months` });
  if (fixedRatio != null && fixedRatio > 60) triggers.push({ code: 'high_fixed_costs', module: 4, why: `fixed costs are ${fixedRatio.toFixed(0)}% of income` });
  if (st.current_streak === 0 && lessonsDone > 0) triggers.push({ code: 'streak_broken', module: 7, why: 'learning streak broken' });

  // ---- month-on-month ----
  const prev = prevSnap.data || null;
  const mom = prev ? {
    income: totalIncome - Number(prev.total_income),
    expenses: totalExpenses - Number(prev.total_expenses),
    savingsRate: savingsRate != null && prev.savings_rate != null ? savingsRate - Number(prev.savings_rate) : null,
    netWorth: netWorth - Number(prev.net_worth),
    invested: totalInvested - Number(prev.total_invested),
  } : null;

  return {
    month, base, sym, f, profile: p,
    budget: { totalIncome, totalExpenses, byType, netSavings, savingsRate, fixedRatio, topExpenses,
      savingsAllocated: (savingsAlloc.data || []).reduce((a, s) => a + Number(s.amount), 0) },
    portfolio: { items: portfolio, totalInvested, classMix, topHolding, cryptoPct, staleClasses, allHoldings },
    assets: { rows: assetRows, totalAssets, liquid, semi, illiquid, emergencyFund, emergencyMonths },
    liabilities: { rows: liabilities.data || [], totalLiabilities },
    netWorth, goals: goalStates, behindGoals,
    learning: { lessonsDone, quizAccuracy, streak: st },
    triggers, mom, prev,
    modules: modules.data || [],
  };
}

// ============================================================
// CONTEXT BUILDER — structured whole-life narrative for Claude
// ============================================================
export async function buildContext(db, userId) {
  const I = await computeIntelligence(db, userId);
  const { f, sym } = I;
  const pct = (n) => (n == null ? 'n/a' : `${n.toFixed(1)}%`);

  const sections = [];
  sections.push(`=== FINANCIAL INTELLIGENCE CONTEXT — ${I.profile.name || 'User'} — ${I.month} (base currency ${I.base}) ===
Profile: ${I.profile.country || '?'} · ${I.profile.tracker_type || 'individual'} tracker · confidence: ${I.profile.financial_confidence || '?'}`);

  sections.push(`[1] BUDGET BEHAVIOUR
Income ${f(I.budget.totalIncome)}/mo · Expenses ${f(I.budget.totalExpenses)} (fixed ${f(I.budget.byType.fixed)}, variable ${f(I.budget.byType.variable)}, one-time ${f(I.budget.byType['one-time'])})
Net savings ${f(I.budget.netSavings)} · Savings rate ${pct(I.budget.savingsRate)} · Fixed-cost ratio ${pct(I.budget.fixedRatio)}
Top expenses: ${I.budget.topExpenses.map((e) => `${e.description} ${f(e.amount)} [${e.type}]`).join(', ') || 'none recorded'}
Savings allocated this month: ${f(I.budget.savingsAllocated)}`);

  sections.push(`[2] ASSET MIX & PORTFOLIO
Total invested (broker/holdings): ${f(I.portfolio.totalInvested)} · Other assets: ${f(I.assets.totalAssets)}
Class mix: ${I.portfolio.classMix.map((c) => `${c.type} ${c.pct.toFixed(0)}%`).join(', ') || 'none'}
Largest holding: ${I.portfolio.topHolding ? `${I.portfolio.topHolding.asset_name} ${f(I.portfolio.topHolding.value)} (${(100 * I.portfolio.topHolding.value / Math.max(1, I.portfolio.totalInvested)).toFixed(0)}% of investments)` : 'n/a'}
Holdings detail: ${I.portfolio.allHoldings.slice(0, 25).map((h) => `${h.asset_name}${h.ticker ? ` (${h.ticker})` : ''} ${f(h.value)}${h.original_currency && h.original_currency !== I.base ? ` [orig ${h.original_currency} ${h.original_value} @ ${h.fx_rate}]` : ''}`).join('; ') || 'none'}
Non-broker assets: ${I.assets.rows.map((a) => `${a.name} (${a.asset_class}, ${a.liquidity}) ${f(a.converted_value)}${a.original_currency !== I.base ? ` [orig ${a.original_currency} ${a.original_value} @ ${a.fx_rate} on ${a.fx_date}]` : ''}`).join('; ') || 'none'}`);

  sections.push(`[3] LIQUIDITY & SAFETY
Liquid ${f(I.assets.liquid)} · Semi-liquid ${f(I.assets.semi)} · Illiquid ${f(Math.max(0, I.assets.illiquid))}
Emergency fund ${f(I.assets.emergencyFund)} = ${I.assets.emergencyMonths != null ? I.assets.emergencyMonths.toFixed(1) + ' months of expenses' : 'coverage unknown'}`);

  sections.push(`[4] LIABILITIES & NET WORTH
Liabilities: ${I.liabilities.rows.map((l) => `${l.name} ${f(l.amount)}${l.interest_rate ? ` @ ${l.interest_rate}%` : ''}`).join(', ') || 'none'} · Total ${f(I.liabilities.totalLiabilities)}
NET WORTH: ${f(I.netWorth)}`);

  sections.push(`[5] GOALS TRAJECTORY
${I.goals.map((g) => `- ${g.name}: ${f(g.current)} of ${f(g.target)} (${g.pct.toFixed(0)}%) · ${f(g.monthly)}/mo${g.monthsNeeded != null ? ` · needs ${g.monthsNeeded} months` : ''}${g.monthsAvailable != null ? ` · ${g.monthsAvailable} months until target date` : ''}${g.onTrack != null ? ` · ${g.onTrack ? 'ON TRACK' : 'BEHIND'}` : ''}`).join('\n') || 'No goals set.'}`);

  if (I.mom) sections.push(`[6] CHANGES SINCE LAST MONTH
Income ${sym}${I.mom.income >= 0 ? '+' : ''}${I.mom.income.toFixed(0)} · Expenses ${sym}${I.mom.expenses >= 0 ? '+' : ''}${I.mom.expenses.toFixed(0)} · Savings rate ${I.mom.savingsRate != null ? (I.mom.savingsRate >= 0 ? '+' : '') + I.mom.savingsRate.toFixed(1) + 'pts' : 'n/a'} · Net worth ${sym}${I.mom.netWorth >= 0 ? '+' : ''}${I.mom.netWorth.toFixed(0)} · Invested ${sym}${I.mom.invested >= 0 ? '+' : ''}${I.mom.invested.toFixed(0)}`);
  else sections.push(`[6] CHANGES SINCE LAST MONTH: no previous monthly snapshot stored yet.`);

  sections.push(`[7] LEARNING PROGRESS
${I.learning.lessonsDone} lessons completed · quiz accuracy ${I.learning.quizAccuracy != null ? I.learning.quizAccuracy + '%' : 'n/a'} · streak ${I.learning.streak.current_streak} days (best ${I.learning.streak.longest_streak}) · ${I.learning.streak.total_xp} XP`);

  const warnings = [];
  for (const s of I.portfolio.staleClasses) warnings.push(`${s.type} snapshot is ${s.ageDays} days old — values may be outdated`);
  if (!I.budget.totalIncome) warnings.push('no income recorded');
  if (!I.portfolio.items.length && !I.assets.rows.length) warnings.push('no portfolio or asset data');
  sections.push(`[8] DATA QUALITY WARNINGS
${warnings.length ? warnings.map((w) => `- ${w}`).join('\n') : '- none'}`);

  sections.push(`[9] BEHAVIOUR TRIGGERS (deterministic, computed by the app)
${I.triggers.length ? I.triggers.map((t) => `- ${t.code}: ${t.why} → relevant learning module #${t.module}`).join('\n') : '- none fired'}`);

  return sections.join('\n\n');
}
