import Icon from './Icon';

const imgFor = {
  core: '/milo/milo-core.png',
  ai: '/milo/milo-ai.png',
  learn: '/milo/milo-learn.png',
  goals: '/milo/milo-goals.png',
};

export function MiloAvatar({ mode = 'core', size = 64, className = '' }) {
  return <img className={`milo-avatar ${className}`} src={imgFor[mode] || imgFor.core} alt={`Milo ${mode}`} style={{ width: size, height: size }} />;
}

export function MiloGreeting({ mode = 'core', eyebrow = 'Milo noticed', title, body, action, onAction, tone = 'lavender', className = '' }) {
  return (
    <section className={`milo-greeting milo-${tone} ${className}`}>
      <div className="milo-greeting-copy">
        <div className="milo-eyebrow"><Icon name="spark" size={15}/>{eyebrow}</div>
        <h2>{title}</h2>
        {body && <p>{body}</p>}
        {action && <button className="btn btn-primary btn-sm" onClick={onAction}>{action}<Icon name="arrow" size={16}/></button>}
      </div>
      <MiloAvatar mode={mode} size={152} />
    </section>
  );
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
    <div className={`soft-metric soft-${tone}`}>
      <div className="soft-metric-top">
        <span>{label}</span>
        {icon && <span className="soft-icon"><Icon name={icon} size={18}/></span>}
      </div>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}
