import { NextApiRequest, NextApiResponse } from 'next'
import { MarketSnapshot, MarketContext, GeminiOutput, GPTOutput, ClaudeOutput, ModelAuditEntry } from '../../lib/types'
import { CLAUDE_SYSTEM, buildClaudePrompt, demoClaude } from '../../lib/aiPrompts'

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'

async function callClaude(snapshot: MarketSnapshot, market: MarketContext, gemini: GeminiOutput, gpt: GPTOutput, key: string): Promise<{ result: ClaudeOutput; raw: string }> {
  const prompt = buildClaudePrompt(snapshot, market, gemini, gpt)
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      system: CLAUDE_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic API ${res.status}`)
  const data = await res.json()
  const raw = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('')
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  const result = JSON.parse(cleaned) as ClaudeOutput
  result.is_demo = false
  return { result, raw }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { snapshot, market, gemini_output, gpt_output } = req.body as {
    snapshot: MarketSnapshot; market: MarketContext; gemini_output: GeminiOutput; gpt_output: GPTOutput
  }
  if (!snapshot || !gemini_output || !gpt_output) return res.status(400).json({ error: 'snapshot, gemini_output, gpt_output required' })

  const key = process.env.ANTHROPIC_API_KEY
  const start = Date.now()
  const prompt = buildClaudePrompt(snapshot, market, gemini_output, gpt_output)

  if (!key || snapshot.is_demo) {
    const result = demoClaude(snapshot, gemini_output, gpt_output)
    const audit: ModelAuditEntry = {
      model: 'claude', role: 'Risk Officer', system_prompt: CLAUDE_SYSTEM,
      user_prompt: prompt, raw_response: JSON.stringify(result, null, 2),
      parsed_ok: true, retries: 0, latency_ms: Date.now() - start,
      is_demo: true, model_name: 'demo-deterministic', timestamp: new Date().toISOString(),
    }
    return res.status(200).json({ result, audit, success: true, is_demo: true })
  }

  let retries = 0, lastErr = ''
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { result, raw } = await callClaude(snapshot, market, gemini_output, gpt_output, key)
      const audit: ModelAuditEntry = {
        model: 'claude', role: 'Risk Officer', system_prompt: CLAUDE_SYSTEM,
        user_prompt: prompt, raw_response: raw, parsed_ok: true, retries: attempt,
        latency_ms: Date.now() - start, is_demo: false, model_name: MODEL,
        timestamp: new Date().toISOString(),
      }
      return res.status(200).json({ result, audit, success: true, is_demo: false })
    } catch (e: any) {
      retries = attempt + 1; lastErr = e.message
    }
  }

  const audit: ModelAuditEntry = {
    model: 'claude', role: 'Risk Officer', system_prompt: CLAUDE_SYSTEM,
    user_prompt: prompt, raw_response: '', parsed_ok: false, parse_error: lastErr,
    retries, latency_ms: Date.now() - start, is_demo: false, model_name: MODEL,
    timestamp: new Date().toISOString(),
  }
  return res.status(200).json({ failed: true, audit, error: lastErr, ticker: snapshot.ticker })
}
