interface ScoreBarProps {
  score: number
  label: string
  max?: number
  size?: 'sm' | 'md'
}

export function ScoreBar({ score, label, max = 100, size = 'sm' }: ScoreBarProps) {
  const pct = Math.min(100, (score / max) * 100)
  const color = pct >= 70 ? '#00FF88' : pct >= 40 ? '#FFB800' : '#FF3B5C'

  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-400 text-xs w-24 shrink-0">{label}</span>
      <div className={`flex-1 h-1.5 rounded-full bg-terminal-border overflow-hidden`}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-mono w-8 text-right" style={{ color }}>
        {score}
      </span>
    </div>
  )
}

interface ScoreCircleProps {
  score: number
  label: string
  size?: 'sm' | 'lg'
}

export function ScoreCircle({ score, label, size = 'sm' }: ScoreCircleProps) {
  const color = score >= 70 ? '#00FF88' : score >= 40 ? '#FFB800' : '#FF3B5C'
  const sizeClass = size === 'lg' ? 'w-16 h-16 text-lg' : 'w-12 h-12 text-sm'
  
  return (
    <div className="flex flex-col items-center gap-1">
      <div 
        className={`${sizeClass} rounded-full border-2 flex items-center justify-center font-mono font-bold`}
        style={{ borderColor: color, color }}
      >
        {score}
      </div>
      <span className="text-slate-500 text-xs">{label}</span>
    </div>
  )
}
