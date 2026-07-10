import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { MiloAvatar, PageIntro } from '../components/Milo';
import Icon from '../components/Icon';

const todayStr = () => new Date().toISOString().slice(0, 10);
const yesterdayStr = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); };

function splitLesson(content = '') {
  const sentences = content.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((x) => x.trim()).filter(Boolean) || [content];
  const slides = [];
  for (let i = 0; i < sentences.length; i += 2) slides.push(sentences.slice(i, i + 2).join(' '));
  return slides.filter(Boolean);
}

export default function Learn() {
  const { user } = useAuth();
  const [streak, setStreak] = useState(null);
  const [modules, setModules] = useState([]);
  const [progress, setProgress] = useState([]);
  const [card, setCard] = useState(null);
  const [stage, setStage] = useState('loading');
  const [lessonStep, setLessonStep] = useState(0);
  const [choice, setChoice] = useState(null);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');

  const load = async () => {
    setStage('loading'); setLessonStep(0); setChoice(null); setResult(null); setErr('');
    try {
      const [st, mods, prog, pick] = await Promise.all([
        supabase.from('user_streaks').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('learn_modules').select('*').order('sort_order'),
        supabase.from('user_learning_progress').select('lesson_id,quiz_correct,completed_at,learn_lessons(module_id)').eq('user_id', user.id).eq('completed', true),
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
      const s = streak || {}; let current = s.current_streak || 0;
      if (s.last_completed_date !== todayStr()) current = s.last_completed_date === yesterdayStr() ? current + 1 : 1;
      const updated = { user_id: user.id, current_streak: current, longest_streak: Math.max(current, s.longest_streak || 0), total_xp: (s.total_xp || 0) + xp, last_completed_date: todayStr() };
      await supabase.from('user_streaks').upsert(updated);
      setStreak(updated); setProgress([...progress.filter((p) => p.lesson_id !== lesson.id), { lesson_id: lesson.id, quiz_correct: correct, learn_lessons: { module_id: lesson.module_id } }]);
    } catch (e) { setErr(e.message); }
  };

  const lesson = card?.lesson;
  const options = lesson ? (typeof lesson.quiz_options === 'string' ? JSON.parse(lesson.quiz_options) : lesson.quiz_options) : [];
  const conceptSlides = useMemo(() => lesson ? splitLesson(lesson.content) : [], [lesson]);
  const lessonCards = lesson ? [
    ...conceptSlides.map((text, i) => ({ type: 'concept', kicker: `Idea ${i + 1}`, title: i === 0 ? lesson.title : 'Build the idea', text })),
    ...(lesson.example ? [{ type: 'example', kicker: 'In real life', title: 'Milo makes it practical', text: lesson.example }] : []),
    ...(lesson.reflection ? [{ type: 'reflect', kicker: 'Pause and reflect', title: 'Make it personal', text: lesson.reflection }] : []),
  ] : [];
  const currentCard = lessonCards[lessonStep];
  const lessonProgress = lessonCards.length ? ((lessonStep + (stage === 'quiz' || stage === 'done' ? 1 : 0)) / (lessonCards.length + 1)) * 100 : 0;
  const completedModuleIds = new Set(progress.map((p) => p.learn_lessons?.module_id).filter(Boolean));
  const currentModuleIndex = Math.max(0, modules.findIndex((m) => !completedModuleIds.has(m.id)));
  const completedModules = completedModuleIds.size;

  if (stage === 'loading') return <div className="page page-wide"><PageIntro eyebrow="Money lessons that respond to your real life" title="Learn with Milo" subtitle="Small lessons. Better systems. Stronger financial habits."/><div className="learn-stats">{[1,2,3].map(x=><div className="skeleton" key={x} style={{height:96}}/>)}</div><div className="skeleton" style={{height:520,borderRadius:30}}/></div>;

  return (
    <div className="page page-wide learn-page">
      <PageIntro eyebrow="Your personal money academy" title="Learn with Professor Milo" subtitle="Short, practical lessons inspired by enduring ideas — personalised to your habits, goals and investments." />

      <div className="learn-stats fade-up">
        <div className="learn-stat streak-stat"><strong>{streak?.current_streak ?? 0} 🔥</strong><span>day streak</span><small>Best: {streak?.longest_streak || 0} days</small></div>
        <div className="learn-stat"><strong>{streak?.total_xp ?? 0}</strong><span>XP earned</span><small>Keep learning to level up</small></div>
        <div className="learn-stat"><strong>{progress.length}</strong><span>lessons done</span><small>{modules.length} modules in your path</small></div>
      </div>

      {stage === 'error' && <div className="data-notice error-notice">{err}<button className="btn btn-secondary btn-sm" onClick={load}>Retry</button></div>}
      {stage === 'finished' && <section className="professor-finish"><div><div className="milo-eyebrow">Path complete</div><h2>You’ve completed every available lesson.</h2><p>{card.reason}</p><button className="btn btn-primary" onClick={load}>Check for a new lesson</button></div><MiloAvatar mode="learn" size={280}/></section>}

      {(stage === 'lesson' || stage === 'quiz') && lesson && <section className="lesson-classroom fade-up">
        <aside className="professor-panel">
          <div className="professor-board"><span>PROFESSOR MILO</span><strong>{stage === 'quiz' ? 'Quick knowledge check' : currentCard?.kicker}</strong></div>
          <MiloAvatar mode="learn" size={310}/>
          <div className="milo-speech"><span className="milo-speech-name">Milo says</span>{stage === 'quiz' ? 'One question. No pressure. The goal is to make the idea stick.' : (card.reason || 'Today’s lesson was selected from your real financial patterns.')}</div>
        </aside>

        <div className="lesson-stage">
          <div className="lesson-stage-top"><div><span className="badge badge-info">Module {lesson.module_id}</span><h2>{lesson.title}</h2></div><span className="lesson-counter">{stage === 'quiz' ? lessonCards.length + 1 : lessonStep + 1} / {lessonCards.length + 1}</span></div>
          <div className="lesson-progress"><span style={{width:`${Math.max(8,lessonProgress)}%`}}/></div>

          {stage === 'lesson' && currentCard && <article className={`lesson-flashcard lesson-${currentCard.type}`} key={lessonStep}>
            <div className="flashcard-icon">{currentCard.type === 'concept' ? '💡' : currentCard.type === 'example' ? '🧩' : '🪞'}</div>
            <div className="t-label">{currentCard.kicker}</div><h3>{currentCard.title}</h3><p>{currentCard.text}</p>
            {currentCard.type === 'example' && <div className="personalised-tag">Connected to your real financial life</div>}
          </article>}

          {stage === 'quiz' && <article className="lesson-flashcard quiz-flashcard"><div className="flashcard-icon">🧠</div><div className="t-label">One quick check</div><h3>{lesson.quiz_question}</h3><div className="quiz-options">{options.map((opt,i)=><button key={i} className={choice===i?'selected':''} onClick={()=>setChoice(i)}><b>{String.fromCharCode(65+i)}</b><span>{opt}</span></button>)}</div></article>}

          <div className="lesson-controls">
            <button className="btn btn-secondary" disabled={stage === 'lesson' && lessonStep === 0} onClick={()=> stage === 'quiz' ? setStage('lesson') : setLessonStep(Math.max(0,lessonStep-1))}>Back</button>
            {stage === 'lesson' ? <button className="btn btn-primary" onClick={()=> lessonStep < lessonCards.length-1 ? setLessonStep(lessonStep+1) : setStage('quiz')}>{lessonStep < lessonCards.length-1 ? 'Continue' : 'Take the quiz'}<Icon name="arrow" size={16}/></button> : <button className="btn btn-primary" disabled={choice==null} onClick={submitQuiz}>Check answer</button>}
          </div>
        </div>
      </section>}

      {stage === 'done' && result && <section className={`lesson-result ${result.correct ? 'correct' : 'try-again'}`}>
        <MiloAvatar mode="learn" size={250}/><div><div className="milo-eyebrow">Lesson complete</div><h2>{result.correct ? 'Brilliant — that idea is yours now.' : 'Not quite, but this is how learning sticks.'}</h2><p>{result.correct ? `You earned ${result.xp} XP and protected your ${streak?.current_streak || 1}-day streak.` : <>The correct answer is <strong>{options[lesson.correct_answer]}</strong>. You still earned {result.xp} XP for completing the lesson.</>}</p>{lesson.action_challenge && <div className="action-challenge"><span>Today’s action</span><strong>{lesson.action_challenge}</strong></div>}<button className="btn btn-primary" onClick={load}>Continue learning<Icon name="arrow" size={16}/></button></div>
      </section>}

      <div className="section-head"><div><h2>Your learning path</h2><p className="t-small">Complete lessons to unlock the next money skill.</p></div><span className="badge badge-info">{progress.length} complete</span></div>
      <div className="learning-path">
        <div className="learning-path-line"/>
        {modules.map((m,i)=>{
          const state = completedModuleIds.has(m.id) ? 'complete' : i === currentModuleIndex ? 'current' : 'locked';
          return <div key={m.id} className={`path-node ${state}`}><div className="path-node-marker">{state === 'complete' ? '✓' : i+1}</div><div className="path-node-card"><div><div className="t-label">Module {i+1}</div><h3>{m.title}</h3><p>{m.description}</p></div><span className={`badge ${state === 'complete' ? 'badge-good' : state === 'current' ? 'badge-info' : 'badge-neutral'}`}>{state === 'complete' ? 'completed' : state === 'current' ? 'learning now' : 'locked'}</span></div></div>;
        })}
      </div>
    </div>
  );
}
