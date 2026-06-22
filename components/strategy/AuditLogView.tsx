import { useState } from 'react'
import { AIAnalysis, ModelAuditEntry } from '../../lib/types'
import { FileText, ChevronDown, ChevronRight, CheckCircle, XCircle } from 'lucide-react'

const MODEL_COLOR: Record<string, string> = {
  gemini: '#4D9EFF', gpt: '#00D4FF', claude: '#A855F7',
}

function AuditEntryView({ entry }: { entry: ModelAuditEntry }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-terminal-border rounded-lg overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-3 py-2 hover:bg-terminal-muted">
        <div className="flex items-center gap-2">
          {open ? <ChevronDown size={13} className="text-slate-500" /> : <ChevronRight size={13} className="text-slate-500" />}
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: MODEL_COLOR[entry.model] }} />
          <span className="text-xs font-bold text-white capitalize">{entry.model}</span>
          <span className="text-xs text-slate-500">{entry.role}</span>
          <span className="text-xs text-slate-600 font-mono">{entry.model_name}</span>
          {entry.is_demo && <span className="text-xs text-signal-amber">DEMO</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 font-mono">{entry.latency_ms}ms</span>
          {entry.retries > 0 && <span className="text-xs text-signal-amber">×{entry.retries} retries</span>}
          {entry.parsed_ok
            ? <CheckCircle size={13} className="text-signal-green" />
            : <XCircle size={13} className="text-signal-red" />}
        </div>
      </button>
      {open && (
        <div className="px-3 py-3 space-y-3 bg-terminal-black">
          {!entry.parsed_ok && entry.parse_error && (
            <div className="text-xs text-signal-red">Parse error: {entry.parse_error}</div>
          )}
          <details className="group">
            <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300">System prompt</summary>
            <pre className="text-xs text-slate-400 mt-1 whitespace-pre-wrap font-mono bg-terminal-dark p-2 rounded max-h-40 overflow-y-auto">{entry.system_prompt}</pre>
          </details>
          <details className="group">
            <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300">User prompt (model input)</summary>
            <pre className="text-xs text-slate-400 mt-1 whitespace-pre-wrap font-mono bg-terminal-dark p-2 rounded max-h-60 overflow-y-auto">{entry.user_prompt}</pre>
          </details>
          <details className="group" open>
            <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300">Raw model output</summary>
            <pre className="text-xs text-slate-300 mt-1 whitespace-pre-wrap font-mono bg-terminal-dark p-2 rounded max-h-60 overflow-y-auto">{entry.raw_response}</pre>
          </details>
        </div>
      )}
    </div>
  )
}

export function AuditLogView({ analyses }: { analyses: AIAnalysis[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const withLogs = analyses.filter(a => a.audit_log && a.audit_log.length > 0)

  return (
    <div className="card">
      <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2"><FileText size={14} /> Model Audit Logs</h3>
      <p className="text-xs text-slate-500 mb-4">Every committee input and output is recorded — exactly what each model saw and returned.</p>
      {withLogs.length === 0 ? (
        <p className="text-xs text-slate-600 py-6 text-center">No audit logs yet. Run the AI committee to generate them.</p>
      ) : (
        <div className="space-y-2">
          {withLogs.map(a => (
            <div key={a.ticker + a.analyzed_at} className="border border-terminal-border rounded-lg">
              <button onClick={() => setExpanded(expanded === a.ticker ? null : a.ticker)} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-terminal-muted">
                <div className="flex items-center gap-2">
                  {expanded === a.ticker ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
                  <span className="font-mono font-bold text-white">{a.ticker}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${a.decision === 'BUY' ? 'text-signal-green' : a.decision === 'WATCH' ? 'text-signal-amber' : 'text-signal-red'}`}>{a.decision}</span>
                </div>
                <span className="text-xs text-slate-600">{a.audit_log.length} model calls</span>
              </button>
              {expanded === a.ticker && (
                <div className="px-3 pb-3 space-y-2">
                  {a.audit_log.map((e, i) => <AuditEntryView key={i} entry={e} />)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
