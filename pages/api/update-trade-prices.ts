import { NextApiRequest, NextApiResponse } from 'next'
import { PaperTrade, RealismConfig, DEFAULT_REALISM } from '../../lib/types'
import { stepTrade } from '../../lib/tradeEngine'
import { fetchLatestPrice } from '../../lib/marketData'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { trades, config } = req.body as { trades: PaperTrade[]; config?: RealismConfig }
  if (!trades || !Array.isArray(trades)) return res.status(400).json({ error: 'trades array required' })

  const cfg = config || DEFAULT_REALISM
  const updated: PaperTrade[] = []
  let isDemo = false

  for (const trade of trades) {
    if (trade.status === 'CLOSED') { updated.push(trade); continue }
    const latest = await fetchLatestPrice(trade.ticker)
    if (!latest) { updated.push(trade); continue }
    if (latest.is_demo) isDemo = true
    updated.push(stepTrade(trade, latest.price, cfg))
  }

  return res.status(200).json({ trades: updated, is_demo: isDemo, timestamp: new Date().toISOString() })
}
