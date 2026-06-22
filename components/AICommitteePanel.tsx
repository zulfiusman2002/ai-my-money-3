import { AIAnalysis } from '../lib/types'
import { ScoreBar } from './ScoreBar'
import { DecisionBadge } from './DecisionBadge'
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

interface AICommitteePanelProps {
  analysis: AIAnalysis
}

function AIPanelHeader({ name, role, color }: { name: string; role: string; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 pb-3 border-b border-terminal-border">
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      <div>
        <p className="text-xs font-bold text-white">{name}</p>
        <p className="text-xs text-slate-500">{role}</p>
      </div>
    </div>
  )
}

export function AICommitteePanel({ analysis }: AICommitteePanelProps) {
  const { gemini_output: g, gpt_output: gpt, claude_output: c } = analysis

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Gemini Panel */}
      <div className="card-sm">
        <AIPanelHeader name="Gemini" role="Market Scanner" color="#4D9EFF" />
        
        {g ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <ScoreBar score={g.momentum_score} label="Momentum" />
              <ScoreBar score={g.catalyst_score} label="Catalyst" />
              <ScoreBar score={g.liquidity_score} label="Liquidity" />
              <ScoreBar score={g.continuation_probability} label="Continuation" />
              <ScoreBar score={g.sector_strength} label="Sector" />
              <ScoreBar score={g.relative_strength} label="Rel. Strength" />
            </div>

            <div className="space-y-1 pt-2 border-t border-terminal-border">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Gap</span>
                <span className={`text-xs font-mono font-bold ${
                  g.gap_direction === 'UP' ? 'text-signal-green' : 
                  g.gap_direction === 'DOWN' ? 'text-signal-red' : 'text-slate-400'
                }`}>{g.gap_direction}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">VWAP</span>
                <span className={`text-xs font-mono font-bold ${
                  g.vwap_position === 'ABOVE' ? 'text-signal-green' : 
                  g.vwap_position === 'BELOW' ? 'text-signal-red' : 'text-slate-400'
                }`}>{g.vwap_position}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">RVOL</span>
                <span className={`text-xs font-mono font-bold ${
                  g.rvol_assessment === 'STRONG' ? 'text-signal-green' : 
                  g.rvol_assessment === 'WEAK' ? 'text-signal-red' : 'text-signal-amber'
                }`}>{g.rvol_assessment}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Unusual Vol</span>
                <span className={`text-xs font-mono font-bold ${g.unusual_volume ? 'text-signal-green' : 'text-slate-400'}`}>
                  {g.unusual_volume ? 'YES' : 'NO'}
                </span>
              </div>
            </div>

            {g.scanner_summary && (
              <p className="text-xs text-slate-400 leading-relaxed pt-1 border-t border-terminal-border">
                {g.scanner_summary}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <XCircle size={24} className="text-signal-red mx-auto mb-2" />
            <p className="text-xs text-slate-500">Gemini scan failed</p>
          </div>
        )}
      </div>

      {/* GPT Panel */}
      <div className="card-sm">
        <AIPanelHeader name="GPT-4" role="Momentum Analyst" color="#00D4FF" />
        
        {gpt ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <ScoreBar score={gpt.confidence_score} label="Confidence" />
              <ScoreBar score={Math.max(0, 100 - gpt.risk_score)} label="Quality" />
              <ScoreBar score={gpt.trend_strength} label="Trend" />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-terminal-border">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Entry</p>
                <p className="text-xs font-mono text-white">${gpt.suggested_entry?.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Stop</p>
                <p className="text-xs font-mono text-signal-red">${gpt.suggested_stop_loss?.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Target 1</p>
                <p className="text-xs font-mono text-signal-green">${gpt.suggested_target_1?.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Target 2</p>
                <p className="text-xs font-mono text-signal-green">${gpt.suggested_target_2?.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between py-1.5 px-2 rounded bg-terminal-muted">
              <span className="text-xs text-slate-400">Risk/Reward</span>
              <span className={`text-sm font-mono font-bold ${gpt.risk_reward_ratio >= 2 ? 'text-signal-green' : 'text-signal-red'}`}>
                {gpt.risk_reward_ratio?.toFixed(2)}:1
              </span>
            </div>

            <div className="space-y-2">
              <div>
                <p className="text-xs text-signal-green font-semibold mb-0.5">▲ Bull</p>
                <p className="text-xs text-slate-400">{gpt.bull_case?.slice(0, 120)}...</p>
              </div>
              <div>
                <p className="text-xs text-signal-red font-semibold mb-0.5">▼ Bear</p>
                <p className="text-xs text-slate-400">{gpt.bear_case?.slice(0, 120)}...</p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-terminal-border">
              <span className="text-xs text-slate-500">Catalyst Quality:</span>
              <span className={`text-xs font-bold ${
                gpt.catalyst_quality === 'HIGH' ? 'text-signal-green' :
                gpt.catalyst_quality === 'MEDIUM' ? 'text-signal-amber' :
                'text-signal-red'
              }`}>{gpt.catalyst_quality}</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <XCircle size={24} className="text-signal-red mx-auto mb-2" />
            <p className="text-xs text-slate-500">GPT analysis failed</p>
          </div>
        )}
      </div>

      {/* Claude Panel */}
      <div className="card-sm">
        <AIPanelHeader name="Claude" role="Risk Officer" color="#A855F7" />
        
        {c ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <DecisionBadge decision={c.decision} size="md" />
              <div className="text-right">
                <p className="text-xs text-slate-500">Confidence</p>
                <p className={`text-lg font-mono font-bold ${
                  c.final_confidence_score >= 70 ? 'text-signal-green' :
                  c.final_confidence_score >= 50 ? 'text-signal-amber' :
                  'text-signal-red'
                }`}>{c.final_confidence_score}%</p>
              </div>
            </div>

            <div className="space-y-1">
              {[
                { label: 'Move exhausted?', value: c.is_exhausted },
                { label: 'Overextended?', value: c.is_extended },
                { label: 'Weak catalyst?', value: c.catalyst_weak },
                { label: 'Volume fading?', value: c.volume_fading },
                { label: 'Poor liquidity?', value: c.poor_liquidity },
                { label: 'Hype only?', value: c.hype_only },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className={`text-xs font-mono font-bold ${value ? 'text-signal-red' : 'text-signal-green'}`}>
                    {value ? 'YES ⚠' : 'NO ✓'}
                  </span>
                </div>
              ))}
            </div>

            {c.key_risks && c.key_risks.length > 0 && (
              <div className="pt-2 border-t border-terminal-border">
                <p className="text-xs font-semibold text-signal-amber mb-1.5">Key Risks</p>
                <ul className="space-y-1">
                  {c.key_risks.slice(0, 3).map((risk, i) => (
                    <li key={i} className="text-xs text-slate-400 flex gap-1.5">
                      <span className="text-signal-red shrink-0">•</span>
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {c.rejection_reason && (
              <div className="p-2 rounded bg-signal-red bg-opacity-10 border border-signal-red border-opacity-20">
                <p className="text-xs text-signal-red font-semibold">Rejection Reason</p>
                <p className="text-xs text-slate-300 mt-0.5">{c.rejection_reason}</p>
              </div>
            )}

            {c.final_notes && (
              <p className="text-xs text-slate-400 leading-relaxed pt-1 border-t border-terminal-border">
                {c.final_notes}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <AlertTriangle size={24} className="text-signal-amber mx-auto mb-2" />
            <p className="text-xs text-slate-500">Claude review failed</p>
            <p className="text-xs text-signal-red mt-1">Auto-rejected</p>
          </div>
        )}
      </div>
    </div>
  )
}
