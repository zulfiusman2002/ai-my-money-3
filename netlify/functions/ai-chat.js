import {
  handler as wrap,
  requireUser,
  json,
  buildContext,
  callClaude,
  ADVISOR_SYSTEM,
  DISCLAIMER,
} from './_lib/core.js';
import { decodeMiloAnswer, answerToPlainText } from '../../shared/miloAnswerFormat.js';

const CHAT_SCHEMA = `Return ONLY valid JSON. Do not use markdown and do not add text outside the JSON object.
Use this exact shape:
{
  "answer_type": "decision|comparison|explanation|review|general",
  "title": "A useful headline of no more than 12 words",
  "direct_answer": "Answer the user's question directly in 1-3 short sentences",
  "verdict": {
    "label": "A short verdict such as Affordable with trade-offs, On track, Needs attention, or Explained",
    "tone": "positive|caution|risk|neutral",
    "detail": "One sentence explaining the verdict"
  },
  "visual": {
    "kind": "score|affordability|goal|comparison|cashflow|none",
    "eyebrow": "A short label for the visual",
    "headline": "A scan-friendly statement of the result",
    "primary_label": "Main figure label",
    "primary_value": "Exact formatted figure from context",
    "secondary_label": "Comparison or impact label",
    "secondary_value": "Exact formatted figure or short impact",
    "progress_pct": 0,
    "note": "One short sentence explaining the visual"
  },
  "metrics": [
    {"label":"Metric name","value":"Use the exact formatted value from context","detail":"Why it matters","tone":"positive|caution|risk|neutral"}
  ],
  "goal_impacts": [
    {"goal":"Goal name","impact":"Short impact label","detail":"What changes and why","tone":"positive|caution|risk|neutral"}
  ],
  "sections": [
    {"title":"Section title","body":"Optional concise explanation","bullets":["Specific point","Specific point"]}
  ],
  "actions": [
    {"title":"Action","detail":"A concrete next step grounded in the data","priority":"high|medium|low","module":"budget|goals|investments|networth|projector|learn|timeline|none","question":"Optional short follow-up question to simulate or explain the action"}
  ],
  "assumptions": ["Any assumption used"],
  "data_gaps": ["Missing information that could materially change the answer"],
  "follow_ups": ["Useful short follow-up question"],
  "confidence": "high|medium|low",
  "disclaimer": "${DISCLAIMER}"
}
Rules for the JSON:
- Use ONLY figures present in the supplied MoneyMilo context or explicitly supplied by the user.
- Never create a benchmark, percentile, market return, interest rate or forecast that is not in the context.
- Use visual.kind none only when a visual summary would mislead. Otherwise create one scan-friendly visual from figures already present in context.
- progress_pct must be a number from 0 to 100 and must represent an explicit ratio from context. Use null when no valid ratio is available.
- Keep the visual headline under 12 words and the note under 24 words.
- Keep metrics to the 2-4 most decision-useful values; each detail must be under 24 words.
- Keep goal_impacts empty unless a named goal is genuinely affected, and use no more than 3.
- Keep sections to 1-3 concise sections with no more than 3 bullets each. Do not repeat the same point in multiple fields.
- Keep actions to no more than 3 and follow_ups to no more than 3.
- Set action.module only when opening that MoneyMilo module would genuinely help. Use none otherwise.
- Set action.question when Milo can continue by simulating or explaining the action.
- If a calculation cannot be completed, state the missing input in data_gaps instead of guessing.
- Do not include markdown symbols, markdown tables, asterisks or pipe-delimited tables anywhere.`;

function fallbackAnswer(raw) {
  return {
    answer_type: 'general',
    title: "Milo's answer",
    direct_answer: String(raw || '').trim() || 'Milo could not format this answer. Please try again.',
    verdict: { label: 'Review', tone: 'neutral', detail: 'This response is shown in simplified form.' },
    visual: null,
    metrics: [],
    goal_impacts: [],
    sections: [],
    actions: [],
    assumptions: [],
    data_gaps: [],
    follow_ups: [],
    confidence: 'low',
    disclaimer: DISCLAIMER,
    format_status: 'complete',
  };
}

export const handler = wrap(async (event) => {
  console.log('CHAT START');
  const { user, db } = await requireUser(event);
  console.log('USER VERIFIED', user.id);
  const { messages = [] } = JSON.parse(event.body || '{}');
  if (!messages.length) return json(400, { error: 'messages required' });

  const context = await buildContext(db, user.id);
  const { data: memories } = await db.from('ai_analysis').select('prompt,response,created_at').eq('user_id', user.id).eq('analysis_type', 'chat').order('created_at', { ascending: false }).limit(4);
  const memory = (memories || []).map((item) => {
    let answer = '';
    try { const parsed = JSON.parse(item.response || '{}'); answer = parsed.direct_answer || parsed.title || ''; } catch { answer = ''; }
    return `- ${String(item.prompt || '').slice(0,180)}${answer ? ` → ${String(answer).slice(0,240)}` : ''}`;
  }).join('\n') || '- No previous saved conversations.';
  console.log('CONTEXT BUILT', { chars: context.length, memories: memories?.length || 0 });

  const raw = await callClaude({
    system: `${ADVISOR_SYSTEM}\n\n${CHAT_SCHEMA}\n\nMONEYMILO CONTEXT:\n${context}\n\nRECENT MONEYMILO MEMORY (use only when relevant; never claim the user said something not shown):\n${memory}`,
    messages: messages.slice(-8).map((m) => ({ role: m.role, content: String(m.content || '') })),
    maxTokens: 2400,
    useFast: true,
  });

  const decoded = decodeMiloAnswer(raw, { disclaimer: DISCLAIMER });
  const reply = decoded.structured ? decoded.answer : fallbackAnswer(raw);
  const replyText = answerToPlainText(reply);
  if (decoded.partial) console.warn('CHAT JSON RECOVERED', { rawChars: String(raw || '').length });
  if (!decoded.structured) console.warn('CHAT NON-JSON FALLBACK', { rawChars: String(raw || '').length });

  db.from('ai_analysis').insert({
    user_id: user.id,
    analysis_type: 'chat',
    prompt: messages[messages.length - 1]?.content?.slice(0, 500),
    response: JSON.stringify(reply),
  }).then(() => {}).catch(() => {});

  return json(200, { reply, reply_text: replyText });
});
