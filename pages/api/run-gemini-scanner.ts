import { NextApiRequest, NextApiResponse } from 'next'
import { MarketSnapshot, MarketContext, GeminiOutput, ModelAuditEntry } from '../../lib/types'
import { GEMINI_SYSTEM, buildGeminiPrompt, demoGemini } from '../../lib/aiPrompts'

const MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash'

function parseJSON(text: string): any {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned)
}

async function callGemini(snapshot: MarketSnapshot, market: MarketContext, key: string): Promise<{ result: GeminiOutput; raw: string }> {
  const prompt = buildGeminiPrompt(snapshot, market)
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: GEMINI_SYSTEM }] },
        generationConfig: { temperature: 0.2, maxOutputTokens: 700, responseMimeType: 'application/json' },
      }),
    }
  )
  if (!res.ok) throw new Error(`Gemini API ${res.status}`)
  const data = await res.json()
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  const result = parseJSON(raw) as GeminiOutput
  result.is_demo = false
  return { result, raw }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { snapshot, market } = req.body as { snapshot: MarketSnapshot; market: MarketContext }
  if (!snapshot) return res.status(400).json({ error: 'snapshot required' })

  const key = process.env.GEMINI_API_KEY
  const start = Date.now()
  const prompt = buildGeminiPrompt(snapshot, market)

  // Demo mode: deterministic, clearly-labelled output
  if (!key || snapshot.is_demo) {
    const result = demoGemini(snapshot)
    const audit: ModelAuditEntry = {
      model: 'gemini', role: 'Market Scanner', system_prompt: GEMINI_SYSTEM,
      user_prompt: prompt, raw_response: JSON.stringify(result, null, 2),
      parsed_ok: true, retries: 0, latency_ms: Date.now() - start,
      is_demo: true, model_name: 'demo-deterministic', timestamp: new Date().toISOString(),
    }
    return res.status(200).json({ result, audit, success: true, is_demo: true })
  }

  let retries = 0
  let lastErr = ''
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { result, raw } = await callGemini(snapshot, market, key)
      const audit: ModelAuditEntry = {
        model: 'gemini', role: 'Market Scanner', system_prompt: GEMINI_SYSTEM,
        user_prompt: prompt, raw_response: raw, parsed_ok: true, retries: attempt,
        latency_ms: Date.now() - start, is_demo: false, model_name: MODEL,
        timestamp: new Date().toISOString(),
      }
      return res.status(200).json({ result, audit, success: true, is_demo: false })
    } catch (e: any) {
      retries = attempt + 1
      lastErr = e.message
    }
  }

  const audit: ModelAuditEntry = {
    model: 'gemini', role: 'Market Scanner', system_prompt: GEMINI_SYSTEM,
    user_prompt: prompt, raw_response: '', parsed_ok: false, parse_error: lastErr,
    retries, latency_ms: Date.now() - start, is_demo: false, model_name: MODEL,
    timestamp: new Date().toISOString(),
  }
  return res.status(200).json({ failed: true, audit, error: lastErr, ticker: snapshot.ticker })
}
