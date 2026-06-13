import { handler as wrap, requireUser, json, buildContext, callClaude, parseClaudeJson, ADVISOR_SYSTEM, DISCLAIMER } from './_lib/core.mjs';

const FOCUS = {
  'full-review':  'Run a full financial review: budget health, savings rate, portfolio, goals, net worth, and top 3 priorities.',
  'budget':       'Analyse the monthly budget: where money goes, fixed vs variable balance, overspending risks, 3 specific cuts with amounts.',
  'portfolio':    'Analyse the investment portfolio: diversification, concentration risk, currency/geography exposure, stale snapshots, ideas to review.',
  'goals':        'Check every goal: on track or not, required monthly amount vs current contribution, what to change.',
  'networth':     'Review net worth: composition, liquid vs illiquid, liabilities, month-on-month direction.',
  'risk':         'Risk review: concentration, volatility exposure, emergency-fund coverage, single points of failure.',
  'savings':      'Savings optimisation: realistic ways to raise the savings rate, ranked by impact and effort.',
  'changes':      'Compare the most recent data against earlier snapshots/months in the context and explain what changed and why it matters.',
};

export const handler = wrap(async (event) => {
  const { user, db } = await requireUser(event);
  const { type = 'full-review' } = JSON.parse(event.body || '{}');
  const focus = FOCUS[type];
  if (!focus) return json(400, { error: 'Unknown analysis type' });

  const context = await buildContext(db, user.id);
  const raw = await callClaude({
    maxTokens: 2500,
    system: `${ADVISOR_SYSTEM}\n\nReturn ONLY valid JSON, no markdown fences, with this exact shape:
{
 "headline": "one-sentence verdict",
 "health_score": 0-100 integer or null if not enough data,
 "summary": "2-3 sentence overview",
 "insights": [{"title":"","detail":"","sentiment":"good|warning|risk|neutral"}],
 "actions": [{"title":"","detail":"","priority":"high|medium|low"}],
 "confidence": "high|medium|low",
 "data_gaps": ["missing data the user should add"]
}`,
    messages: [{ role: 'user', content: `${focus}\n\n${context}` }],
  });

  const result = parseClaudeJson(raw);
  result.disclaimer = DISCLAIMER;

  await db.from('ai_analysis').insert({
    user_id: user.id, analysis_type: type, prompt: focus, response: JSON.stringify(result),
  });

  return json(200, result);
});
