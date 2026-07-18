import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { MiloAvatar } from './Milo';
import { decodeMiloAnswer, answerToPlainText } from '../../shared/miloAnswerFormat';

const toneIcon = {
  positive: 'check',
  caution: 'spark',
  risk: 'alert',
  neutral: 'worth',
};

function inlineParts(value = '') {
  const text = String(value);
  const pieces = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g).filter(Boolean);
  return pieces.map((piece, index) => {
    if (piece.startsWith('**') && piece.endsWith('**')) return <strong key={index}>{piece.slice(2, -2)}</strong>;
    if (piece.startsWith('`') && piece.endsWith('`')) return <code key={index}>{piece.slice(1, -1)}</code>;
    if (piece.startsWith('*') && piece.endsWith('*')) return <em key={index}>{piece.slice(1, -1)}</em>;
    return <span key={index}>{piece}</span>;
  });
}

function MarkdownFallback({ text = '' }) {
  const rows = useMemo(() => String(text).split('\n'), [text]);
  const output = [];
  let bullets = [];
  let table = [];

  const flushBullets = () => {
    if (!bullets.length) return;
    output.push(<ul key={`list-${output.length}`}>{bullets.map((item, i) => <li key={i}>{inlineParts(item)}</li>)}</ul>);
    bullets = [];
  };
  const flushTable = () => {
    if (table.length < 2) { table = []; return; }
    const clean = table.filter((row) => !row.every((cell) => /^:?-{2,}:?$/.test(cell)));
    if (clean.length < 2) { table = []; return; }
    const [head, ...body] = clean;
    output.push(<div className="milo-fallback-table-wrap" key={`table-${output.length}`}><table className="milo-fallback-table"><thead><tr>{head.map((cell, i) => <th key={i}>{inlineParts(cell)}</th>)}</tr></thead><tbody>{body.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{inlineParts(cell)}</td>)}</tr>)}</tbody></table></div>);
    table = [];
  };

  rows.forEach((raw) => {
    const line = raw.trim();
    if (!line) { flushBullets(); flushTable(); return; }
    if (line.includes('|')) {
      flushBullets();
      table.push(line.replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim()));
      return;
    }
    flushTable();
    if (/^[-•*]\s+/.test(line)) { bullets.push(line.replace(/^[-•*]\s+/, '')); return; }
    flushBullets();
    if (/^#{1,4}\s+/.test(line)) output.push(<h4 key={output.length}>{inlineParts(line.replace(/^#{1,4}\s+/, ''))}</h4>);
    else if (/^\d+[.)]\s+/.test(line)) output.push(<div className="milo-fallback-step" key={output.length}>{inlineParts(line)}</div>);
    else output.push(<p key={output.length}>{inlineParts(line)}</p>);
  });
  flushBullets(); flushTable();
  return <div className="milo-fallback-copy">{output}</div>;
}

function ToneBadge({ tone = 'neutral', children }) {
  return <span className={`milo-tone-badge tone-${tone}`}><Icon name={toneIcon[tone] || 'spark'} size={13}/>{children}</span>;
}

function DecisionVisual({ formatted, verdict }) {
  const explicit = formatted.visual && formatted.visual.kind !== 'none' ? formatted.visual : null;
  const metrics = formatted.metrics || [];
  if (!explicit && !metrics.length) return null;
  const visual = explicit || {
    kind: formatted.answer_type === 'decision' ? 'affordability' : 'score',
    eyebrow: 'Milo visual summary',
    headline: formatted.title,
    primary_label: metrics[0]?.label || verdict.label,
    primary_value: metrics[0]?.value || verdict.label,
    secondary_label: metrics[1]?.label || 'Confidence',
    secondary_value: metrics[1]?.value || formatted.confidence,
    progress_pct: null,
    note: metrics[0]?.detail || verdict.detail,
  };
  const progress = visual.progress_pct == null ? null : Math.max(0, Math.min(100, Number(visual.progress_pct)));
  return <section className={`milo-decision-visual-v21 visual-${visual.kind || 'score'} tone-${verdict.tone || 'neutral'}`}>
    <div className="milo-decision-copy-v21">
      <span>{visual.eyebrow || 'Milo visual summary'}</span>
      <h4>{visual.headline || formatted.title}</h4>
      {visual.note && <p>{inlineParts(visual.note)}</p>}
      <div className="milo-decision-values-v21">
        <article><small>{visual.primary_label || 'Main figure'}</small><strong>{visual.primary_value || '—'}</strong></article>
        <article><small>{visual.secondary_label || 'Impact'}</small><strong>{visual.secondary_value || '—'}</strong></article>
      </div>
    </div>
    <div className="milo-decision-gauge-v21">
      {progress != null ? <div className="milo-decision-ring-v21" style={{'--decision-progress': `${progress * 3.6}deg`}}><strong>{Math.round(progress)}%</strong><span>{visual.kind === 'goal' ? 'progress' : visual.kind === 'affordability' ? 'fit' : 'signal'}</span></div> : <div className="milo-decision-icon-v21"><Icon name={toneIcon[verdict.tone] || 'spark'} size={34}/><span>{verdict.label}</span></div>}
    </div>
  </section>;
}

const moduleRoutes = { budget:'/app/budget', goals:'/app/goals', investments:'/app/investments', networth:'/app/networth', projector:'/app/projector', learn:'/app/learn', timeline:'/app/timeline' };

export default function MiloAnswer({ answer, onFollowUp }) {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const decoded = useMemo(() => decodeMiloAnswer(answer), [answer]);
  if (!decoded.structured) return <div className="milo-answer-fallback"><MarkdownFallback text={decoded.raw || ''}/></div>;
  const formatted = decoded.answer;
  const verdict = formatted.verdict || { label: 'Explained', tone: 'neutral', detail: '' };
  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(answerToPlainText(formatted));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { /* Clipboard can be unavailable in some embedded browsers. */ }
  };

  return <article className="milo-answer-v11 fade-up">
    <header className="milo-answer-hero-v11">
      <div className="milo-answer-avatar-v11"><MiloAvatar mode="ai" size={92} motion="idle" glow/></div>
      <div className="milo-answer-heading-v11">
        <div className="milo-answer-kicker-v11"><span>AI Milo</span><span>·</span><span>{formatted.answer_type || 'answer'}</span></div>
        <h3>{formatted.title || "Milo's answer"}</h3>
        <p>{inlineParts(formatted.direct_answer || '')}</p>
      </div>
      <div className="milo-answer-tools-v11">
        <ToneBadge tone={verdict.tone}>{verdict.label}</ToneBadge>
        <button type="button" className="milo-copy-answer-v11" onClick={doCopy}><Icon name={copied ? 'check' : 'copy'} size={14}/>{copied ? 'Copied' : 'Copy'}</button>
      </div>
    </header>

    {formatted.format_status === 'partial' && <div className="milo-format-warning-v11"><Icon name="alert" size={16}/><div><strong>Milo recovered this answer</strong><span>The AI response was interrupted while formatting. The complete figures that were returned are shown below; resend the question for the full detail.</span></div></div>}

    {verdict.detail && <div className={`milo-verdict-v11 tone-${verdict.tone}`}><Icon name={toneIcon[verdict.tone] || 'spark'} size={17}/><span>{inlineParts(verdict.detail)}</span></div>}

    <DecisionVisual formatted={formatted} verdict={verdict}/>

    {formatted.metrics?.length > 0 && <section className="milo-answer-section-v11">
      <div className="milo-answer-section-head-v11"><span>Numbers Milo used</span><small>From your recorded MoneyMilo data</small></div>
      <div className="milo-metric-grid-v11">{formatted.metrics.map((metric, index) => <article key={`${metric.label}-${index}`} className={`milo-metric-card-v11 tone-${metric.tone || 'neutral'}`}>
        <span>{metric.label}</span><strong>{metric.value}</strong>{metric.detail && <small>{metric.detail}</small>}
      </article>)}</div>
    </section>}

    {formatted.goal_impacts?.length > 0 && <section className="milo-answer-section-v11">
      <div className="milo-answer-section-head-v11"><span>Impact on your goals</span><small>How this decision connects to your plan</small></div>
      <div className="milo-goal-impact-grid-v11">{formatted.goal_impacts.map((goal, index) => <article key={`${goal.goal}-${index}`} className={`milo-goal-impact-v11 tone-${goal.tone || 'neutral'}`}>
        <div><Icon name="goals" size={17}/><strong>{goal.goal}</strong></div><span>{goal.impact}</span>{goal.detail && <p>{inlineParts(goal.detail)}</p>}
      </article>)}</div>
    </section>}

    {formatted.sections?.length > 0 && <section className="milo-answer-section-v11">
      <div className="milo-answer-section-head-v11"><span>Milo's explanation</span><small>Clear reasoning without the wall of text</small></div>
      <div className="milo-explanation-grid-v11">{formatted.sections.map((section, index) => <article key={`${section.title}-${index}`}>
        <div className="milo-section-index-v11">{String(index + 1).padStart(2, '0')}</div><div><h4>{section.title}</h4>{section.body && <p>{inlineParts(section.body)}</p>}{section.bullets?.length > 0 && <ul>{section.bullets.map((bullet, i) => <li key={i}>{inlineParts(bullet)}</li>)}</ul>}</div>
      </article>)}</div>
    </section>}

    {formatted.actions?.length > 0 && <section className="milo-answer-section-v11">
      <div className="milo-answer-section-head-v11"><span>Your next steps</span><small>Prioritised actions, not generic advice</small></div>
      <div className="milo-action-list-v11">{formatted.actions.map((action, index) => <article key={`${action.title}-${index}`}>
        <div className="milo-action-number-v11">{index + 1}</div><div><strong>{action.title}</strong><p>{inlineParts(action.detail)}</p><div className="milo-action-buttons-v2">{moduleRoutes[action.module] && <button type="button" onClick={()=>navigate(moduleRoutes[action.module])}>Open {action.module === 'networth' ? 'net worth' : action.module}<Icon name="chevron" size={13}/></button>}{action.question && <button type="button" onClick={()=>onFollowUp?.(action.question)}><Icon name="spark" size={13}/>Ask Milo to show impact</button>}</div></div><span className={`milo-priority-v11 priority-${action.priority || 'low'}`}>{action.priority || 'low'}</span>
      </article>)}</div>
    </section>}

    {(formatted.assumptions?.length > 0 || formatted.data_gaps?.length > 0) && <details className="milo-evidence-v11">
      <summary><span><Icon name="info" size={15}/>Assumptions and missing information</span><Icon name="chevron" size={14}/></summary>
      <div>{formatted.assumptions?.length > 0 && <section><strong>Assumptions</strong><ul>{formatted.assumptions.map((item, i) => <li key={i}>{inlineParts(item)}</li>)}</ul></section>}{formatted.data_gaps?.length > 0 && <section><strong>What would make this answer stronger</strong><ul>{formatted.data_gaps.map((item, i) => <li key={i}>{inlineParts(item)}</li>)}</ul></section>}</div>
    </details>}

    {formatted.follow_ups?.length > 0 && <section className="milo-followups-v11"><span>Continue with Milo</span><div>{formatted.follow_ups.map((question) => <button type="button" key={question} onClick={() => onFollowUp?.(question)}><Icon name="spark" size={13}/>{question}</button>)}</div></section>}

    <footer className="milo-answer-footer-v11"><span>Confidence: <strong>{formatted.confidence || 'medium'}</strong></span><p>{formatted.disclaimer || 'Educational guidance based on your data — not regulated financial advice.'}</p></footer>
  </article>;
}
