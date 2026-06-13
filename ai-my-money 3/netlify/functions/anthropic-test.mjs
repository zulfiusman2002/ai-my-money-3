// Temporary diagnostic endpoint.
// Call: POST /.netlify/functions/anthropic-test (no auth required)
// Returns model used, response time, and Claude's reply.
// Remove this file after confirming latency.

const HAIKU  = 'claude-3-5-haiku-20241022';

export const handler = async () => {
  const start = Date.now();
  const model = process.env.ANTHROPIC_MODEL_FAST || HAIKU;
  console.log('TEST START model=', model);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 20,
        messages: [{ role: 'user', content: 'Reply with exactly: Hello from Claude' }],
      }),
    });
    const ms = Date.now() - start;
    console.log('TEST DONE ms=', ms, 'status=', res.status);
    const data = await res.json();
    const reply = data.content?.filter((b) => b.type === 'text').map((b) => b.text).join('') || '';
    return {
      statusCode: res.ok ? 200 : 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model_requested: model,
        model_returned: data.model || null,
        response_ms: ms,
        reply,
        stop_reason: data.stop_reason,
        input_tokens: data.usage?.input_tokens,
        output_tokens: data.usage?.output_tokens,
        error: data.error || null,
      }),
    };
  } catch (e) {
    const ms = Date.now() - start;
    console.log('TEST ERROR ms=', ms, e.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: e.message, response_ms: ms }),
    };
  }
};
