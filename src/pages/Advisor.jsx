import { useState, useRef, useEffect } from 'react';
import { api } from '../lib/api';
import { MiloAvatar, MiloCoach, PageIntro } from '../components/Milo';
import Icon from '../components/Icon';

const BUTTONS = [
  ['full-review','Full financial review'],['budget','Budget analysis'],['portfolio','Investment review'],['goals','Goal check'],
  ['networth','Net worth review'],['risk','Risk review'],['savings','Savings optimisation'],['changes','What changed?'],
];
const CHAT_KEY = 'moneymilo_advisor_chat_v1';

function RichAnswer({ text = '' }) {
  const lines = String(text).split(/\n+/).map((x) => x.trim()).filter(Boolean);
  if (!lines.length) return null;
  const blocks = [];
  let bullets = [];
  const flush = () => { if (bullets.length) { blocks.push(<ul key={`list-${blocks.length}`}>{bullets.map((x,i)=><li key={i}>{x}</li>)}</ul>); bullets = []; } };
  lines.forEach((line) => {
    if (/^[-•*]\s+/.test(line)) { bullets.push(line.replace(/^[-•*]\s+/,'')); return; }
    flush();
    if (/^#{1,3}\s+/.test(line) || (/^[A-Z][^.!?]{2,45}:$/.test(line))) blocks.push(<h4 key={blocks.length}>{line.replace(/^#{1,3}\s+/,'').replace(/:$/,'')}</h4>);
    else blocks.push(<p key={blocks.length}>{line}</p>);
  });
  flush();
  return <div className="rich-answer-v1">{blocks}</div>;
}

export default function Advisor(){
  const [analysis,setAnalysis]=useState(null);
  const [busyType,setBusyType]=useState(null);
  const [messages,setMessages]=useState(()=>{ try { return JSON.parse(sessionStorage.getItem(CHAT_KEY) || '[]'); } catch { return []; } });
  const [input,setInput]=useState('');
  const [chatBusy,setChatBusy]=useState(false);
  const [err,setErr]=useState('');
  const endRef=useRef(null);
  useEffect(()=>endRef.current?.scrollIntoView({behavior:'smooth'}),[messages,chatBusy]);
  useEffect(()=>sessionStorage.setItem(CHAT_KEY, JSON.stringify(messages.slice(-12))),[messages]);

  const run=async(type)=>{
    setBusyType(type); setErr(''); setAnalysis(null);
    try{ setAnalysis(await api.analyze(type)); }
    catch(e){ setErr(e.message); }
    finally{ setBusyType(null); }
  };
  const send=async(e)=>{
    e.preventDefault();
    const text=input.trim();
    if(!text||chatBusy)return;
    const next=[...messages,{role:'user',content:text}].slice(-10);
    setMessages(next); setInput(''); setChatBusy(true); setErr('');
    try{ const {reply}=await api.chat(next); setMessages([...next,{role:'assistant',content:reply}]); }
    catch(e2){setErr(e2.message);}
    finally{setChatBusy(false);}
  };
  const clearChat=()=>{ setMessages([]); sessionStorage.removeItem(CHAT_KEY); };

  return <div className="page page-wide advisor-v1">
    <PageIntro eyebrow="Your whole financial life, one conversation" title="Ask Milo" subtitle="Milo reads the connected picture — budget, investments, property, liabilities, goals and learning — then answers in plain English." />
    <MiloCoach mode="ai" eyebrow="AI Milo · connected intelligence"
      title="Ask one question. Milo checks the whole picture."
      body="Budget, goals, investments, property, liabilities and learning can all change the answer. Milo brings those modules together and shows the assumptions behind the response."
      facts={[
        {label:'Budget',value:'Connected',detail:'Income, spending and savings'},
        {label:'Wealth',value:'Connected',detail:'Investments, assets and debt'},
        {label:'Goals',value:'Connected',detail:'Targets, timing and headroom'},
      ]}
      action="Start a full review" onAction={() => run('full-review')} motion={busyType || chatBusy ? 'think' : 'wave'} tone="ai" compact />

    <div className="advisor-trust-strip-v1"><span><Icon name="check" size={15}/>Uses your recorded MoneyMilo data</span><span><Icon name="spark" size={15}/>Explains uncertainty and missing data</span><span><Icon name="worth" size={15}/>Educational guidance, not regulated advice</span></div>

    <div className="advisor-layout">
      <aside className="advisor-side">
        <div className="advisor-profile"><MiloAvatar mode="ai" size={190} motion="idle" glow/><div><h2>AI Milo</h2><p>Your private money co-pilot, grounded in the information you choose to track.</p></div></div>
        <div className="analysis-menu">{BUTTONS.map(([type,label])=><button key={type} className={busyType===type?'active':''} disabled={!!busyType} onClick={()=>run(type)}><span>{busyType===type?'Milo is thinking…':label}</span><Icon name="chevron" size={15}/></button>)}</div>
      </aside>
      <main className="advisor-main">
        {err&&<div className="data-notice error-notice">{err}</div>}
        {busyType&&<div className="advisor-answer"><div className="skeleton" style={{height:92,marginBottom:12}}/><div className="grid g2"><div className="skeleton" style={{height:110}}/><div className="skeleton" style={{height:110}}/></div></div>}
        {analysis&&!busyType&&<section className="advisor-answer fade-up">
          <div className="advisor-headline"><div className="advisor-health"><div><div className="t-label advisor-light-label">Milo’s short answer</div><h2>{analysis.headline}</h2><p>{analysis.summary}</p></div>{analysis.health_score!=null&&<div className="advisor-score"><strong>{analysis.health_score}</strong><small>/100</small></div>}</div></div>
          {analysis.insights?.length>0&&<><div className="t-label advisor-section-label">What Milo noticed</div><div className="grid g2">{analysis.insights.map((ins,i)=><div key={i} className={`insight-card ${ins.sentiment==='good'?'good':ins.sentiment==='risk'?'risk':'warn'}`}><div className="insight-title">{ins.title}</div><div className="insight-body">{ins.detail}</div></div>)}</div></>}
          {analysis.actions?.length>0&&<><div className="section-head advisor-action-head"><h2>Your next steps</h2></div><div className="mini-list">{analysis.actions.map((a,i)=><div className="mini-row" key={i}><div className="mini-step-number">{i+1}</div><div className="mini-row-main"><strong>{a.title}</strong><small>{a.detail}</small></div><span className={`badge ${a.priority==='high'?'badge-risk':a.priority==='medium'?'badge-warn':'badge-neutral'}`}>{a.priority}</span></div>)}</div></>}
          {analysis.data_gaps?.length>0&&<div className="advisor-gaps-v1"><strong>What would make this answer stronger</strong><span>{analysis.data_gaps.join(' · ')}</span></div>}
          <p className="t-small advisor-disclaimer">{analysis.disclaimer || 'Educational guidance based on the information currently recorded in MoneyMilo.'}</p>
        </section>}
        {!analysis&&!busyType&&<section className="milo-greeting milo-mint advisor-empty-v1"><div className="milo-greeting-copy"><div className="milo-eyebrow"><Icon name="spark" size={15}/>Start with a focused review</div><h2>What would you like Milo to look at?</h2><p>Choose a review on the left, or ask a specific question below. Milo will use the connected modules and identify missing information rather than guessing.</p></div><MiloAvatar mode="ai" size={210} motion="wave" glow/></section>}
        <section className="chat-panel chat-panel-v1">
          <div className="chat-panel-head-v1"><div><div className="t-label">Ask anything about your finances</div><p>Try a decision, comparison or explanation.</p></div>{messages.length>0&&<button className="chip" onClick={clearChat}>Clear chat</button>}</div>
          <div className="chat-scroll-v1">
            {messages.length===0&&<div className="advisor-prompts-v1">{['Am I saving enough for my goals?','What is driving my net-worth change?','Can I afford a £600 monthly car?','Which part of my portfolio is concentrated?','Explain my finances like I am a beginner.'].map(q=><button key={q} onClick={()=>setInput(q)}><Icon name="spark" size={14}/>{q}</button>)}</div>}
            {messages.map((m,i)=><div key={i} className={`chat-msg ${m.role==='user'?'user':'ai'}`}>{m.role==='assistant'?<RichAnswer text={m.content}/>:m.content}</div>)}
            {chatBusy&&<div className="chat-msg ai chat-thinking-v1"><MiloAvatar mode="ai" size={46} motion="think"/>Milo is reading your connected numbers…</div>}<div ref={endRef}/>
          </div>
          <form className="chat-form" onSubmit={send}><input value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask Milo about a goal, purchase or money decision…"/><button aria-label="Send question" disabled={chatBusy||!input.trim()}><Icon name="arrow" size={20}/></button></form>
          <p className="t-small chat-disclaimer-v1">Educational guidance based on your data — not regulated financial advice.</p>
        </section>
      </main>
    </div>
  </div>;
}
