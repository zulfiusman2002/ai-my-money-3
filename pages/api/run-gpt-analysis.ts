import { NextApiRequest, NextApiResponse } from 'next'
import { MarketSnapshot, MarketContext, GeminiOutput, GPTOutput, ModelAuditEntry } from '../../lib/types'
import { GPT_SYSTEM, buildGPTPrompt, demoGPT } from '../../lib/aiPrompts'

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o'

async function callGPT(snapshot: MarketSnapshot, market: MarketContext, gemini: GeminiOutput, key: string): Promise<{ result: GPTOutput; raw: string }> {
  const prompt = buildGPTPrompt(snapshot, market, gemini)
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: GPT_SYSTEM },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 900,
      response_format: { type: 'json_object' },
    }),
  })
  if (!res.ok) throw new Error(`OpenAI API ${res.status}`)
  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content || ''
  const result = JSON.parse(raw) as GPTOutput
  result.is_demo = false
  return { result, raw }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { snapshot, market, gemini_output } = req.body as {
    snapshot: MarketSnapshot; market: MarketContext; gemini_output: GeminiOutput
  }
  if (!snapshot || !gemini_output) return res.status(400).json({ error: 'snapshot and gemini_output required' })

  const key = process.env.OPENAI_API_KEY
  const start = Date.now()
  const prompt = buildGPTPrompt(snapshot, market, gemini_output)

  if (!key || snapshot.is_demo) {
    const result = demoGPT(snapshot, gemini_output)
    const audit: ModelAuditEntry = {
      model: 'gpt', role: 'Momentum Analyst', system_prompt: GPT_SYSTEM,
      user_prompt: prompt, raw_response: JSON.stringify(result, null, 2),
      parsed_ok: true, retries: 0, latency_ms: Date.now() - start,
      is_demo: true, model_name: 'demo-deterministic', timestamp: new Date().toISOString(),
    }
    return res.status(200).json({ result, audit, success: true, is_demo: true })
  }

  let retries = 0, lastErr = ''
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { result, raw } = await callGPT(snapshot, market, gemini_output, key)
      const audit: ModelAuditEntry = {
        model: 'gpt', role: 'Momentum Analyst', system_prompt: GPT_SYSTEM,
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
    model: 'gpt', role: 'Momentum Analyst', system_prompt: GPT_SYSTEM,
    user_prompt: prompt, raw_response: '', parsed_ok: false, parse_error: lastErr,
    retries, latency_ms: Date.now() - start, is_demo: false, model_name: MODEL,
    timestamp: new Date().toISOString(),
  }
  return res.status(200).json({ failed: true, audit, error: lastErr, ticker: snapshot.ticker })
}
