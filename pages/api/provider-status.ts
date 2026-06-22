import { NextApiRequest, NextApiResponse } from 'next'
import { activeProvider } from '../../lib/marketData'

// Lightweight, key-free status probe for the UI. Reports which provider WOULD be
// used and whether the app is in demo mode — without making any external calls
// or exposing any secret values.
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  const provider = activeProvider()
  const requested = (process.env.MARKET_DATA_PROVIDER || process.env.NEXT_PUBLIC_MARKET_DATA_PROVIDER || 'auto').toLowerCase()
  return res.status(200).json({
    provider,
    provider_requested: requested,
    is_demo: provider === 'none',
    status: provider === 'none' ? 'DEMO' : 'READY',
  })
}
