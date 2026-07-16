import { useState, useRef, useEffect } from 'react';
import { api } from '../lib/api';
import { MiloAvatar, MiloCoach, PageIntro } from '../components/Milo';
import MiloAnswer from '../components/MiloAnswer';
import { useBrain } from '../context/BrainContext';
import Icon from '../components/Icon';
import { answerToPlainText } from '../../shared/miloAnswerFormat';

const BUTTONS = [
  ['full-review','Full financial review'],['budget','Budget analysis'],['portfolio','Investment review'],['goals','Goal check'],
  ['networth','Net worth review'],['risk','Risk review'],['savings','Savings optimisation'],['changes','What changed?'],
];
const CHAT_KEY = 'moneymilo_advisor_chat_v11';

function answerToContext(answer) {
  return answerToPlainText(answer);
}

function ConfidencePill({ value = 'medium' }) {
  return <span className={`advisor-confidence-v11 confidence-${value}`}><span/>Confidence: {value}</span>;
}

export default function Advisor(){
  const { brain } = useBrain();
  const [analysis,setAnalysis]=useState(null);
  const [busyType,setBusyType]=useState(null);
  const [messages,setMessages]=useState(()=>{ try { return JSON.parse(sessionStorage.getItem(CHAT_KEY) || '[]'); } catch { return []; } });
  const [input,setInput]=useState('');
  const [chatBusy,setChatBusy]=useState(false);
  const [err,setErr]=useState('');
  const endRef=useRef(null);
  const textRef=useRef(null);

  useEffect(()=>endRef.current?.scrollIntoView({behavior:'smooth',block:'nearest'}),[messages,chatBusy]);
  useEffect(()=>sessionStorage.setItem(CHAT_KEY, JSON.stringify(messages.slice(-12))),[messages]);
  useEffect(()=>{
    const el=textRef.current;
    if(!el)return;
    el.style.height='auto';
    el.style.height=`${Math.min(150,Math.max(48,el.scrollHeight))}px`;
  },[input]);

  const run=async(type)=>{
    setBusyType(type); setErr(''); setAnalysis(null);
    try{ setAnalysis(await api.analyze(type)); }
    catch(e){ setErr(e.message); }
    finally{ setBusyType(null); }
  };

  const send=async(e)=>{
    e?.preventDefault?.();
    const text=input.trim();
    if(!text||chatBusy)return;
    const next=[...messages,{role:'user',content:text}].slice(-10);
    setMessages(next); setInput(''); setChatBusy(true); setErr('');
    const apiMessages=next.map((message)=>({role:message.role,content:answerToContext(message.content)}));
    try{
      const {reply}=await api.chat(apiMessages);
      setMessages([...next,{role:'assistant',content:reply}]);
    }
    catch(e2){setErr(e2.message);}
    finally{setChatBusy(false);}
  };

  const clearChat=()=>{ setMessages([]); sessionStorage.removeItem(CHAT_KEY); };
  const usePrompt=(question)=>{ setInput(question); window.setTimeout(()=>textRef.current?.focus(),30); };
  const keyDown=(event)=>{
    if(event.key==='Enter'&&!event.shiftKey){ event.preventDefault(); send(event); }
  };

  return <div className="page page-wide advisor-v1 advisor-v11">
    <PageIntro eyebrow="Your whole financial life, one conversation" title="Ask Milo" subtitle="Ask a question and get a clear answer, the exact numbers used, the impact on your goals and practical next steps." />
    <MiloCoach mode="ai" eyebrow="AI Milo · connected intelligence"
      title="A financial answer you can actually understand."
      body="Milo checks your budget, goals, investments, assets and liabilities, then organises the answer into a verdict, evidence, impact and actions — without the wall of text."
      facts={[
        {label:'Money Pulse',value:brain ? `${brain.score}/100` : 'Connected',detail:brain?.scoreLabel || 'Whole-picture health signal'},
        {label:'Goal headroom',value:brain ? new Intl.NumberFormat('en-GB',{style:'currency',currency:brain.currency || 'GBP',maximumFractionDigits:0}).format(brain.monthly.goalHeadroom) : 'Connected',detail:'Surplus after current commitments'},
        {label:'Data confidence',value:brain ? `${brain.dataConfidence}%` : 'Connected',detail:'Completeness of Milo’s current view'},
      ]}
      action="Start a full review" onAction={() => run('full-review')} motion={busyType || chatBusy ? 'think' : 'wave'} tone="ai" compact />

    <div className="advisor-trust-strip-v1"><span><Icon name="check" size={15}/>Uses one connected MoneyMilo model</span><span><Icon name="timeline" size={15}/>Remembers recent MoneyMilo questions</span><span><Icon name="shield" size={15}/>Educational guidance, not regulated advice</span></div>

    <div className="advisor-layout">
      <aside className="advisor-side">
        <div className="advisor-profile"><MiloAvatar mode="ai" size={190} motion="idle" glow/><div><h2>AI Milo</h2><p>Your private money co-pilot, grounded in the information you choose to track.</p></div></div>
        <div className="analysis-menu">{BUTTONS.map(([type,label])=><button key={type} className={busyType===type?'active':''} disabled={!!busyType} onClick={()=>run(type)}><span>{busyType===type?'Milo is thinking…':label}</span><Icon name="chevron" size={15}/></button>)}</div>
      </aside>
      <main className="advisor-main">
        {err&&<div className="data-notice error-notice advisor-error-v11"><Icon name="alert" size={16}/><div><strong>Milo could not complete that request</strong><span>{err}</span></div><button onClick={()=>setErr('')} aria-label="Dismiss error"><Icon name="close" size={15}/></button></div>}
        {busyType&&<div className="advisor-answer advisor-analysis-loading-v11"><div className="advisor-thinking-line-v11"><MiloAvatar mode="ai" size={62} motion="think"/><div><strong>Milo is reviewing your connected finances</strong><span>Checking the relevant numbers, goals and data quality…</span></div></div><div className="skeleton" style={{height:92,marginBottom:12}}/><div className="grid g2"><div className="skeleton" style={{height:110}}/><div className="skeleton" style={{height:110}}/></div></div>}
        {analysis&&!busyType&&<section className="advisor-answer advisor-analysis-v11 fade-up">
          <div className="advisor-headline"><div className="advisor-health"><div><div className="t-label advisor-light-label">Milo’s short answer</div><h2>{analysis.headline}</h2><p>{analysis.summary}</p><ConfidencePill value={analysis.confidence}/></div>{analysis.health_score!=null&&<div className="advisor-score"><strong>{analysis.health_score}</strong><small>/100</small></div>}</div></div>
          {analysis.insights?.length>0&&<><div className="t-label advisor-section-label">What Milo noticed</div><div className="grid g2">{analysis.insights.map((ins,i)=><div key={i} className={`insight-card advisor-insight-v11 ${ins.sentiment==='good'?'good':ins.sentiment==='risk'?'risk':'warn'}`}><div className="advisor-insight-icon-v11"><Icon name={ins.sentiment==='good'?'check':ins.sentiment==='risk'?'alert':'spark'} size={16}/></div><div><div className="insight-title">{ins.title}</div><div className="insight-body">{ins.detail}</div></div></div>)}</div></>}
          {analysis.actions?.length>0&&<><div className="section-head advisor-action-head"><h2>Your next steps</h2></div><div className="mini-list">{analysis.actions.map((a,i)=><div className="mini-row advisor-action-row-v11" key={i}><div className="mini-step-number">{i+1}</div><div className="mini-row-main"><strong>{a.title}</strong><small>{a.detail}</small></div><span className={`badge ${a.priority==='high'?'badge-risk':a.priority==='medium'?'badge-warn':'badge-neutral'}`}>{a.priority}</span></div>)}</div></>}
          {analysis.data_gaps?.length>0&&<div className="advisor-gaps-v1"><strong>What would make this answer stronger</strong><span>{analysis.data_gaps.join(' · ')}</span></div>}
          <p className="t-small advisor-disclaimer">{analysis.disclaimer || 'Educational guidance based on the information currently recorded in MoneyMilo.'}</p>
        </section>}
        {!analysis&&!busyType&&<section className="milo-greeting milo-mint advisor-empty-v1"><div className="milo-greeting-copy"><div className="milo-eyebrow"><Icon name="spark" size={15}/>Start with a focused review</div><h2>What would you like Milo to look at?</h2><p>Choose a review on the left, or ask a specific question below. Milo will show the numbers behind the answer and identify missing information rather than guessing.</p></div><MiloAvatar mode="ai" size={210} motion="wave" glow/></section>}

        <section className="chat-panel chat-panel-v1 chat-panel-v11">
          <div className="chat-panel-head-v1 chat-panel-head-v11"><div><div className="t-label">Ask anything about your finances</div><p>Decisions, comparisons, explanations and “what if” questions.</p></div><div className="chat-header-actions-v11"><span className="ai-online-v11"><i/>Milo online</span>{messages.length>0&&<button className="chip" onClick={clearChat}>Clear chat</button>}</div></div>
          <div className="chat-scroll-v1 chat-scroll-v11">
            {messages.length===0&&<div className="advisor-prompts-v1 advisor-prompts-v11">{[
              ['goals','Am I saving enough for my goals?'],
              ['worth','What is driving my net-worth change?'],
              ['project','Can I afford a £600 monthly car?'],
              ['invest','Which part of my portfolio is concentrated?'],
              ['learn','Explain my finances like I am a beginner.'],
            ].map(([icon,q])=><button key={q} onClick={()=>usePrompt(q)}><Icon name={icon} size={15}/><span>{q}</span><Icon name="chevron" size={13}/></button>)}</div>}
            {messages.map((m,i)=><div key={i} className={`chat-msg ${m.role==='user'?'user':'ai'}`}>{m.role==='assistant'?<MiloAnswer answer={m.content} onFollowUp={usePrompt}/>:<><span className="chat-role-v11">You</span><p>{m.content}</p></>}</div>)}
            {chatBusy&&<div className="chat-msg ai chat-thinking-v1 chat-thinking-v11"><div className="milo-thinking-orb-v11"><MiloAvatar mode="ai" size={70} motion="think"/></div><div><strong>Milo is building your answer</strong><span>Reading the connected numbers</span><div className="milo-thinking-steps-v11"><i className="active">Budget</i><i className="active">Goals</i><i>Wealth</i><i>Answer</i></div></div></div>}
            <div ref={endRef}/>
          </div>
          <form className="chat-form chat-form-v11" onSubmit={send}><textarea ref={textRef} rows="1" value={input} onKeyDown={keyDown} onChange={e=>setInput(e.target.value)} placeholder="Ask Milo about a goal, purchase or money decision…"/><button aria-label="Send question" disabled={chatBusy||!input.trim()}><Icon name="arrow" size={20}/></button></form>
          <div className="chat-compose-note-v11"><span>Enter to send · Shift + Enter for a new line</span><span>MoneyMilo 2.0 Connected Intelligence</span></div>
          <p className="t-small chat-disclaimer-v1">Educational guidance based on your data — not regulated financial advice.</p>
        </section>
      </main>
    </div>
  </div>;
}
