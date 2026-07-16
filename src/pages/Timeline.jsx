import { useNavigate } from 'react-router-dom';
import { useBrain } from '../context/BrainContext';
import { MiloCoach, PageIntro } from '../components/Milo';
import Icon from '../components/Icon';

const icons = { snapshot: 'worth', lesson: 'learn', analysis: 'advisor' };
const day = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function Timeline() {
  const nav = useNavigate();
  const { brain, timeline, loading, error, refresh } = useBrain();
  return <div className="page page-wide timeline-v2-page">
    <PageIntro eyebrow="Your connected financial history" title="Money Timeline" subtitle="See how monthly cash flow, wealth snapshots, learning and Milo reviews connect over time." />
    <MiloCoach mode="scientist" eyebrow="Scientist Milo · financial memory"
      title={brain ? `Your current Money Pulse is ${brain.score}/100.` : 'Milo is connecting your financial history.'}
      body={brain?.briefing?.summary || 'Each event links back to the module that created it, so you can understand what changed and what happened next.'}
      facts={brain ? [
        { label:'Cash flow', value: brain.monthly.surplus >= 0 ? 'Positive' : 'Negative', detail:'Latest recorded month' },
        { label:'Goals behind', value:String(brain.goals.behind), detail:'Deadline-based targets' },
        { label:'Data confidence', value:`${brain.dataConfidence}%`, detail:'How complete the connected picture is' },
      ] : []}
      action="Refresh timeline" onAction={() => refresh()} motion={loading ? 'think' : 'point'} tone="scientist" compact />

    {error && <div className="data-notice error-notice"><Icon name="alert" size={16}/><span>{error}</span><button className="btn btn-secondary btn-sm" onClick={()=>refresh()}>Retry</button></div>}
    <section className="timeline-v2-card">
      <div className="timeline-v2-head"><div><span className="t-label">Latest first</span><h2>Your financial story</h2></div><span>{timeline.length} connected events</span></div>
      {loading && !timeline.length ? <div className="timeline-v2-loading">{[1,2,3,4].map((x)=><div className="skeleton" key={x} style={{height:96}}/>)}</div> :
        <div className="timeline-v2-list">
          {timeline.map((event, index) => <button className={`timeline-v2-item tone-${event.tone || 'info'}`} key={event.id || index} onClick={()=>nav(event.route || '/app')}>
            <span className="timeline-v2-rail"><i/><b/></span>
            <span className="timeline-v2-icon"><Icon name={icons[event.type] || 'spark'} size={19}/></span>
            <span className="timeline-v2-copy"><small>{day(event.date)}</small><strong>{event.title}</strong><p>{event.detail}</p></span>
            <Icon name="chevron" size={17}/>
          </button>)}
          {!timeline.length && <div className="empty-state"><div className="empty-title">Your timeline will build as you use MoneyMilo</div><div className="empty-body">Complete a lesson, run a Milo review or create a monthly snapshot.</div></div>}
        </div>}
    </section>
  </div>;
}
