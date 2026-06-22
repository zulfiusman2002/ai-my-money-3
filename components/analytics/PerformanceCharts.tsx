import { PaperTrade, OutcomeRecord } from '../../lib/types'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell, PieChart, Pie, Legend
} from 'recharts'

interface AnalyticsChartsProps {
  trades: PaperTrade[]
}

const COLORS = {
  green: '#00FF88',
  red: '#FF3B5C',
  amber: '#FFB800',
  blue: '#4D9EFF',
  cyan: '#00D4FF',
  purple: '#A855F7',
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-terminal-card border border-terminal-border rounded-lg p-3 shadow-xl">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs font-mono" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' && p.name?.includes('%') 
            ? `${p.value > 0 ? '+' : ''}${p.value.toFixed(2)}%`
            : typeof p.value === 'number' 
            ? `$${p.value.toFixed(0)}`
            : p.value}
        </p>
      ))}
    </div>
  )
}

export function EquityCurveChart({ trades }: AnalyticsChartsProps) {
  const closed = trades.filter(t => t.status === 'CLOSED').sort(
    (a, b) => new Date(a.exit_date!).getTime() - new Date(b.exit_date!).getTime()
  )

  let balance = 100000
  const data = [{ date: 'Start', balance: 100000, pnl: 0 }]
  
  closed.forEach(trade => {
    const pnl = trade.pnl || 0
    balance += pnl
    data.push({
      date: new Date(trade.exit_date!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      balance,
      pnl,
    })
  })

  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wide">Equity Curve</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E2A38" />
          <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 10 }} />
          <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={100000} stroke="#1E2A38" strokeDasharray="4 4" />
          <Line
            type="monotone"
            dataKey="balance"
            stroke={balance >= 100000 ? COLORS.green : COLORS.red}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            name="Balance"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ReturnDistributionChart({ trades }: AnalyticsChartsProps) {
  const closed = trades.filter(t => t.status === 'CLOSED' && t.return_pct !== undefined)

  // Bucket returns
  const buckets: Record<string, number> = {
    '<-10%': 0, '-10 to -5%': 0, '-5 to 0%': 0,
    '0 to 5%': 0, '5 to 10%': 0, '>10%': 0,
  }

  closed.forEach(trade => {
    const r = trade.return_pct || 0
    if (r < -10) buckets['<-10%']++
    else if (r < -5) buckets['-10 to -5%']++
    else if (r < 0) buckets['-5 to 0%']++
    else if (r < 5) buckets['0 to 5%']++
    else if (r < 10) buckets['5 to 10%']++
    else buckets['>10%']++
  })

  const data = Object.entries(buckets).map(([range, count]) => ({ range, count }))

  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wide">Return Distribution</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E2A38" />
          <XAxis dataKey="range" tick={{ fill: '#6B7280', fontSize: 9 }} />
          <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" name="Trades" radius={[3, 3, 0, 0]}>
            {data.map((entry, i) => (
              <Cell 
                key={i} 
                fill={entry.range.includes('-') || entry.range.startsWith('<-') 
                  ? COLORS.red : COLORS.green} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function DayReturnChart({ trades }: AnalyticsChartsProps) {
  const closed = trades.filter(t => t.status === 'CLOSED')
  
  const avg = (arr: (number | undefined)[]) => {
    const valid = arr.filter(v => v !== undefined) as number[]
    return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : 0
  }

  const data = [
    { day: 'Day 1', return: avg(closed.map(t => t.day1_return)) },
    { day: 'Day 2', return: avg(closed.map(t => t.day2_return)) },
    { day: 'Day 3', return: avg(closed.map(t => t.day3_return)) },
    { day: 'Day 5', return: avg(closed.map(t => t.day5_return)) },
  ]

  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wide">Avg Return by Hold Period</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E2A38" />
          <XAxis dataKey="day" tick={{ fill: '#6B7280', fontSize: 11 }} />
          <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} tickFormatter={v => `${v.toFixed(1)}%`} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#1E2A38" />
          <Bar dataKey="return" name="Avg Return %" radius={[3, 3, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.return >= 0 ? COLORS.green : COLORS.red} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function DecisionAccuracyChart({ outcomes }: { outcomes: OutcomeRecord[] }) {
  // Average day-2 forward return by decision type. A useful committee separates
  // BUYs (should be > 0) from REJECTs (should be <= 0).
  const real = outcomes.filter(o => !o.is_demo && o.day2_return != null)
  const avgFor = (d: string) => {
    const list = real.filter(o => o.decision === d)
    if (!list.length) return { val: 0, n: 0 }
    return { val: list.reduce((s, o) => s + (o.day2_return || 0), 0) / list.length, n: list.length }
  }
  const buy = avgFor('BUY'), watch = avgFor('WATCH'), reject = avgFor('REJECT')
  const data = [
    { name: `BUY (${buy.n})`, return: buy.val, color: COLORS.green },
    { name: `WATCH (${watch.n})`, return: watch.val, color: COLORS.amber },
    { name: `REJECT (${reject.n})`, return: reject.val, color: COLORS.red },
  ]

  if (real.length === 0) {
    return (
      <div>
        <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wide">Forward Return by Decision (Day 2)</p>
        <div className="h-48 flex items-center justify-center text-slate-600 text-sm text-center px-4">
          No resolved outcomes yet. Outcome forward-returns populate as you update prices over the following days.
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wide">Forward Return by Decision (Day 2)</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E2A38" />
          <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 11 }} />
          <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} tickFormatter={v => `${v.toFixed(1)}%`} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#1E2A38" />
          <Bar dataKey="return" name="Avg fwd return %" radius={[3, 3, 0, 0]}>
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-600 mt-2">A working committee shows BUY &gt; WATCH &gt; REJECT.</p>
    </div>
  )
}
