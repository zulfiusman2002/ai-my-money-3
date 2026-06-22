import { AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { RedFlag } from '../lib/types'

interface RedFlagsProps {
  flags: RedFlag[]
  compact?: boolean
}

const SEVERITY_CONFIG = {
  HIGH: { icon: AlertTriangle, color: 'text-signal-red', bg: 'bg-signal-red bg-opacity-10 border-signal-red border-opacity-30' },
  MEDIUM: { icon: AlertCircle, color: 'text-signal-amber', bg: 'bg-signal-amber bg-opacity-10 border-signal-amber border-opacity-30' },
  LOW: { icon: Info, color: 'text-signal-blue', bg: 'bg-signal-blue bg-opacity-10 border-signal-blue border-opacity-30' },
}

const FLAG_LABELS: Record<string, string> = {
  WEAK_CATALYST: '⚑ Weak Catalyst',
  OVEREXTENDED: '⚠ Overextended Move',
  FADING_VOLUME: '↓ Declining Volume',
  POOR_LIQUIDITY: '⛔ Poor Liquidity',
  LOW_CONFIDENCE: '? Low AI Confidence',
  BAD_RISK_REWARD: '✕ Bad Risk/Reward',
  HYPE_ONLY: '🔥 Hype Only',
  MISSING_DATA: '⚐ Missing Data',
  MARKET_WEAKNESS: '↓ Market Weakness',
  SECTOR_WEAKNESS: '↓ Sector Weakness',
  AI_INCONSISTENCY: '⟳ AI Models Disagree',
  ANALYSIS_FAILED: '✕ Analysis Failed',
  WIDE_STOP_LOSS: '↔ Stop Too Wide',
  LOW_MOMENTUM: '→ Weak Momentum',
}

export function RedFlagList({ flags, compact = false }: RedFlagsProps) {
  if (!flags || flags.length === 0) return null

  const sorted = [...flags].sort((a, b) => {
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 }
    return order[a.severity] - order[b.severity]
  })

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {sorted.map((flag, i) => {
          const cfg = SEVERITY_CONFIG[flag.severity]
          return (
            <span
              key={i}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${cfg.bg} ${cfg.color}`}
              title={flag.message}
            >
              {FLAG_LABELS[flag.type] || flag.type}
            </span>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {sorted.map((flag, i) => {
        const cfg = SEVERITY_CONFIG[flag.severity]
        const Icon = cfg.icon
        return (
          <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg border ${cfg.bg}`}>
            <Icon size={14} className={`${cfg.color} shrink-0 mt-0.5`} />
            <div>
              <p className={`text-xs font-semibold ${cfg.color}`}>
                {FLAG_LABELS[flag.type] || flag.type}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{flag.message}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
