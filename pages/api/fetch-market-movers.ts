import { NextApiRequest, NextApiResponse } from 'next'
import { fetchMovers, fetchMarketContext } from '../../lib/marketData'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    const [moversResult, market] = await Promise.all([fetchMovers(), fetchMarketContext()])
    return res.status(200).json({
      movers: moversResult.movers,
      market,
      source: moversResult.source,
      is_demo: moversResult.is_demo,
      status: moversResult.status,
      error: moversResult.error,
      provider_requested: moversResult.provider_requested,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Market movers error:', error)
    return res.status(500).json({ error: error.message })
  }
}
