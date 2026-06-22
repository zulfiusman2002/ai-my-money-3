import { NextApiRequest, NextApiResponse } from 'next'
import { AIAnalysis, PaperTrade, RealismConfig, DEFAULT_REALISM } from '../../lib/types'
import { openPaperTrade, checkTradeGate } from '../../lib/tradeEngine'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { analysis, account_balance, existing_trades, config } = req.body as {
    analysis: AIAnalysis
    account_balance?: number
    existing_trades?: PaperTrade[]
    config?: RealismConfig
  }

  if (!analysis) return res.status(400).json({ error: 'analysis required' })

  // Safety: never create a trade from demo data or a non-BUY decision.
  if (analysis.is_demo) {
    return res.status(200).json({ success: false, blocked: true, reason: 'Demo data is not tradeable' })
  }
  if (analysis.decision !== 'BUY') {
    return res.status(200).json({ success: false, blocked: true, reason: `Decision is ${analysis.decision}, not BUY` })
  }

  const cfg = config || DEFAULT_REALISM
  const balance = account_balance ?? 100000
  const trades = existing_trades || []

  const gate = checkTradeGate(trades, balance, cfg)
  if (!gate.allowed) {
    return res.status(200).json({ success: false, blocked: true, reason: gate.reason })
  }

  const trade = openPaperTrade(analysis, balance, cfg)
  if (trade.position_size <= 0) {
    return res.status(200).json({ success: false, blocked: true, reason: 'Position size computed as zero (check stop distance)' })
  }

  return res.status(200).json({ success: true, trade })
}
