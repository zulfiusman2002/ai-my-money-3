import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import { MiloAvatar, MiloLogo } from '../components/Milo';

const featureRows = [
  ['budget','Budget','Income, expenses and monthly surplus'],
  ['invest','Investments','Broker portfolios and wider wealth'],
  ['goals','Goals','Targets, timelines and monthly actions'],
  ['worth','Net worth','Assets minus every tracked liability'],
  ['project','Projector','See how today changes your future'],
  ['learn','Learn','Daily lessons chosen from your patterns'],
];

export default function Landing(){
  return <div className="landing-v21">
    <nav className="landing-nav-v21">
      <Link to="/" className="landing-brand-v21"><MiloLogo size={48}/><span>Money<strong>Milo</strong><small>Financial companion</small></span></Link>
      <div><Link to="/login" className="btn btn-secondary btn-sm">Sign in</Link><Link to="/signup" className="btn btn-primary btn-sm">Meet Milo</Link></div>
    </nav>

    <main>
      <section className="landing-hero-v21">
        <div className="landing-hero-copy-v21">
          <div className="milo-eyebrow"><Icon name="spark" size={16}/>One financial brain. One friendly guide.</div>
          <h1>Your money,<br/><span>finally connected.</span></h1>
          <p>MoneyMilo brings your budget, investments, property, goals, net worth and learning into one intelligent financial picture — then explains what matters next.</p>
          <div className="landing-hero-actions-v21"><Link to="/signup" className="btn btn-primary">Build my money picture <Icon name="arrow" size={17}/></Link><Link to="/login" className="btn btn-secondary">Open MoneyMilo</Link></div>
          <div className="landing-trust-v21"><span><Icon name="shield" size={16}/>Private by design</span><span><Icon name="spark" size={16}/>AI grounded in your data</span><span><Icon name="learn" size={16}/>Learning that adapts</span></div>
        </div>

        <div className="landing-hero-stage-v21">
          <div className="landing-orbit-v21"><i/><i/><i/></div>
          <MiloAvatar mode="core" size={520} motion="wave" glow/>
          <article className="landing-float-card-v21 pulse"><span>Money Pulse</span><strong>82<small>/100</small></strong><p>Strong monthly margin</p></article>
          <article className="landing-float-card-v21 ask"><span>Ask Milo</span><strong>Can I afford it?</strong><p>See the impact on every goal.</p></article>
          <article className="landing-float-card-v21 learn"><span>Today’s lesson</span><strong>Systems beat motivation</strong><p>Professor Milo · 4 min</p></article>
        </div>
      </section>

      <section className="landing-intro-v21">
        <span className="t-label">Not another budgeting app</span>
        <h2>MoneyMilo turns separate money tools into one operating system.</h2>
        <p>Change one number and the rest of the product understands the impact — from monthly cash flow to goals, future wealth, Milo’s briefing and the lesson Professor Milo chooses next.</p>
      </section>

      <section className="landing-os-v21">
        <div className="landing-os-copy-v21">
          <span className="t-label">MoneyMilo OS</span>
          <h2>Every module talks to every other module.</h2>
          <p>A salary change should not live on a budget screen. It should update your monthly headroom, goal timing, projector, Money Pulse and Milo’s next recommendation automatically.</p>
          <div className="landing-os-points-v21"><span><b>01</b>Understand the complete picture</span><span><b>02</b>Explain the trade-offs visually</span><span><b>03</b>Teach the next useful concept</span></div>
        </div>
        <div className="landing-brain-v21">
          <div className="landing-brain-center-v21"><MiloLogo size={88}/><strong>One financial brain</strong><span>Connected Intelligence</span></div>
          {featureRows.map(([icon,title,body],index)=><article key={title} style={{'--node-index':index}}><span><Icon name={icon} size={18}/></span><div><strong>{title}</strong><small>{body}</small></div></article>)}
        </div>
      </section>

      <section className="landing-team-v21">
        <header><span className="t-label">One Milo. Different expertise.</span><h2>A financial companion that teaches, explains and plans with you.</h2></header>
        <div className="landing-team-grid-v21">
          <article><div><MiloAvatar mode="ai" size={245} motion="think" glow/></div><span>AI Milo</span><h3>Answers that look like a product, not a chatbot.</h3><p>Verdicts, exact figures, goal impact, visual summaries and practical next actions.</p></article>
          <article className="featured"><div><MiloAvatar mode="learn" size={265} motion="point" glow/></div><span>Professor Milo</span><h3>Daily money lessons chosen for your real life.</h3><p>Short concepts, personal examples, quizzes, XP, streaks and one action to use today.</p></article>
          <article><div><MiloAvatar mode="future" size={245} motion="float" glow/></div><span>Future Milo</span><h3>See how today’s choices reshape tomorrow.</h3><p>Test contributions, returns, inflation and goals without pretending the future is certain.</p></article>
        </div>
      </section>

      <section className="landing-cta-v21">
        <div><span className="t-label">Start with what you know</span><h2>Give Milo five minutes. Get one clear financial picture.</h2><p>Use rough estimates first. Everything remains editable as your information improves.</p></div>
        <Link to="/signup" className="btn btn-primary btn-lg">Meet MoneyMilo <Icon name="arrow" size={18}/></Link>
      </section>
    </main>

    <footer className="landing-footer-v21"><div className="landing-brand-v21"><MiloLogo size={42}/><span>Money<strong>Milo</strong></span></div><p>Educational guidance · Not regulated financial advice · Your data stays yours</p><span>MoneyMilo 2.1</span></footer>
  </div>;
}
