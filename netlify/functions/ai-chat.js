import {
  handler as wrap,
  requireUser,
  json,
  buildContext,
  callClaude,
  parseClaudeJson,
  ADVISOR_SYSTEM,
  DISCLAIMER,
} from './_lib/core.js';

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
    {"title":"Action","detail":"A concrete next step grounded in the data","priority":"high|medium|low"}
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
- Keep metrics to the 2-5 most decision-useful values.
- Keep goal_impacts empty unless a named goal is genuinely affected.
- Keep sections to 1-4 concise sections. Do not repeat the same point in multiple fields.
- If a calculation cannot be completed, state the missing input in data_gaps instead of guessing.
- Do not include markdown symbols, markdown tables, asterisks or pipe-delimited tables anywhere.`;

function fallbackAnswer(raw) {
  return {
    answer_type: 'general',
    title: "Milo's answer",
    direct_answer: String(raw || '').trim() || 'Milo could not format this answer. Please try again.',
    verdict: { label: 'Review', tone: 'neutral', detail: 'This response is shown in simplified form.' },
    metrics: [],
    goal_impacts: [],
    sections: [],
    actions: [],
    assumptions: [],
    data_gaps: [],
    follow_ups: [],
    confidence: 'low',
    disclaimer: DISCLAIMER,
  };
}

function normaliseAnswer(value) {
  const answer = value && typeof value === 'object' ? value : fallbackAnswer(value);
  return {
    answer_type: answer.answer_type || 'general',
    title: answer.title || "Milo's answer",
    direct_answer: answer.direct_answer || answer.summary || '',
    verdict: answer.verdict && typeof answer.verdict === 'object'
      ? {
          label: answer.verdict.label || 'Explained',
          tone: ['positive', 'caution', 'risk', 'neutral'].includes(answer.verdict.tone) ? answer.verdict.tone : 'neutral',
          detail: answer.verdict.detail || '',
        }
      : { label: 'Explained', tone: 'neutral', detail: '' },
    metrics: Array.isArray(answer.metrics) ? answer.metrics.slice(0, 6) : [],
    goal_impacts: Array.isArray(answer.goal_impacts) ? answer.goal_impacts.slice(0, 6) : [],
    sections: Array.isArray(answer.sections) ? answer.sections.slice(0, 5) : [],
    actions: Array.isArray(answer.actions) ? answer.actions.slice(0, 5) : [],
    assumptions: Array.isArray(answer.assumptions) ? answer.assumptions.slice(0, 8) : [],
    data_gaps: Array.isArray(answer.data_gaps) ? answer.data_gaps.slice(0, 8) : [],
    follow_ups: Array.isArray(answer.follow_ups) ? answer.follow_ups.slice(0, 4) : [],
    confidence: ['high', 'medium', 'low'].includes(answer.confidence) ? answer.confidence : 'medium',
    disclaimer: answer.disclaimer || DISCLAIMER,
  };
}

function answerContext(answer) {
  const parts = [answer.title, answer.direct_answer];
  if (answer.verdict?.label) parts.push(`Verdict: ${answer.verdict.label}. ${answer.verdict.detail || ''}`);
  if (answer.metrics?.length) parts.push(`Key figures: ${answer.metrics.map((m) => `${m.label} ${m.value}`).join('; ')}`);
  if (answer.actions?.length) parts.push(`Actions: ${answer.actions.map((a) => `${a.title}: ${a.detail}`).join('; ')}`);
  return parts.filter(Boolean).join('\n').slice(0, 5000);
}

export const handler = wrap(async (event) => {
  console.log('CHAT START');
  const { user, db } = await requireUser(event);
  console.log('USER VERIFIED', user.id);
  const { messages = [] } = JSON.parse(event.body || '{}');
  if (!messages.length) return json(400, { error: 'messages required' });

  const context = await buildContext(db, user.id);
  console.log('CONTEXT BUILT', { chars: context.length });

  const raw = await callClaude({
    system: `${ADVISOR_SYSTEM}\n\n${CHAT_SCHEMA}\n\nMONEYMILO CONTEXT:\n${context}`,
    messages: messages.slice(-8).map((m) => ({ role: m.role, content: String(m.content || '') })),
    maxTokens: 1500,
    useFast: true,
  });

  let reply;
  let replyText;
  try {
    reply = normaliseAnswer(parseClaudeJson(raw));
    replyText = answerContext(reply);
  } catch (parseError) {
    console.warn('CHAT JSON FALLBACK', parseError.message);
    reply = String(raw || '').trim() || fallbackAnswer('').direct_answer;
    replyText = reply;
  }

  db.from('ai_analysis').insert({
    user_id: user.id,
    analysis_type: 'chat',
    prompt: messages[messages.length - 1]?.content?.slice(0, 500),
    response: JSON.stringify(reply),
  }).then(() => {}).catch(() => {});

  return json(200, { reply, reply_text: replyText });
});
