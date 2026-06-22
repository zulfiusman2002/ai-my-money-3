import { CheckCircle, Eye, XCircle, AlertTriangle, Clock, Loader2 } from 'lucide-react'

interface DecisionBadgeProps {
  decision: 'BUY' | 'WATCH' | 'REJECT' | 'PENDING' | 'SCANNING' | 'FAILED'
  size?: 'sm' | 'md' | 'lg'
}

const CONFIG = {
  BUY: {
    label: '▲ BUY',
    className: 'badge-buy',
    icon: CheckCircle,
    glow: 'glow-green',
  },
  WATCH: {
    label: '◉ WATCH',
    className: 'badge-watch',
    icon: Eye,
    glow: 'glow-amber',
  },
  REJECT: {
    label: '✕ REJECT',
    className: 'badge-reject',
    icon: XCircle,
    glow: 'glow-red',
  },
  PENDING: {
    label: '○ PENDING',
    className: 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700',
    icon: Clock,
    glow: '',
  },
  SCANNING: {
    label: '⟳ SCANNING',
    className: 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-signal-blue bg-opacity-15 text-signal-blue border border-signal-blue border-opacity-30',
    icon: Loader2,
    glow: '',
  },
  FAILED: {
    label: '⚠ FAILED',
    className: 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-900 bg-opacity-30 text-orange-400 border border-orange-800',
    icon: AlertTriangle,
    glow: '',
  },
}

export function DecisionBadge({ decision, size = 'sm' }: DecisionBadgeProps) {
  const config = CONFIG[decision] || CONFIG.PENDING
  const Icon = config.icon
  
  const sizeClass = size === 'lg' 
    ? 'px-4 py-1.5 text-sm' 
    : size === 'md' 
    ? 'px-3 py-1 text-xs' 
    : ''

  return (
    <span className={`${config.className} ${sizeClass}`}>
      {decision === 'SCANNING' && <Icon size={10} className="animate-spin" />}
      {config.label}
    </span>
  )
}

export function GradeTag({ grade }: { grade: string }) {
  const colors: Record<string, string> = {
    'A+': 'text-signal-green border-signal-green bg-signal-green',
    'A': 'text-emerald-400 border-emerald-600 bg-emerald-900',
    'B': 'text-signal-blue border-signal-blue bg-signal-blue',
    'C': 'text-signal-amber border-signal-amber bg-signal-amber',
    'D': 'text-orange-400 border-orange-700 bg-orange-900',
    'F': 'text-signal-red border-signal-red bg-signal-red',
  }
  
  const cls = colors[grade] || colors['C']
  
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border bg-opacity-10 text-sm font-bold font-mono ${cls}`}>
      {grade}
    </span>
  )
}
