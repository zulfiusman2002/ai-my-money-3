import { useState, useRef, useEffect } from 'react';
import { api } from '../lib/api';
import { MiloAvatar, PageIntro } from '../components/Milo';
import Icon from '../components/Icon';

const BUTTONS = [
  ['full-review','Full financial review'],['budget','Budget analysis'],['portfolio','Investment review'],['goals','Goal check'],
  ['networth','Net worth review'],['risk','Risk review'],['savings','Savings optimisation'],['changes','What changed?'],
];

export default function Advisor(){
  const [analysis,setAnalysis]=useState(null); const [busyType,setBusyType]=useState(null);
  const [messages,setMessages]=useState([]); const [input,setInput]=useState(''); const [chatBusy,setChatBusy]=useState(false); const [err,setErr]=useState('');
  const endRef=useRef(null); useEffect(()=>endRef.current?.scrollIntoView({behavior:'smooth'}),[messages,chatBusy]);
  const run=async(type)=>{setBusyType(type);setErr('');setAnalysis(null);try{setAnalysis(await api.analyze(type));}catch(e){setErr(e.message);}finally{setBusyType(null);}};
  const send=async(e)=>{e.preventDefault();const text=input.trim();if(!text||chatBusy)return;const next=[...messages,{role:'user',content:text}];setMessages(next);setInput('');setChatBusy(true);setErr('');try{const {reply}=await api.chat(next);setMessages([...next,{role:'assistant',content:reply}]);}catch(e2){setErr(e2.message);}finally{setChatBusy(false);}};
  return <div className="page page-wide">
    <PageIntro eyebrow="Your whole financial life, one conversation" title="Ask Milo" subtitle="Milo reads the connected picture — budget, investments, property, liabilities, goals and learning — then answers in plain English." />
    <div className="advisor-layout">
      <aside className="advisor-side">
        <div className="advisor-profile"><MiloAvatar mode="ai" size={170}/><div><h2>AI Milo</h2><p>Your private money co-pilot. Educational guidance, grounded in your data.</p></div></div>
        <div className="analysis-menu">{BUTTONS.map(([type,label])=><button key={type} className={busyType===type?'active':''} disabled={!!busyType} onClick={()=>run(type)}><span>{busyType===type?'Milo is thinking…':label}</span><Icon name="chevron" size={15}/></button>)}</div>
      </aside>
      <main className="advisor-main">
        {err&&<div className="data-notice" style={{color:'var(--c-red)',background:'var(--c-red-bg)'}}>{err}</div>}
        {busyType&&<div className="advisor-answer"><div className="skeleton" style={{height:92,marginBottom:12}}/><div className="grid g2"><div className="skeleton" style={{height:110}}/><div className="skeleton" style={{height:110}}/></div></div>}
        {analysis&&!busyType&&<section className="advisor-answer fade-up">
          <div className="advisor-headline"><div className="advisor-health"><div><div className="t-label" style={{color:'rgba(255,255,255,.55)'}}>Milo’s short answer</div><h2 style={{fontSize:'1.8rem',marginTop:7}}>{analysis.headline}</h2><p>{analysis.summary}</p></div>{analysis.health_score!=null&&<div className="advisor-score">{analysis.health_score}</div>}</div></div>
          {analysis.insights?.length>0&&<><div className="t-label" style={{marginBottom:10}}>What Milo noticed</div><div className="grid g2">{analysis.insights.map((ins,i)=><div key={i} className={`insight-card ${ins.sentiment==='good'?'good':ins.sentiment==='risk'?'risk':'warn'}`}><div className="insight-title">{ins.title}</div><div className="insight-body">{ins.detail}</div></div>)}</div></>}
          {analysis.actions?.length>0&&<><div className="section-head" style={{margin:'24px 0 8px'}}><h2>Your next steps</h2></div><div className="mini-list">{analysis.actions.map((a,i)=><div className="mini-row" key={i}><div className="mini-row-main"><strong>{a.title}</strong><small>{a.detail}</small></div><span className={`badge ${a.priority==='high'?'badge-risk':a.priority==='medium'?'badge-warn':'badge-neutral'}`}>{a.priority}</span></div>)}</div></>}
          {analysis.data_gaps?.length>0&&<p className="t-small" style={{marginTop:16,color:'var(--c-amber)'}}>Milo needs: {analysis.data_gaps.join(' · ')}</p>}
          <p className="t-small" style={{marginTop:16}}>{analysis.disclaimer}</p>
        </section>}
        {!analysis&&!busyType&&<section className="milo-greeting milo-mint" style={{marginBottom:16,minHeight:190}}><div className="milo-greeting-copy"><div className="milo-eyebrow"><Icon name="spark" size={15}/>Start with a focused review</div><h2>What would you like Milo to look at?</h2><p>Choose a review on the left, or ask a specific question below. Short, focused questions usually produce the clearest answer.</p></div><MiloAvatar mode="ai" size={170}/></section>}
        <section className="chat-panel">
          <div className="t-label">Ask anything about your finances</div>
          <div style={{minHeight:130,maxHeight:430,overflowY:'auto',padding:'8px 2px'}}>
            {messages.length===0&&<div className="chips" style={{marginTop:12}}>{['Am I saving enough?','Which investment looks risky?','Can I buy a house in 3 years?','Explain my net worth simply.'].map(q=><button key={q} className="chip" onClick={()=>setInput(q)}>{q}</button>)}</div>}
            {messages.map((m,i)=><div key={i} className={`chat-msg ${m.role==='user'?'user':'ai'}`}>{m.content}</div>)}
            {chatBusy&&<div className="chat-msg ai">Milo is reading your numbers…</div>}<div ref={endRef}/>
          </div>
          <form className="chat-form" onSubmit={send}><input value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask Milo about your money…"/><button disabled={chatBusy||!input.trim()}><Icon name="arrow" size={20}/></button></form>
          <p className="t-small" style={{marginTop:9}}>Educational guidance based on your data — not regulated financial advice.</p>
        </section>
      </main>
    </div>
  </div>;
}
