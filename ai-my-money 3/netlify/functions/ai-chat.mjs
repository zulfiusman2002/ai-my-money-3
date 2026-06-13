import { handler as wrap, requireUser, json, buildContext, callClaude, ADVISOR_SYSTEM } from './_lib/core.mjs';

export const handler = wrap(async (event) => {
  const { user, db } = await requireUser(event);
  const { messages = [] } = JSON.parse(event.body || '{}');
  if (!messages.length) return json(400, { error: 'messages required' });

  const context = await buildContext(db, user.id);
  const reply = await callClaude({
    system: `${ADVISOR_SYSTEM}\n\n${context}`,
    messages: messages.slice(-12).map((m) => ({ role: m.role, content: m.content })),
    maxTokens: 1500,
  });

  await db.from('ai_analysis').insert({
    user_id: user.id,
    analysis_type: 'chat',
    prompt: messages[messages.length - 1]?.content?.slice(0, 2000),
    response: reply,
  });

  return json(200, { reply });
});
