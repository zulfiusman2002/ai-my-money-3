import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import { MiloLogo } from '../components/Milo';

const Feature = ({ icon, title, body, tone }) => (
  <div className={`soft-metric soft-${tone}`} style={{minHeight:170}}>
    <div className="soft-icon"><Icon name={icon}/></div>
    <strong style={{fontSize:'1.12rem',letterSpacing:'-.02em'}}>{title}</strong>
    <small style={{fontSize:'.82rem',lineHeight:1.55}}>{body}</small>
  </div>
);

export default function Landing(){
  return <div style={{minHeight:'100dvh',background:'radial-gradient(circle at 10% 0%,rgba(126,92,255,.16),transparent 28%),radial-gradient(circle at 92% 8%,rgba(79,211,190,.14),transparent 26%),#F8F8FD'}}>
    <nav style={{height:72,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 clamp(18px,5vw,64px)',position:'sticky',top:0,zIndex:20,background:'rgba(255,255,255,.78)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(100,85,160,.1)'}}>
      <div className="brand"><MiloLogo size={40}/><span className="brand-word">Money<span>Milo</span></span></div>
      <div style={{display:'flex',gap:9}}><Link to="/login" className="btn btn-secondary btn-sm">Sign in</Link><Link to="/signup" className="btn btn-primary btn-sm">Get started</Link></div>
    </nav>
    <section style={{maxWidth:1480,margin:'0 auto',padding:'clamp(52px,8vw,96px) 24px 60px',display:'grid',gridTemplateColumns:'minmax(0,1.08fr) minmax(300px,.92fr)',alignItems:'center',gap:36}} className="landing-hero">
      <div>
        <div className="milo-eyebrow"><Icon name="spark" size={16}/>Meet your smart money companion</div>
        <h1 className="t-hero" style={{marginTop:16}}>Smarter money.<br/><span style={{background:'var(--grad-brand)',WebkitBackgroundClip:'text',color:'transparent'}}>Stronger future.</span></h1>
        <p style={{fontSize:'clamp(1rem,2vw,1.2rem)',color:'var(--c-ink2)',maxWidth:630,margin:'20px 0 30px',lineHeight:1.7}}>Track your budget, investments, property, gold, goals and net worth. Then let Milo turn the complete picture into personalised insights and daily lessons.</p>
        <div style={{display:'flex',gap:12,flexWrap:'wrap'}}><Link to="/signup" className="btn btn-primary">Start with Milo <Icon name="arrow" size={17}/></Link><Link to="/login" className="btn btn-secondary">Open demo</Link></div>
        <div style={{display:'flex',gap:24,flexWrap:'wrap',marginTop:28}}>{[['shield','Private by design'],['spark','AI-powered guidance'],['learn','Lessons that stick']].map(([i,t])=><span key={t} style={{display:'flex',alignItems:'center',gap:7,fontSize:'.78rem',fontWeight:650,color:'var(--c-muted)'}}><Icon name={i} size={17}/>{t}</span>)}</div>
      </div>
      <div style={{position:'relative',minHeight:520,display:'grid',placeItems:'center'}}>
        <div style={{position:'absolute',width:'88%',height:'88%',borderRadius:'50%',background:'radial-gradient(circle,#EEE8FF 0%,rgba(235,245,255,.72) 44%,transparent 70%)'}}/>
        <img src="/milo/milo-core.png" alt="Milo, your money companion" style={{width:'min(430px,95%)',height:520,objectFit:'contain',position:'relative',filter:'drop-shadow(0 28px 30px rgba(62,43,115,.17))'}}/>
      </div>
    </section>
    <section style={{maxWidth:1480,margin:'0 auto',padding:'0 24px 72px'}}>
      <div className="grid g4"><Feature icon="advisor" title="Ask Milo" body="Clear answers grounded in your real budget, assets, liabilities and goals." tone="purple"/><Feature icon="invest" title="See wealth clearly" body="Broker investments and real-world assets in one connected view." tone="mint"/><Feature icon="goals" title="Goals that adapt" body="Track progress, test scenarios and know exactly what monthly action is needed." tone="peach"/><Feature icon="learn" title="Learn with Milo" body="Duolingo-style lessons connected to your spending and investment patterns." tone="blue"/></div>
    </section>
    <section style={{maxWidth:1400,margin:'0 auto 80px',padding:'34px',borderRadius:30,background:'linear-gradient(135deg,#171724,#2D2740)',color:'white',display:'flex',alignItems:'center',justifyContent:'space-between',gap:20,flexWrap:'wrap'}}>
      <div><div className="t-label" style={{color:'rgba(255,255,255,.55)'}}>Not another budgeting app</div><h2 style={{fontSize:'clamp(1.7rem,4vw,2.6rem)',marginTop:7}}>Your whole financial life, connected.</h2></div><Link to="/signup" className="btn btn-gold">Build my money picture <Icon name="arrow" size={17}/></Link>
    </section>
    <footer style={{padding:'24px',textAlign:'center',fontSize:'.72rem',color:'var(--c-muted)'}}>Educational guidance · Not regulated financial advice · Your data stays yours</footer>
    <style>{`@media(max-width:780px){.landing-hero{grid-template-columns:1fr!important;text-align:center}.landing-hero .milo-eyebrow,.landing-hero>div:first-child>div{justify-content:center}.landing-hero>div:last-child{min-height:360px!important}.landing-hero>div:last-child img{height:380px!important}}`}</style>
  </div>;
}
