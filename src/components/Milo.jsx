import { useState } from 'react';
import Icon from './Icon';

const imgFor = {
  core: '/milo/milo-core-v4.png',
  ai: '/milo/milo-ai-v4.png',
  learn: '/milo/milo-professor-v4.png',
  professor: '/milo/milo-professor-v4.png',
  goals: '/milo/milo-goals-v4.png',
  coach: '/milo/milo-goals-v4.png',
  investor: '/milo/milo-investor-v4.png',
  builder: '/milo/milo-builder-v4.png',
  scientist: '/milo/milo-scientist-v4.png',
  future: '/milo/milo-future-v4.png',
};

export const MILO_ROLES = {
  core: { name: 'Core Milo', description: 'Your everyday money companion' },
  builder: { name: 'Builder Milo', description: 'Builds a stronger monthly plan' },
  investor: { name: 'Investor Milo', description: 'Makes portfolio changes easier to understand' },
  goals: { name: 'Goals Milo', description: 'Turns targets into achievable systems' },
  scientist: { name: 'Scientist Milo', description: 'Explains what changed in your wealth' },
  future: { name: 'Future Milo', description: 'Walks through your possible futures' },
  ai: { name: 'AI Milo', description: 'Connects every part of your financial picture' },
  learn: { name: 'Professor Milo', description: 'Teaches one useful money idea at a time' },
};

export function MiloLogo({ size = 42, className = '' }) {
  return <img className={`milo-logo ${className}`} src="/milo/milo-logo-v4.png" alt="MoneyMilo" style={{ width: size, height: size }} />;
}

export function MiloAvatar({ mode = 'core', size = 64, className = '', motion = 'idle', expression = 'happy', glow = false }) {
  return (
    <span className={`milo-motion-wrap motion-${motion} expression-${expression}${glow ? ' has-glow' : ''} ${className}`} style={{ width: size, height: size }}>
      <span className="milo-motion-shadow" />
      <img className="milo-avatar" src={imgFor[mode] || imgFor.core} alt={`${MILO_ROLES[mode]?.name || 'Milo'}`} />
      <span className="milo-sparkles" aria-hidden="true"><i/><i/><i/></span>
    </span>
  );
}

export function MiloGreeting({ mode = 'core', eyebrow = 'Milo noticed', title, body, action, onAction, tone = 'lavender', className = '', motion = 'point' }) {
  return (
    <section className={`milo-greeting milo-${tone} ${className}`}>
      <div className="milo-greeting-copy">
        <div className="milo-eyebrow"><Icon name="spark" size={15}/>{eyebrow}</div>
        <h2>{title}</h2>
        {body && <p>{body}</p>}
        {action && <button className="btn btn-primary btn-sm" onClick={onAction}>{action}<Icon name="arrow" size={16}/></button>}
      </div>
      <MiloAvatar mode={mode} size={190} motion={motion} glow />
    </section>
  );
}

export function MiloCoach({
  mode = 'core', eyebrow, title, body, facts = [], action, onAction,
  secondaryAction, onSecondary, tone = 'lavender', motion = 'point', compact = false,
  className = '', children,
}) {
  const [activeFact, setActiveFact] = useState(0);
  const role = MILO_ROLES[mode] || MILO_ROLES.core;
  return (
    <section className={`milo-coach-v4 tone-${tone}${compact ? ' compact' : ''} ${className}`}>
      <div className="milo-stage-v4">
        <div className="milo-orbit-v4"><i/><i/><i/></div>
        <MiloAvatar mode={mode} size={compact ? 310 : 370} motion={motion} glow />
        <div className="milo-role-chip-v4"><strong>{role.name}</strong><span>{role.description}</span></div>
      </div>
      <div className="milo-coach-copy-v4">
        <div className="milo-eyebrow"><Icon name="spark" size={15}/>{eyebrow || `${role.name} noticed`}</div>
        <h2>{title}</h2>
        {body && <p>{body}</p>}
        {facts.length > 0 && <div className="milo-fact-tabs-v4">
          {facts.map((fact, index) => (
            <button key={`${fact.label}-${index}`} className={activeFact === index ? 'active' : ''} onClick={() => setActiveFact(index)}>
              <span>{fact.label}</span><strong>{fact.value}</strong><small>{fact.detail}</small>
            </button>
          ))}
        </div>}
        {children}
        {(action || secondaryAction) && <div className="milo-coach-actions-v4">
          {action && <button className="btn btn-primary btn-sm" onClick={onAction}>{action}<Icon name="arrow" size={16}/></button>}
          {secondaryAction && <button className="btn btn-secondary btn-sm" onClick={onSecondary}>{secondaryAction}</button>}
        </div>}
      </div>
    </section>
  );
}

export function MiloBriefing({ name = 'there', body, facts = [], action, onAction, busy = false }) {
  const greeting = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening';
  return <MiloCoach mode="core" eyebrow="Milo’s daily briefing" title={`Good ${greeting}, ${name} 👋`} body={body}
    facts={facts} action={busy ? 'Reading your numbers…' : action} onAction={onAction} motion={busy ? 'think' : 'wave'} tone="lavender" className="daily-briefing-v4" />;
}

export function PageIntro({ eyebrow, title, subtitle, action }) {
  return (
    <header className="page-intro fade-up">
      <div>
        {eyebrow && <div className="t-label">{eyebrow}</div>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function SoftMetric({ label, value, detail, tone = 'purple', icon }) {
  return (
    <div className={`soft-metric soft-${tone} metric-animate-v4`}>
      <div className="soft-metric-top">
        <span>{label}</span>
        {icon && <span className="soft-icon"><Icon name={icon} size={18}/></span>}
      </div>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}
