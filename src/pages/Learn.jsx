import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { MiloAvatar, PageIntro } from '../components/Milo';
import Icon from '../components/Icon';

const todayStr = () => new Date().toISOString().slice(0, 10);
const yesterdayStr = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); };

export default function Learn() {
  const { user } = useAuth();
  const [streak, setStreak] = useState(null);
  const [modules, setModules] = useState([]);
  const [progress, setProgress] = useState([]);
  const [card, setCard] = useState(null);
  const [stage, setStage] = useState('loading');
  const [choice, setChoice] = useState(null);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');

  const load = async () => {
    setStage('loading'); setChoice(null); setResult(null); setErr('');
    try {
      const [st, mods, prog, pick] = await Promise.all([
        supabase.from('user_streaks').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('learn_modules').select('*').order('sort_order'),
        supabase.from('user_learning_progress').select('lesson_id, quiz_correct, completed_at').eq('user_id', user.id),
        api.learningCard(),
      ]);
      setStreak(st.data || { current_streak: 0, longest_streak: 0, total_xp: 0, last_completed_date: null });
      setModules(mods.data || []); setProgress(prog.data || []);
      if (!pick.lesson_id) { setCard({ reason: pick.reason }); setStage('finished'); return; }
      const { data: lesson } = await supabase.from('learn_lessons').select('*').eq('id', pick.lesson_id).single();
      setCard({ lesson, reason: pick.reason }); setStage('lesson');
    } catch (e) { setErr(e.message); setStage('error'); }
  };
  useEffect(() => { load(); }, [user.id]);

  const completedToday = streak?.last_completed_date === todayStr();
  const submitQuiz = async () => {
    const lesson = card.lesson;
    const correct = choice === lesson.correct_answer;
    const xp = 10 + (correct ? 5 : 0) + (completedToday ? 0 : 5);
    setResult({ correct, xp }); setStage('done');
    try {
      await supabase.from('user_learning_progress').upsert({ user_id: user.id, lesson_id: lesson.id, completed: true, quiz_correct: correct, xp_earned: xp, completed_at: new Date().toISOString() }, { onConflict: 'user_id,lesson_id' });
      const s = streak || {};
      let current = s.current_streak || 0;
      if (s.last_completed_date !== todayStr()) current = s.last_completed_date === yesterdayStr() ? current + 1 : 1;
      const updated = { user_id: user.id, current_streak: current, longest_streak: Math.max(current, s.longest_streak || 0), total_xp: (s.total_xp || 0) + xp, last_completed_date: todayStr() };
      await supabase.from('user_streaks').upsert(updated);
      setStreak(updated); setProgress([...progress, { lesson_id: lesson.id, quiz_correct: correct }]);
    } catch (e) { setErr(e.message); }
  };

  const lesson = card?.lesson;
  const options = lesson ? (typeof lesson.quiz_options === 'string' ? JSON.parse(lesson.quiz_options) : lesson.quiz_options) : [];
  const lessonProgress = modules.length ? Math.min(100, (progress.length / Math.max(1, modules.length * 2)) * 100) : 0;

  if (stage === 'loading') return (
    <div className="page">
      <PageIntro eyebrow="Money lessons that respond to your real life" title="Learn with Milo" subtitle="Small lessons. Better systems. Stronger financial habits." />
      <div className="learn-stats">{[1,2,3].map(x=><div className="skeleton" key={x} style={{height:96}}/>)}</div>
      <div className="skeleton" style={{height:360,borderRadius:28}}/>
    </div>
  );

  return (
    <div className="page">
      <PageIntro eyebrow="Money lessons that respond to your real life" title="Learn with Milo" subtitle="Inspired by enduring ideas from The Psychology of Money and Atomic Habits — rewritten into practical, personalised lessons." />

      <div className="learn-stats fade-up">
        <div className="learn-stat"><strong>{streak?.current_streak ?? 0} 🔥</strong><span>day streak</span></div>
        <div className="learn-stat"><strong>{streak?.total_xp ?? 0}</strong><span>XP earned</span></div>
        <div className="learn-stat"><strong>{progress.length}</strong><span>lessons done</span></div>
      </div>

      {stage === 'error' && <div className="card" style={{color:'var(--c-red)'}}>{err}<button className="btn btn-secondary btn-sm" onClick={load} style={{marginLeft:12}}>Retry</button></div>}
      {stage === 'finished' && <div className="lesson-hero"><div className="lesson-copy"><span className="badge" style={{background:'rgba(255,255,255,.2)',color:'white'}}>Path complete</span><h2>Every lesson is complete ✦</h2><p>{card.reason}</p></div><MiloAvatar mode="learn" size={210}/></div>}

      {(stage === 'lesson' || stage === 'quiz' || stage === 'done') && lesson && (
        <section className="lesson-hero fade-up">
          <div className="lesson-copy">
            <span className="badge" style={{background:'rgba(255,255,255,.2)',color:'white'}}>Today’s lesson · Module {lesson.module_id}</span>
            <h2>{lesson.title}</h2>
            <p>{card.reason}</p>
            <div className="lesson-progress"><span style={{width:`${Math.max(12,lessonProgress)}%`}}/></div>
          </div>
          <MiloAvatar mode="learn" size={230}/>
        </section>
      )}

      {(stage === 'lesson' || stage === 'quiz' || stage === 'done') && lesson && (
        <div className="card fade-up" style={{maxWidth:820,margin:'18px auto 0',padding:28}}>
          {stage === 'lesson' && <>
            <p style={{fontSize:'1rem',lineHeight:1.8}}>{lesson.content}</p>
            {lesson.example && <div className="soft-metric soft-gold" style={{minHeight:0,marginTop:18}}><div className="t-label">Milo’s real-life example</div><p style={{marginTop:8}}>{lesson.example}</p></div>}
            {lesson.reflection && <div className="soft-metric soft-purple" style={{minHeight:0,marginTop:12}}><div className="t-label">Pause and reflect</div><p style={{marginTop:8}}>{lesson.reflection}</p></div>}
            <button className="btn btn-primary" style={{marginTop:22}} onClick={()=>setStage('quiz')}>Take the quiz <Icon name="arrow" size={16}/></button>
          </>}
          {stage === 'quiz' && <>
            <div className="t-label">One quick check</div><h3 style={{fontSize:'1.25rem',marginTop:8}}>{lesson.quiz_question}</h3>
            <div style={{display:'grid',gap:10,marginTop:16}}>{options.map((opt,i)=><button key={i} className={`chip${choice===i?' active':''}`} style={{textAlign:'left',borderRadius:16,padding:'14px 17px'}} onClick={()=>setChoice(i)}><b>{String.fromCharCode(65+i)}.</b> {opt}</button>)}</div>
            <button className="btn btn-primary" style={{marginTop:20}} disabled={choice==null} onClick={submitQuiz}>Check answer</button>
          </>}
          {stage === 'done' && result && <>
            <div style={{display:'flex',alignItems:'center',gap:16}}><MiloAvatar mode="learn" size={110}/><div><div className="t-label">Lesson complete</div><h2 style={{fontSize:'1.7rem',color:result.correct?'var(--c-green)':'var(--c-amber)'}}>{result.correct?'That’s right ✦':'Not quite — but now it will stick.'}</h2><p className="t-small">+{result.xp} XP · {streak?.current_streak} day streak</p></div></div>
            {!result.correct && <p style={{marginTop:12}}>Correct answer: <strong>{options[lesson.correct_answer]}</strong></p>}
            {lesson.action_challenge && <div className="soft-metric soft-mint" style={{minHeight:0,marginTop:16}}><div className="t-label">Today’s action</div><p style={{marginTop:8}}>{lesson.action_challenge}</p></div>}
            <button className="btn btn-primary" style={{marginTop:20}} onClick={load}>Continue learning <Icon name="arrow" size={16}/></button>
          </>}
          {err && <p style={{color:'var(--c-red)',fontSize:'.8rem',marginTop:12}}>{err}</p>}
        </div>
      )}

      <div className="section-head"><h2>Your learning path</h2><span className="t-small">{progress.length} lessons completed</span></div>
      <div className="grid g2">
        {modules.map((m,i)=><div key={m.id} className="card module-card"><div className="module-icon"><Icon name={m.theme==='atomic_habits'?'goals':'learn'}/></div><div style={{flex:1}}><div className="t-label">Module {m.id}</div><h3 style={{marginTop:3}}>{m.title}</h3><p className="t-small" style={{marginTop:3}}>{m.description}</p></div><span className={`badge ${i<Math.ceil(progress.length/2)?'badge-good':'badge-neutral'}`}>{i<Math.ceil(progress.length/2)?'started':'up next'}</span></div>)}
      </div>
    </div>
  );
}
